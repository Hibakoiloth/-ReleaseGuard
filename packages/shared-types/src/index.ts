export type ReleaseStatus =
  | "CREATED"
  | "BUILDING"
  | "TESTING"
  | "DEPLOYING"
  | "MONITORING"
  | "SUCCESS"
  | "FAILED"
  | "ROLLED_BACK";

export interface HealthResponse {
  status: "ok";
  timestamp: string;
}
