export type ReleaseStatus =
  | "CREATED"
  | "BUILDING"
  | "TESTING"
  | "DEPLOYING"
  | "MONITORING"
  | "SUCCESS"
  | "FAILED"
  | "ROLLED_BACK";

export type ProjectStatus = "ACTIVE" | "ARCHIVED";

export interface HealthResponse {
  status: "ok";
  timestamp: string;
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
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Release {
  id: string;
  projectId: string;
  version: string;
  status: ReleaseStatus;
  commitHash: string | null;
  createdAt: string;
  updatedAt: string;
}
