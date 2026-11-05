export type ReleaseStatus =
  | "CREATED"
  | "BUILDING"
  | "TESTING"
  | "DEPLOYING"
  | "MONITORING"
  | "SUCCESS"
  | "FAILED"
  | "ROLLED_BACK";

export interface Release {
  id: string;
  projectId: string;
  version: string;
  status: ReleaseStatus;
  commitHash: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReleaseInput {
  version: string;
  commitHash?: string;
}
