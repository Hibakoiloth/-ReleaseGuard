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
    "Content-Type": "application/json",
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

export const monitoringApi = {
  list: (projectId: string, releaseId: string, deploymentId: string, limit = 20) =>
    fetchWithAuth<MonitoringRecord[]>(
      `/projects/${projectId}/releases/${releaseId}/deployments/${deploymentId}/monitoring?limit=${limit}`
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
