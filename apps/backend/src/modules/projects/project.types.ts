export type ProjectStatus = "ACTIVE" | "ARCHIVED";

export interface ProjectConfiguration {
  repositoryUrl: string;
  buildCommand: string;
  testCommand: string;
  dockerfilePath: string;
  healthCheckPath: string;
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

export interface CreateProjectInput {
  name: string;
  description?: string;
  repositoryUrl: string;
  buildCommand: string;
  testCommand: string;
  dockerfilePath: string;
  healthCheckPath: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  repositoryUrl?: string;
  buildCommand?: string;
  testCommand?: string;
  dockerfilePath?: string;
  healthCheckPath?: string;
  status?: string;
}
