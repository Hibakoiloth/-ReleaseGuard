export type BuildStatus =
  | "PENDING"
  | "RUNNING"
  | "SUCCESS"
  | "FAILED"
  | "TIMED_OUT";

export interface BuildExecution {
  id: string;
  releaseId: string;
  status: BuildStatus;
  output: string | null;
  exitCode: number | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}
