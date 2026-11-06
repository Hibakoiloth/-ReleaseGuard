export type AnalysisStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export interface AiAnalysis {
  id: string;
  incidentId: string;
  status: AnalysisStatus;
  modelName: string | null;
  summary: string | null;
  probableCause: string | null;
  severity: string | null;
  confidence: number | null;
  evidence: string[] | null;
  impact: string | null;
  recommendedActions: string[] | null;
  recommendation: string | null;
  rollbackRecommended: boolean | null;
  rollbackReason: string | null;
  missingInformation: string[] | null;
  processingDurationMs: number | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface IncidentContext {
  incident: {
    id: string;
    deploymentId: string;
    type: string;
    severity: string;
    status: string;
    description: string;
    createdAt: string;
  };
  deployment: {
    id: string;
    releaseId: string;
    imageTag: string;
    containerId: string | null;
    hostPort: number | null;
    status: string;
    startedAt: string | null;
  } | null;
  release: {
    id: string;
    projectId: string;
    version: string;
    status: string;
    commitHash: string | null;
  } | null;
  project: {
    id: string;
    name: string;
    repositoryUrl: string;
    buildCommand: string;
    testCommand: string;
    dockerfilePath: string;
    healthCheckPath: string;
  } | null;
  monitoringRecords: Array<{
    status: string;
    responseTimeMs: number | null;
    errorMessage: string | null;
    recordedAt: string;
  }>;
  buildOutput: string | null;
  buildExitCode: number | null;
  testOutput: string | null;
  testExitCode: number | null;
  dockerLogs: string | null;
}

export interface ModelResponse {
  summary: string;
  probable_cause: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  confidence: number;
  evidence: string[];
  impact: string;
  recommended_actions: string[];
  recommendation: string;
  rollback_recommended: boolean;
  rollback_reason: string | null;
  missing_information: string[];
}
