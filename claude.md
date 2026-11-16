# ReleaseGuard — CLAUDE.md

AI-powered release management and automated recovery platform. Manages the full software release lifecycle: source checkout, build, test, Docker deployment, continuous health monitoring, AI incident analysis, and automated rollback with optional human-in-the-loop approval.

---

## Monorepo Layout

```
ReleaseGuard/
├── apps/
│   ├── backend/              Fastify v5 API (Node.js + TypeScript ESM)
│   └── frontend/             React 19 + Vite SPA (TypeScript)
├── packages/
│   └── shared-types/         Shared TypeScript types (ReleaseStatus, Project, Release, HealthResponse)
├── supabase/
│   └── migrations/           SQL migrations — run manually in Supabase SQL Editor in order
├── docker/                   Docker-related config
├── sample-app/               Example Express app for local integration testing
└── package.json              npm workspaces root (apps/*, packages/*)
```

Workspace scripts at root:
- `npm run dev:backend`  — starts backend on port 3000 (`tsx watch src/server.ts`)
- `npm run dev:frontend` — starts frontend on port 5173 (Vite)

---

## Backend

**Entry point:** [apps/backend/src/app.ts](apps/backend/src/app.ts)  
**Server start:** [apps/backend/src/server.ts](apps/backend/src/server.ts)  
**Framework:** Fastify v5  
**Runtime:** Node.js ≥ 20, TypeScript ESM, compiled via `tsc`  
**Test runner:** Vitest

### Infrastructure Layer

| Path | Purpose |
|---|---|
| `infrastructure/config/index.ts` | Typed env-var config (PORT, CORS_ORIGIN, Supabase keys, Ollama settings) |
| `infrastructure/supabase/supabase.client.ts` | Supabase admin client (service role key) |
| `infrastructure/supabase/supabase.types.ts` | Auto-generated database types |
| `infrastructure/docker/docker.client.ts` | Raw Dockerode wrapper — build image, start/stop container, get logs |
| `infrastructure/docker/docker.service.ts` | Higher-level: `buildAndDeploy`, `checkHealth` (10 attempts × 3 s) |
| `infrastructure/docker/docker.errors.ts` | `DockerHealthCheckError` and related |
| `infrastructure/process/process.executor.ts` | Spawns child processes with timeout, captures stdout/stderr/exitCode |
| `infrastructure/scheduler/monitoring.manager.ts` | In-memory `Map<deploymentId, MonitoringScheduler>` — starts/stops health polls; recovers on server restart by re-reading RUNNING deployments from DB |
| `infrastructure/scheduler/monitoring.scheduler.ts` | Polls a URL every N ms (default 5000) and calls `monitoringService.runCheck` |
| `infrastructure/logging/logger.ts` | Pino logger |

### Plugins

| Path | Purpose |
|---|---|
| `plugins/index.ts` | Registers `@fastify/cors`, `@fastify/helmet`, `@fastify/rate-limit` |
| `plugins/auth.ts` | `authenticate` hook: extracts Bearer token, looks up session in DB, attaches `req.user = { id, email }` |

### Module Structure

Every domain module follows: `<name>.routes.ts` → `<name>.service.ts` → `<name>.repository.ts` + `<name>.types.ts`.

### Auth Module (`modules/auth/`)

Custom auth — does **not** use Supabase Auth. Uses `app_users` and `sessions` tables.

- **auth.repository.ts** — `scrypt`-based password hashing; `randomBytes(32)` session tokens; all DB access via `supabaseAdmin`
- **auth.service.ts** — validates username (≥3 chars) and password (≥6 chars); delegates to repository
- **auth.routes.ts** — `POST /auth/signup`, `POST /auth/login`, `POST /auth/logout`

Frontend stores `{ token, userId, username }` as `rg_auth` in `localStorage`.

### Projects Module (`modules/projects/`)

CRUD for projects. A project holds the configuration for the CI/CD pipeline.

**Project fields:** `name`, `description`, `repositoryUrl`, `buildCommand`, `testCommand`, `dockerfilePath`, `healthCheckPath`, `status` (ACTIVE | ARCHIVED), `ownerId`

- **project.schema.ts** — Zod validation schemas
- **project.service.ts** — enforces ownership on every operation; `archive` soft-deletes by setting `status = ARCHIVED`
- **project.repository.ts** — all queries filtered by `owner_id`
- **project.routes.ts** — `GET/POST /projects`, `GET/PATCH/DELETE /projects/:id`, `POST /projects/:id/archive`

### Releases Module (`modules/releases/`)

Tracks the lifecycle of a specific versioned release.

**Release status state machine:**
```
CREATED → BUILDING → TESTING → DEPLOYING → MONITORING → SUCCESS
                                                       ↘ FAILED
                                                       ↘ ROLLED_BACK
```

- Status transitions are driven by downstream services (`buildService`, `testService`, `deploymentService`)
- `releaseRepository.adminUpdateStatus` bypasses RLS (uses service role) — needed by build/test/deployment services that run asynchronously

### Builds Module (`modules/builds/`)

Clones the project's Git repository into a temp directory and runs the build command.

**Steps:** git clone (120 s timeout) → detect and run install (`npm ci` / `yarn install` / `pnpm install`, 180 s) → run `buildCommand` (300 s)

- On success: keeps workspace path for deployment if `options.keepWorkspace = true`; advances release to `TESTING`
- On failure: sets release to `FAILED`
- Build output (stdout + stderr) is stored in `build_executions.output`

### Tests Module (`modules/tests/`)

Same clone-install-run pattern as builds. Runs `testCommand` with `CI=true`.

- On success: advances release to `DEPLOYING`
- On failure: sets release to `FAILED`

### Deployments Module (`modules/deployments/`)

Builds a Docker image from the cloned workspace, starts a container, health-checks it, then starts monitoring.

**Image tag format:** `releaseguard/<project-slug>:<version>`

**Deploy sequence:**
1. Create deployment record (`PENDING`)
2. Build Docker image — `dockerClient.buildImage` (`BUILDING_IMAGE`)
3. Start container — `dockerClient.startContainer` — random host port assigned (`STARTING`)
4. Update release to `MONITORING`
5. Health-check via HTTP (10 attempts, 3 s apart)
6. Mark deployment `RUNNING` and release `SUCCESS`
7. Start `monitoringManager` loop for this deployment

On failure at any step: deployment → `FAILED`, release → `FAILED`, incident opened via `incidentService.open(..., "DEPLOYMENT_FAILED")`.

**Deployment routes:**  
- `GET /projects/:projectId/releases/:releaseId/deployments`  
- `GET /projects/:projectId/releases/:releaseId/deployments/:id`  
- `GET /projects/:projectId/releases/:releaseId/deployments/:id/logs` — fetches Docker container logs

### Monitoring Module (`modules/monitoring/`)

- **health-check.service.ts** — makes HTTP GET to the deployment's health URL, measures response time
- **monitoring.service.ts** — saves `MonitoringRecord`; on unhealthy result calls `incidentDetector.evaluate`
- **monitoring.repository.ts** — `findRecent(deploymentId, limit)` returns records ordered by `recorded_at DESC`
- **monitoring.routes.ts** — `GET /projects/:p/releases/:r/deployments/:d/monitoring?limit=N`

### Incidents Module (`modules/incidents/`)

- **incident.detector.ts** — evaluates last 5 monitoring records; if ≥3 consecutive `UNHEALTHY` and no open incident exists, opens a new incident
- **incident.service.ts** — `open()` creates the incident, then in `setImmediate`:
  1. Triggers AI analysis (`aiAnalysisService.analyzeIncident`)
  2. Resolves project ID from deployment chain and calls `policyEngine.evaluate`
- **incident.repository.ts** — `findOpenByDeployment` used by detector to avoid duplicate incidents
- **incident.routes.ts** — `GET/GET-by-id` under deployment path; `GET recovery actions` sub-route

### AI Analysis Module (`modules/ai-analysis/`)

Calls a local Ollama instance to analyze incident context.

- **providers/ollama.provider.ts** — `checkAvailability` (GET `/api/tags`), `checkModel`, `chat` — all via plain `fetch`
- **utils/context-collector.ts** — collects incident, deployment, release, project, recent monitoring records, and build/test logs for prompt context
- **prompts/prompt-builder.ts** — builds system + user prompt from context
- **utils/response-parser.ts** — parses structured JSON from model response (summary, probableCause, severity, confidence, evidence, impact, recommendedActions, rollbackRecommended, etc.)
- **ai-analysis.service.ts** — idempotent: skips if `PENDING` or `PROCESSING`; checks Ollama availability and model before proceeding; `triggerReanalysis` re-runs on demand
- **ai-analysis.routes.ts** — `GET .../analysis`, `POST .../analysis/trigger`
- **`GET /api/ai/status`** — returns `{ available: boolean }` for Ollama availability check

**Config:** `OLLAMA_BASE_URL` (default `http://localhost:11434`), `OLLAMA_MODEL` (default `llama3.1:8b`), `OLLAMA_TIMEOUT_MS` (default 120 000 ms)

### Policies Module (`modules/policies/`)

Per-project rules that fire on events and trigger automated recovery.

**Policy events:** `DEPLOYMENT_FAILED` | `HEALTH_CHECK_FAILED` | `BUILD_FAILED` | `TEST_FAILED`  
**Policy actions:** `ROLLBACK` | `BLOCK` | `REQUIRE_APPROVAL`

- **policy.engine.ts** — `evaluate(event, ctx)`:
  1. Checks for existing active `recovery_action` for the incident (idempotent)
  2. Loads matching policies for the project by event
  3. If `requireApproval`: creates recovery action with status `PENDING_APPROVAL` and creates an approval record
  4. If immediate: creates `PENDING` recovery action; if action is `ROLLBACK` triggers `rollbackService.execute` in `setImmediate`
- **policy.repository.ts** — `findByProject(projectId)`
- **policy.routes.ts** — `GET/POST /projects/:id/policies`, `DELETE /projects/:id/policies/:policyId`
- **recovery-action.repository.ts** — unique partial index prevents duplicate active actions per incident

**Unique constraint:** `recovery_actions_one_active_per_incident` — only one active (PENDING | PENDING_APPROVAL | IN_PROGRESS) recovery action per incident.

### Approvals Module (`modules/approvals/`)

Human-in-the-loop gate for policy-triggered recovery actions.

- **approval.service.ts** — `listPending`, `listHistory`, `getDetail` (enriched with recovery action + AI analysis); `approve` (verifies ownership, updates decision, sets recovery action to PENDING, then fires rollback); `reject`
- **approval.repository.ts** — queries `approvals` table; `findPending` returns decision = `PENDING`; `decide(id, decision, userId)` records approver
- Ownership verified by traversing: `approval → recovery_action → incident → deployment → release → project → owner_id`
- **approval.routes.ts** — `GET /approvals` (pending), `GET /approvals/history`, `GET /approvals/:id`, `POST /approvals/:id/approve`, `POST /approvals/:id/reject`

### Rollback Module (`modules/rollback/`)

Restores service by restarting a previous healthy release's Docker image.

- **rollback.service.ts** — `execute(recoveryActionId)`:
  1. Resolves deployment context (project, health check path)
  2. Finds the most recent `RUNNING` deployment in a different, successful release for the same project
  3. Creates a new deployment record for the previous release
  4. Starts the existing Docker image (no re-build)
  5. Health-checks the new container
  6. Starts monitoring for the new deployment
  7. Sets the incident to `RESOLVED`, release to `ROLLED_BACK`, recovery action to `COMPLETED`
- `triggerManual(deploymentId, incidentId, projectId)` — creates a recovery action and calls `execute` immediately
- **rollback.repository.ts** — `getDeploymentWithRelease`, `findPreviousSuccessfulDeployment`
- **rollback.routes.ts** — `POST /projects/:p/releases/:r/deployments/:d/rollback`

**Rollback requires:** at least one prior `RUNNING`-status deployment in a different (successful) release within the same project.

### Dashboard Module (`modules/dashboard/`)

Single route `GET /dashboard` that aggregates stats across all user-owned resources:
- Summary counts: projects (total/active/archived), releases (total/success/failed/active), deployments (total/running/failed), incidents (open/resolved), approvals (pending), recovery actions (total/completed)
- Recent projects (5), recent releases (10 with project name), recent open incidents (5)

---

## Frontend

**Entry point:** [apps/frontend/src/main.tsx](apps/frontend/src/main.tsx)  
**Framework:** React 19 + React Router v6 + Vite 8  
**Auth:** `AuthProvider` wraps the entire app; `ProtectedRoute` redirects to `/login` if not authenticated

### Routing

| Path | Component |
|---|---|
| `/login` | `LoginPage` |
| `/signup` | `SignupPage` |
| `/` | `DashboardPage` (protected) |
| `/projects` | `ProjectsPage` |
| `/projects/new` | `CreateProjectPage` |
| `/projects/:id` | `ProjectDetailsPage` (lists releases + policies) |
| `/projects/:id/releases/new` | `CreateReleasePage` |
| `/projects/:id/releases/:releaseId` | `ReleaseDetailsPage` (builds, tests, deployments, pipeline) |
| `/projects/:id/releases/:releaseId/deployments/:deploymentId` | `MonitoringDashboard` (monitoring records + incidents) |
| `/projects/:id/releases/:releaseId/deployments/:deploymentId/incidents/:incidentId` | `IncidentDetailsPage` (AI analysis + rollback) |
| `/approvals` | `ApprovalsPage` (pending + history) |

### API Client

**File:** [apps/frontend/src/lib/api.ts](apps/frontend/src/lib/api.ts)

- `fetchWithAuth<T>` — attaches `Authorization: Bearer <token>` from `localStorage["rg_auth"]`; base URL `/api`
- All API modules: `projectsApi`, `releasesApi`, `buildsApi`, `testsApi`, `deploymentsApi`, `monitoringApi`, `incidentsApi`, `aiAnalysisApi`, `approvalsApi`, `policiesApi`, `recoveryActionsApi`, `rollbackApi`, `dashboardApi`

### Design System

`apps/frontend/src/design/tokens.ts` — CSS-in-JS token constants used across all pages (`glassCard`, `glassCardStrong`, `btnPrimary`, `btnGhost`, `btnDanger`, `pageTitle`, `sectionTitle`, `tableWrap`, etc.)

---

## Database Schema (Supabase / PostgreSQL)

Migrations in `supabase/migrations/` — run **in order** via Supabase SQL Editor.

### Tables

| Table | Key columns |
|---|---|
| `app_users` | `id`, `username` (UNIQUE), `password` (scrypt hash) |
| `sessions` | `id`, `user_id` → `app_users`, `token` (UNIQUE, indexed) |
| `profiles` | `id` → `auth.users` (legacy Supabase auth profile, auto-created trigger) |
| `projects` | `id`, `owner_id` → `profiles`, `name`, `description`, `configuration jsonb`, `status` |
| `releases` | `id`, `project_id`, `version`, `status`, `commit_hash` |
| `build_executions` | `id`, `release_id`, `status`, `output`, `exit_code`, `started_at`, `completed_at` |
| `test_executions` | `id`, `release_id`, `status`, `output`, `exit_code`, `started_at`, `completed_at` |
| `deployments` | `id`, `release_id`, `container_id`, `image_tag`, `status`, `host_port`, `started_at` |
| `monitoring_records` | `id`, `deployment_id`, `response_time_ms`, `status` (HEALTHY/UNHEALTHY), `recorded_at` |
| `incidents` | `id`, `deployment_id`, `severity`, `description`, `status` (OPEN/RESOLVED) |
| `ai_analyses` | `id`, `incident_id`, `status` (PENDING/PROCESSING/COMPLETED/FAILED), `model_name`, `summary`, `probable_cause`, `severity`, `confidence`, `evidence jsonb`, `impact`, `recommended_actions jsonb`, `rollback_recommended`, `rollback_reason`, `missing_information jsonb`, `processing_duration_ms`, `error_message` |
| `policies` | `id`, `project_id`, `name`, `conditions jsonb`, `action` |
| `recovery_actions` | `id`, `incident_id`, `deployment_id`, `action_type`, `status`, `reason`, `metadata jsonb` |
| `approvals` | `id`, `recovery_action_id`, `decision` (PENDING/APPROVED/REJECTED), `approved_by` → `profiles` |

### Row Level Security

All tables have RLS enabled. The ownership chain for RLS:

```
profiles  ← projects  ← releases  ← build_executions
                                   ← test_executions
                                   ← deployments  ← monitoring_records
                                                  ← incidents  ← ai_analyses
                                                               ← recovery_actions  ← approvals
```

Every table's policy resolves back to `auth.uid() = projects.owner_id`.

**Important:** The backend uses `supabaseAdmin` (service role key), which **bypasses RLS**. Authorization is enforced in the service layer (ownership checks, not database policies). RLS guards direct client-side queries only.

### Key Constraints

- `recovery_actions_one_active_per_incident` — partial unique index on `incident_id` where status IN (`PENDING`, `PENDING_APPROVAL`, `IN_PROGRESS`). Prevents duplicate active recovery actions per incident.

---

## Authentication Flow

1. User calls `POST /auth/signup` or `POST /auth/login`
2. Backend returns `{ token, userId, username }`
3. Frontend stores in `localStorage` as `rg_auth`
4. Every API request includes `Authorization: Bearer <token>`
5. `authenticate` plugin hook verifies token via `sessions` table, attaches `req.user`
6. `POST /auth/logout` deletes the session row

---

## Release Pipeline (End-to-End)

```
User: POST /releases → status: CREATED
User: POST /releases/:id/start → status: BUILDING

buildService.execute():
  git clone + npm ci + buildCommand
  → success: status: TESTING
  → failure: status: FAILED

testService.execute():           (triggered from release.routes after build success)
  git clone + npm ci + testCommand
  → success: status: DEPLOYING
  → failure: status: FAILED

deploymentService.deploy():      (triggered from release.routes after test success)
  Build Docker image
  Start container (random host port)
  Health check HTTP (10 × 3 s)
  → success: status: MONITORING → SUCCESS; monitoringManager.start()
  → failure: status: FAILED; incidentService.open("DEPLOYMENT_FAILED")

monitoringManager (every 5 s):
  healthCheckService.check(url)
  → save MonitoringRecord
  → 3 consecutive UNHEALTHY → incidentDetector → incidentService.open("HEALTH_CHECK_FAILED")

incidentService.open():
  create incident
  → [async] aiAnalysisService.analyzeIncident()
  → [async] policyEngine.evaluate()

policyEngine.evaluate():
  match policies for project + event
  → ROLLBACK (no approval): create recovery_action PENDING → rollbackService.execute()
  → ROLLBACK (with approval): create recovery_action PENDING_APPROVAL + approvalRepository.create()
  → after approval: recoveryAction → PENDING → rollbackService.execute()

rollbackService.execute():
  find previous successful deployment image
  start container from that image
  health check
  → deployment RUNNING; incident RESOLVED; release ROLLED_BACK; recovery action COMPLETED
```

---

## Shared Types Package

**File:** [packages/shared-types/src/index.ts](packages/shared-types/src/index.ts)

Exports: `ReleaseStatus` (union type), `ProjectStatus`, `HealthResponse`, `Project`, `Release`

Both backend and frontend import from `@releaseguard/shared-types`.

---

## Environment Variables

Create `apps/backend/.env`:

```env
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_PUBLISHABLE_KEY=eyJ...        # anon key
SUPABASE_SECRET_KEY=eyJ...             # service_role key — never expose to frontend

PORT=3000
CORS_ORIGIN=http://localhost:5173
NODE_ENV=development

OLLAMA_BASE_URL=http://localhost:11434  # optional
OLLAMA_MODEL=llama3.1:8b               # optional
OLLAMA_TIMEOUT_MS=120000               # optional
```

Frontend Vite proxy: all `/api/*` and `/auth/*` calls are proxied to `http://localhost:3000`.

---

## Running the Application

```bash
# Install dependencies (from root)
npm install

# Run backend (port 3000)
npm run dev:backend

# Run frontend (port 5173)
npm run dev:frontend
```

---

## Running Tests

Tests live in the backend only. Uses Vitest with module mocking (`vi.mock`).

```bash
# One-shot
cd apps/backend && npx vitest run

# Watch mode
cd apps/backend && npx vitest
```

**Test coverage:** 62 tests across 11 files — `project.service`, `release.service`, `build.service`, `deployment.service`, `policy.engine`, `approval.service`, `monitoring`, `incident.detector`, routes.

---

## Key Architectural Invariants

1. **Ownership is enforced in service layer, not DB.** All service methods take `ownerId` and verify via project lookup before operating on nested resources.
2. **`supabaseAdmin` bypasses RLS.** Use it only in the backend. Never expose the service role key.
3. **Async side-effects use `setImmediate`.** AI analysis, policy evaluation, and rollback execution are non-blocking fire-and-forget, so the HTTP response returns immediately.
4. **Monitoring recovery on server start.** `monitoringManager.recover()` is called in the Fastify `onReady` hook. It reads all `RUNNING` deployments from DB and re-attaches monitoring schedulers.
5. **One active recovery action per incident.** Enforced by the partial unique index on `recovery_actions`. The policy engine and rollback service check `findActiveByIncident` before creating.
6. **Rollback re-uses existing Docker image.** No re-build. `dockerClient.startContainer` with the previous `imageTag` directly.
7. **Token stored in localStorage.** `rg_auth` JSON object `{ token, userId, username }`. No cookies, no Supabase client on the frontend.

---

## Prerequisites

- Node.js ≥ 20, npm ≥ 10
- Docker (Desktop or Engine) running — accessible via Docker socket
- Supabase project with service role key
- Git in PATH (used by build/test services to clone repos)
- Ollama with `llama3.1:8b` (optional — AI analysis degrades gracefully without it)

---

## Common Troubleshooting

| Symptom | Fix |
|---|---|
| `SUPABASE_SECRET_KEY is not set` | Check `apps/backend/.env` |
| Docker build fails | Ensure Docker is running; verify `dockerfilePath` in project config |
| `Cannot connect to Ollama` | Run `ollama serve`; confirm `llama3.1:8b` is pulled |
| Health check timed out | App must respond at `healthCheckPath` within 30 s |
| `No previous successful deployment` | Rollback requires ≥1 prior successful deployment in the same project |
| Tests fail with mock errors | Run `npm install` from root; check Vitest is installed |
