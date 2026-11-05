export type TestStatus =
  | "PENDING"
  | "RUNNING"
  | "SUCCESS"
  | "FAILED"
  | "TIMED_OUT";

export interface TestExecution {
  id: string;
  releaseId: string;
  status: TestStatus;
  output: string | null;
  exitCode: number | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}
