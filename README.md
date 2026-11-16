# ReleaseGuard

AI-powered release management and automated recovery platform.

## Overview

ReleaseGuard manages the full software release lifecycle: source checkout, build, test, Docker deployment, continuous health monitoring, AI-powered incident analysis, and automated rollback with human-in-the-loop approval. It is a monorepo with a Fastify backend and React frontend.

---

## Architecture

```
ReleaseGuard/
├── apps/
│   ├── backend/        Fastify v5 API server (Node.js + TypeScript)
│   └── frontend/       React + Vite SPA (TypeScript)
├── packages/
│   └── shared-types/   Shared TypeScript types
├── supabase/
│   └── migrations/     SQL migration files (run manually in Supabase SQL Editor)
└── sample-app/         Example Express app used for integration testing
```

### Backend modules

| Module | Responsibility |
|---|---|
| `auth` | Username/password signup, login, session tokens |
| `projects` | Project CRUD, configuration (repo URL, build/test commands, Dockerfile, health check path) |
| `releases` | Release lifecycle: CREATED → BUILDING → TESTING → DEPLOYING → MONITORING → SUCCESS / FAILED |
| `builds` | Git clone + `npm run build` execution via child process |
| `tests` | Test execution after successful build |
| `deployments` | Docker image build + container start, status tracking |
| `monitoring` | Periodic health checks, monitoring records |
| `incidents` | 3-consecutive-failure incident detection, incident records |
| `ai-analysis` | Ollama/Llama 3.1:8b root-cause analysis, structured JSON extraction |
| `policies` | Recovery policy evaluation (ROLLBACK, BLOCK, REQUIRE_APPROVAL) |
| `approvals` | Human-in-the-loop approval queue |
| `rollback` | Safe redeployment of a previous healthy release image |
| `dashboard` | Cross-project summary aggregation |

---

## Prerequisites

- **Node.js** ≥ 20
- **npm** ≥ 10
- **Docker** (Desktop or Engine) — running and accessible via the Docker socket
- **Supabase** — project with service role key
- **Ollama** — running locally with `llama3.1:8b` pulled (optional; AI analysis degrades gracefully if unavailable)
- **Git** — available in PATH (used by build service to clone repositories)

---

## Environment Variables

Create `apps/backend/.env`:

```env
# Supabase
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_PUBLISHABLE_KEY=eyJ...          # anon key
SUPABASE_SECRET_KEY=eyJ...              # service_role key

# Server
PORT=3000
CORS_ORIGIN=http://localhost:5173
NODE_ENV=development

# Ollama (optional — defaults shown)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
OLLAMA_TIMEOUT_MS=120000
```

> **Never commit `.env` files or service role keys. The secret key must remain on the backend.**

---

## Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com).
2. In the SQL Editor, run the migrations **in order**:

   ```
   supabase/migrations/20261105000001_create_extensions.sql
   supabase/migrations/20261105000002_create_schema.sql
   supabase/migrations/20261106000001_custom_auth.sql
   supabase/migrations/20261106000002_expand_ai_analyses.sql
   supabase/migrations/20261106000003_recovery_actions_expand.sql
   ```

3. Copy the project URL and keys into `apps/backend/.env`.

---

## Ollama Setup

```bash
# Install Ollama (macOS)
brew install ollama

# Start Ollama
ollama serve

# Pull Llama 3.1:8b (one-time, ~4.7 GB)
ollama pull llama3.1:8b
```

AI analysis is optional. If Ollama is not running, incidents are still detected and displayed; the analysis panel will show a "trigger" button that will queue and fail gracefully.

---

## Docker Setup

Ensure Docker is running. The backend uses the Docker socket directly — no additional configuration is needed for local development.

```bash
docker ps   # should work without sudo
```

ReleaseGuard creates containers on a `releaseguard-net` network. It is created automatically on first use.

---

## Installation

```bash
# Install all workspace dependencies
npm install
```

---

## Starting the Application

**Backend** (port 3000):
```bash
npm run dev:backend
```

**Frontend** (port 5173):
```bash
npm run dev:frontend
```

Open [http://localhost:5173](http://localhost:5173), sign up for an account, then create a project.

---

## Running Tests

All tests run from the backend workspace:

```bash
# Run all tests once
cd apps/backend && npx vitest run

# Watch mode
cd apps/backend && npx vitest
```

Current test coverage: 62 tests across 11 test files covering project service, release service, build service, deployment service, policy engine, approval service, monitoring, incident detection, and routes.

---

## Release Lifecycle

1. **Create a project** — provide Git repo URL, build/test commands, Dockerfile path, health check path.
2. **Create a release** — provide a version string and optional commit hash.
3. **Start the release** — triggers the pipeline:
   - Git clone + build
   - Tests (build must succeed)
   - Docker image build + container start
   - Health check confirmation
4. **Monitor** — health checks run every 5 seconds. Three consecutive failures open an incident.
5. **AI analysis** — Llama analyses the incident context automatically.
6. **Policy evaluation** — configured recovery policies decide: ROLLBACK, BLOCK, or REQUIRE_APPROVAL.
7. **Approval** — if required, the Approvals page lets authorized users approve or reject.
8. **Rollback** — the previous healthy release's Docker image is restarted on a new port, health-checked, and the incident is resolved.

---

## Common Troubleshooting

| Symptom | Fix |
|---|---|
| `SUPABASE_SECRET_KEY is not set` | Check `apps/backend/.env` |
| Docker build fails | Ensure Docker is running and the Dockerfile path is correct |
| `Cannot connect to Ollama` | Run `ollama serve` and confirm `llama3.1:8b` is pulled |
| `Health check timed out` | Ensure the app exposes the correct health check path and responds within 30 s |
| `No previous successful deployment` | Rollback requires at least one prior SUCCESS deployment in the same project |
| Container port conflicts | ReleaseGuard auto-assigns random host ports; conflicts are rare but retry if one occurs |
| Tests fail with mock errors | Run `npm install` from the root to ensure Vitest is installed |
