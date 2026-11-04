export type ProjectStatus = "ACTIVE" | "ARCHIVED";

export interface Project {
  id: string;
  name: string;
  repositoryUrl: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectInput {
  name: string;
  repositoryUrl: string;
}

export interface UpdateProjectInput {
  name?: string;
  repositoryUrl?: string;
}
