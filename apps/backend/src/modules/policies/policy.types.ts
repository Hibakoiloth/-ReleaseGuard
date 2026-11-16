export type PolicyEvent =
  | "DEPLOYMENT_FAILED"
  | "HEALTH_CHECK_FAILED"
  | "BUILD_FAILED"
  | "TEST_FAILED";

export type PolicyAction = "ROLLBACK" | "BLOCK" | "REQUIRE_APPROVAL";

export interface PolicyConditions {
  event: PolicyEvent;
  requireApproval?: boolean;
}

export interface Policy {
  id: string;
  projectId: string;
  name: string;
  action: PolicyAction;
  conditions: PolicyConditions;
  createdAt: string;
  updatedAt: string;
}

export type RecoveryActionStatus =
  | "PENDING"
  | "PENDING_APPROVAL"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "FAILED"
  | "REJECTED";

export interface RecoveryAction {
  id: string;
  incidentId: string;
  deploymentId: string | null;
  actionType: string;
  status: RecoveryActionStatus;
  reason: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface EvaluationContext {
  projectId: string;
  incidentId: string;
  deploymentId: string;
}

export interface Approval {
  id: string;
  recoveryActionId: string;
  decision: string;
  approvedBy: string | null;
  createdAt: string;
}
