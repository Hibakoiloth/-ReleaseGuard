import { policyRepository } from "./policy.repository";
import { recoveryActionRepository } from "./recovery-action.repository";
import { approvalRepository } from "../approvals/approval.repository";
import { logger } from "../../infrastructure/logging/logger";
import type { EvaluationContext, PolicyEvent } from "./policy.types";

export const policyEngine = {
  async evaluate(event: PolicyEvent, ctx: EvaluationContext): Promise<void> {
    try {
      const existing = await recoveryActionRepository.findActiveByIncident(ctx.incidentId);
      if (existing) return;

      const policies = await policyRepository.findByProject(ctx.projectId);
      const matching = policies.filter((p) => p.conditions.event === event);
      if (matching.length === 0) return;

      const policy = matching[0];
      const requireApproval = policy.conditions.requireApproval ?? false;

      const status = requireApproval ? "PENDING_APPROVAL" : "PENDING";

      const recoveryAction = await recoveryActionRepository.create(
        ctx.incidentId,
        ctx.deploymentId,
        policy.action,
        status,
        `Triggered by policy "${policy.name}" on event ${event}`
      );

      if (requireApproval) {
        await approvalRepository.create(recoveryAction.id);
        logger.info(
          { recoveryActionId: recoveryAction.id },
          "Recovery action created — awaiting approval"
        );
        return;
      }

      if (policy.action === "ROLLBACK") {
        const { rollbackService } = await import("../rollback/rollback.service");
        setImmediate(() => {
          rollbackService.execute(recoveryAction.id).catch((err: unknown) => {
            logger.error(err, "Rollback failed for recovery action %s", recoveryAction.id);
          });
        });
      }
    } catch (err) {
      logger.error(err, "Policy evaluation failed for event %s", event);
    }
  },
};
