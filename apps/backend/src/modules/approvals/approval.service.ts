import { approvalRepository } from "./approval.repository";
import { recoveryActionRepository } from "../policies/recovery-action.repository";
import { aiAnalysisRepository } from "../ai-analysis/ai-analysis.repository";
import { rollbackService } from "../rollback/rollback.service";
import { supabaseAdmin } from "../../infrastructure/supabase/supabase.client";
import { logger } from "../../infrastructure/logging/logger";
import type { Approval } from "../policies/policy.types";
import type { RecoveryAction } from "../policies/policy.types";
import type { AiAnalysis } from "../ai-analysis/ai-analysis.types";

export interface ApprovalDetail {
  approval: Approval;
  recoveryAction: RecoveryAction;
  aiAnalysis: AiAnalysis | null;
}

async function verifyApprovalOwnership(approvalId: string, userId: string): Promise<boolean> {
  // Chain: approval → recovery_action → incident → deployment → release → project → owner_id
  const { data } = await supabaseAdmin
    .from("approvals")
    .select(`
      id,
      recovery_actions!inner(
        incident_id,
        incidents!inner(
          deployment_id,
          deployments!inner(
            release_id,
            releases!inner(
              project_id,
              projects!inner(owner_id)
            )
          )
        )
      )
    `)
    .eq("id", approvalId)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .maybeSingle() as any;

  if (!data) return false;
  try {
    const ra = data.recovery_actions;
    const inc = ra?.incidents;
    const dep = inc?.deployments;
    const rel = dep?.releases;
    const proj = rel?.projects;
    return proj?.owner_id === userId;
  } catch {
    return false;
  }
}

async function getUserProjectIds(userId: string): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from("projects")
    .select("id")
    .eq("owner_id", userId);
  return (data ?? []).map((p: { id: string }) => p.id);
}

export const approvalService = {
  async listPending(userId: string): Promise<ApprovalDetail[]> {
    const projectIds = await getUserProjectIds(userId);
    if (projectIds.length === 0) return [];
    const approvals = await approvalRepository.findPending();
    const enriched = await Promise.all(
      approvals.map((a) => approvalService.enrichApproval(a).catch(() => null))
    );
    return enriched.filter((d): d is ApprovalDetail => d !== null);
  },

  async listHistory(userId: string): Promise<ApprovalDetail[]> {
    const projectIds = await getUserProjectIds(userId);
    if (projectIds.length === 0) return [];
    const approvals = await approvalRepository.findHistory();
    const enriched = await Promise.all(
      approvals.map((a) => approvalService.enrichApproval(a).catch(() => null))
    );
    return enriched.filter((d): d is ApprovalDetail => d !== null);
  },

  async getDetail(id: string): Promise<ApprovalDetail | null> {
    const approval = await approvalRepository.findById(id);
    if (!approval) return null;
    return approvalService.enrichApproval(approval);
  },

  async enrichApproval(approval: Approval): Promise<ApprovalDetail> {
    const recoveryAction = await recoveryActionRepository.findById(approval.recoveryActionId);
    if (!recoveryAction) throw new Error(`Recovery action not found: ${approval.recoveryActionId}`);

    const aiAnalysis = await aiAnalysisRepository
      .findByIncident(recoveryAction.incidentId)
      .catch(() => null);

    return { approval, recoveryAction, aiAnalysis };
  },

  async approve(id: string, userId: string): Promise<void> {
    const owns = await verifyApprovalOwnership(id, userId);
    if (!owns) throw new Error("Not authorized to approve this action");

    const approval = await approvalRepository.findById(id);
    if (!approval) throw new Error("Approval not found");
    if (approval.decision !== "PENDING") throw new Error("Approval already decided");

    await approvalRepository.decide(id, "APPROVED", userId);
    await recoveryActionRepository.updateStatus(approval.recoveryActionId, "PENDING");

    const recoveryAction = await recoveryActionRepository.findById(approval.recoveryActionId);
    if (!recoveryAction) return;

    if (recoveryAction.actionType === "ROLLBACK") {
      setImmediate(() => {
        rollbackService.execute(approval.recoveryActionId).catch((err: unknown) => {
          logger.error(err, "Rollback after approval failed for %s", approval.recoveryActionId);
        });
      });
    }
  },

  async reject(id: string, userId: string): Promise<void> {
    const owns = await verifyApprovalOwnership(id, userId);
    if (!owns) throw new Error("Not authorized to reject this action");

    const approval = await approvalRepository.findById(id);
    if (!approval) throw new Error("Approval not found");
    if (approval.decision !== "PENDING") throw new Error("Approval already decided");

    await approvalRepository.decide(id, "REJECTED", userId);
    await recoveryActionRepository.updateStatus(approval.recoveryActionId, "REJECTED");
  },
};
