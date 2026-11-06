export type IncidentType =
  | "APPLICATION_UNAVAILABLE"
  | "HIGH_ERROR_RATE"
  | "HEALTH_CHECK_FAILURE";

export type IncidentSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type IncidentStatus = "OPEN" | "ACKNOWLEDGED" | "RESOLVED";

export interface Incident {
  id: string;
  deploymentId: string;
  type: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;
  description: string;
  createdAt: string;
  updatedAt: string;
}
