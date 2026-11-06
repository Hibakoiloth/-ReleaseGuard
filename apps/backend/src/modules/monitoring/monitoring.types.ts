export type HealthStatus = "HEALTHY" | "UNHEALTHY";

export interface MonitoringRecord {
  id: string;
  deploymentId: string;
  status: HealthStatus;
  responseTimeMs: number | null;
  errorMessage: string | null;
  recordedAt: string;
}

export interface HealthCheckResult {
  statusCode: number | null;
  responseTimeMs: number;
  healthy: boolean;
  errorMessage: string | null;
}
