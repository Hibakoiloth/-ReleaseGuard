const BASE = "/api";

function getToken(): string | null {
  try {
    const raw = localStorage.getItem("rg_auth");
    return raw ? (JSON.parse(raw) as { token: string }).token : null;
  } catch {
    return null;
  }
}

async function fetchWithAuth<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const token = getToken();

  const headers: HeadersInit = {
    ...(init?.body !== undefined ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...init?.headers,
  };

  const res = await fetch(`${BASE}${path}`, { ...init, headers });

  if (res.status === 204) return undefined as unknown as T;

  const body = await res.json().catch(() => ({ message: "Request failed" }));

  if (!res.ok) {
    throw new Error(
      (body as { message?: string }).message ?? "Request failed"
    );
  }

  return body as T;
}

export interface Project {
  id: string;
  ownerId: string;
  name: string;
  description: string | null;
  repositoryUrl: string;
  buildCommand: string;
  testCommand: string;
  dockerfilePath: string;
  healthCheckPath: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface Release {
  id: string;
  projectId: string;
  version: string;
  status: string;
  commitHash: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BuildExecution {
  id: string;
  releaseId: string;
  status: string;
  output: string | null;
  exitCode: number | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface TestExecution {
  id: string;
  releaseId: string;
  status: string;
  output: string | null;
  exitCode: number | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface Deployment {
  id: string;
  releaseId: string;
  imageTag: string;
  containerId: string | null;
  hostPort: number | null;
  status: string;
  startedAt: string | null;
  stoppedAt: string | null;
  createdAt: string;
}

export type CreateProjectData = Omit<
  Project,
  "id" | "ownerId" | "status" | "createdAt" | "updatedAt"
>;

export const projectsApi = {
  list: () => fetchWithAuth<Project[]>("/projects"),
  get: (id: string) => fetchWithAuth<Project>(`/projects/${id}`),
  create: (data: CreateProjectData) =>
    fetchWithAuth<Project>("/projects", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<CreateProjectData>) =>
    fetchWithAuth<Project>(`/projects/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    fetchWithAuth<void>(`/projects/${id}`, { method: "DELETE" }),
  archive: (id: string) =>
    fetchWithAuth<Project>(`/projects/${id}/archive`, { method: "POST" }),
};

export const releasesApi = {
  list: (projectId: string) =>
    fetchWithAuth<Release[]>(`/projects/${projectId}/releases`),
  get: (projectId: string, id: string) =>
    fetchWithAuth<Release>(`/projects/${projectId}/releases/${id}`),
  create: (projectId: string, data: { version: string; commitHash?: string }) =>
    fetchWithAuth<Release>(`/projects/${projectId}/releases`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  start: (projectId: string, id: string) =>
    fetchWithAuth<Release>(`/projects/${projectId}/releases/${id}/start`, {
      method: "POST",
    }),
};

export const buildsApi = {
  list: (projectId: string, releaseId: string) =>
    fetchWithAuth<BuildExecution[]>(
      `/projects/${projectId}/releases/${releaseId}/builds`
    ),
};

export const testsApi = {
  list: (projectId: string, releaseId: string) =>
    fetchWithAuth<TestExecution[]>(
      `/projects/${projectId}/releases/${releaseId}/tests`
    ),
};

export const deploymentsApi = {
  list: (projectId: string, releaseId: string) =>
    fetchWithAuth<Deployment[]>(
      `/projects/${projectId}/releases/${releaseId}/deployments`
    ),
};

export interface MonitoringRecord {
  id: string;
  deploymentId: string;
  status: "HEALTHY" | "UNHEALTHY";
  responseTimeMs: number | null;
  errorMessage: string | null;
  recordedAt: string;
}

export interface Incident {
  id: string;
  deploymentId: string;
  type: string;
  severity: string;
  status: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface MonitoringStatus {
  active: boolean;
  paused: boolean;
  intervalMs: number;
}

export const monitoringApi = {
  list: (projectId: string, releaseId: string, deploymentId: string, limit = 20) =>
    fetchWithAuth<MonitoringRecord[]>(
      `/projects/${projectId}/releases/${releaseId}/deployments/${deploymentId}/monitoring?limit=${limit}`
    ),
  getStatus: (projectId: string, releaseId: string, deploymentId: string) =>
    fetchWithAuth<MonitoringStatus>(
      `/projects/${projectId}/releases/${releaseId}/deployments/${deploymentId}/monitoring/status`
    ),
  pause: (projectId: string, releaseId: string, deploymentId: string) =>
    fetchWithAuth<MonitoringStatus>(
      `/projects/${projectId}/releases/${releaseId}/deployments/${deploymentId}/monitoring/pause`,
      { method: "POST" }
    ),
  resume: (projectId: string, releaseId: string, deploymentId: string) =>
    fetchWithAuth<MonitoringStatus>(
      `/projects/${projectId}/releases/${releaseId}/deployments/${deploymentId}/monitoring/resume`,
      { method: "POST" }
    ),
  setInterval: (projectId: string, releaseId: string, deploymentId: string, intervalMs: number) =>
    fetchWithAuth<MonitoringStatus>(
      `/projects/${projectId}/releases/${releaseId}/deployments/${deploymentId}/monitoring/settings`,
      { method: "PATCH", body: JSON.stringify({ intervalMs }) }
    ),
};

export const incidentsApi = {
  list: (projectId: string, releaseId: string, deploymentId: string) =>
    fetchWithAuth<Incident[]>(
      `/projects/${projectId}/releases/${releaseId}/deployments/${deploymentId}/incidents`
    ),
  get: (projectId: string, releaseId: string, deploymentId: string, incidentId: string) =>
    fetchWithAuth<Incident>(
      `/projects/${projectId}/releases/${releaseId}/deployments/${deploymentId}/incidents/${incidentId}`
    ),
};

export interface AiAnalysis {
  id: string;
  incidentId: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  modelName: string | null;
  summary: string | null;
  probableCause: string | null;
  severity: string | null;
  confidence: number | null;
  evidence: string[] | null;
  impact: string | null;
  recommendedActions: string[] | null;
  recommendation: string | null;
  rollbackRecommended: boolean | null;
  rollbackReason: string | null;
  missingInformation: string[] | null;
  processingDurationMs: number | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export const aiAnalysisApi = {
  get: (projectId: string, releaseId: string, deploymentId: string, incidentId: string) =>
    fetchWithAuth<AiAnalysis | null>(
      `/projects/${projectId}/releases/${releaseId}/deployments/${deploymentId}/incidents/${incidentId}/analysis`
    ),
  trigger: (projectId: string, releaseId: string, deploymentId: string, incidentId: string) =>
    fetchWithAuth<{ queued: boolean }>(
      `/projects/${projectId}/releases/${releaseId}/deployments/${deploymentId}/incidents/${incidentId}/analysis/trigger`,
      { method: "POST" }
    ),
};

export interface RecoveryAction {
  id: string;
  incidentId: string;
  deploymentId: string | null;
  actionType: string;
  status: string;
  reason: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface Approval {
  id: string;
  recoveryActionId: string;
  decision: string;
  approvedBy: string | null;
  createdAt: string;
}

export interface ApprovalDetail {
  approval: Approval;
  recoveryAction: RecoveryAction;
  aiAnalysis: AiAnalysis | null;
}

export interface Policy {
  id: string;
  projectId: string;
  name: string;
  action: string;
  conditions: { event: string; requireApproval?: boolean };
  createdAt: string;
  updatedAt: string;
}

export const approvalsApi = {
  listPending: () => fetchWithAuth<ApprovalDetail[]>("/approvals"),
  listHistory: () => fetchWithAuth<ApprovalDetail[]>("/approvals/history"),
  get: (id: string) => fetchWithAuth<ApprovalDetail>(`/approvals/${id}`),
  approve: (id: string) =>
    fetchWithAuth<{ approved: boolean }>(`/approvals/${id}/approve`, { method: "POST" }),
  reject: (id: string) =>
    fetchWithAuth<{ rejected: boolean }>(`/approvals/${id}/reject`, { method: "POST" }),
};

export const policiesApi = {
  list: (projectId: string) =>
    fetchWithAuth<Policy[]>(`/projects/${projectId}/policies`),
  create: (projectId: string, data: { name: string; action: string; conditions: object }) =>
    fetchWithAuth<Policy>(`/projects/${projectId}/policies`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  delete: (projectId: string, policyId: string) =>
    fetchWithAuth<void>(`/projects/${projectId}/policies/${policyId}`, { method: "DELETE" }),
};

export const recoveryActionsApi = {
  listByIncident: (
    projectId: string,
    releaseId: string,
    deploymentId: string,
    incidentId: string
  ) =>
    fetchWithAuth<RecoveryAction[]>(
      `/projects/${projectId}/releases/${releaseId}/deployments/${deploymentId}/incidents/${incidentId}/recovery`
    ),
};

export const rollbackApi = {
  trigger: (
    projectId: string,
    releaseId: string,
    deploymentId: string,
    incidentId: string
  ) =>
    fetchWithAuth<{ recoveryActionId: string; queued: boolean }>(
      `/projects/${projectId}/releases/${releaseId}/deployments/${deploymentId}/rollback`,
      { method: "POST", body: JSON.stringify({ incidentId }) }
    ),
};

export interface DashboardSummary {
  projects: { total: number; active: number; archived: number };
  releases: { total: number; success: number; failed: number; active: number };
  deployments: { total: number; running: number; failed: number };
  incidents: { open: number; resolved: number };
  approvals: { pending: number };
  recovery: { total: number; completed: number };
}

export interface DashboardData {
  summary: DashboardSummary;
  recentProjects: Array<{
    id: string; name: string; status: string;
    created_at: string; latestReleaseStatus: string | null;
  }>;
  recentReleases: Array<{
    id: string; project_id: string; version: string; status: string;
    created_at: string; projectName: string;
  }>;
  recentIncidents: Array<{
    id: string; deployment_id: string; type: string;
    severity: string; status: string; description: string; created_at: string;
  }>;
}

export const dashboardApi = {
  get: () => fetchWithAuth<DashboardData>("/dashboard"),
};
