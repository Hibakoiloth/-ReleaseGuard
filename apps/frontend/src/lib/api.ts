import { supabase } from "./supabase";

const BASE = "/api";

async function fetchWithAuth<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
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
