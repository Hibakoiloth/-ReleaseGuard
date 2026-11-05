export type DeploymentStatus =
  | "PENDING"
  | "BUILDING_IMAGE"
  | "STARTING"
  | "RUNNING"
  | "STOPPED"
  | "FAILED";

export interface Deployment {
  id: string;
  releaseId: string;
  imageTag: string;
  containerId: string | null;
  hostPort: number | null;
  status: DeploymentStatus;
  startedAt: string | null;
  stoppedAt: string | null;
  createdAt: string;
}
