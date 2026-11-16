import { rollbackRepository } from "./rollback.repository";
import { recoveryActionRepository } from "../policies/recovery-action.repository";
import { deploymentRepository } from "../deployments/deployment.repository";
import { monitoringManager } from "../../infrastructure/scheduler/monitoring.manager";
import { dockerClient } from "../../infrastructure/docker/docker.client";
import { dockerService } from "../../infrastructure/docker/docker.service";
import { supabaseAdmin } from "../../infrastructure/supabase/supabase.client";
import { logger } from "../../infrastructure/logging/logger";
import type { RollbackResult } from "./rollback.types";

export const rollbackService = {
  async execute(recoveryActionId: string): Promise<RollbackResult> {
    const recoveryAction = await recoveryActionRepository.findById(recoveryActionId);
    if (!recoveryAction) throw new Error(`Recovery action ${recoveryActionId} not found`);

    if (recoveryAction.status === "COMPLETED" || recoveryAction.status === "IN_PROGRESS") {
      throw new Error(`Recovery action already ${recoveryAction.status}`);
    }

    await recoveryActionRepository.updateStatus(recoveryActionId, "IN_PROGRESS");

    try {
      const deploymentId = recoveryAction.deploymentId;
      if (!deploymentId) throw new Error("Recovery action has no deployment_id");

      const ctx = await rollbackRepository.getDeploymentWithRelease(deploymentId);
      if (!ctx) throw new Error(`Could not resolve deployment context for ${deploymentId}`);

      const prev = await rollbackRepository.findPreviousSuccessfulDeployment(
        ctx.projectId,
        ctx.release.id
      );
      if (!prev) {
        throw new Error("No previous successful deployment found — cannot roll back");
      }

      logger.info(
        { previousRelease: prev.release.version, imageTag: prev.deployment.imageTag },
        "Rolling back to previous deployment"
      );

      const newDeployment = await deploymentRepository.create(
        prev.release.id,
        prev.deployment.imageTag
      );

      await deploymentRepository.update(newDeployment.id, { status: "STARTING" });

      const containerInfo = await dockerClient.startContainer({
        imageTag: prev.deployment.imageTag,
        releaseId: prev.release.id,
      });

      await deploymentRepository.update(newDeployment.id, {
        status: "STARTING",
        containerId: containerInfo.containerId,
        hostPort: containerInfo.hostPort,
        startedAt: containerInfo.startedAt ?? new Date().toISOString(),
      });

      await dockerService.checkHealth(containerInfo.hostPort, ctx.healthCheckPath);

      await deploymentRepository.update(newDeployment.id, { status: "RUNNING" });

      const monitorUrl = `http://127.0.0.1:${containerInfo.hostPort}${ctx.healthCheckPath}`;
      monitoringManager.start(newDeployment.id, monitorUrl);

      await supabaseAdmin
        .from("releases")
        .update({ status: "ROLLED_BACK", updated_at: new Date().toISOString() })
        .eq("id", ctx.release.id);

      await supabaseAdmin
        .from("incidents")
        .update({ status: "RESOLVED", updated_at: new Date().toISOString() })
        .eq("id", recoveryAction.incidentId);

      await recoveryActionRepository.updateStatus(
        recoveryActionId,
        "COMPLETED",
        `Rolled back to ${prev.release.version}`
      );

      return {
        newDeploymentId: newDeployment.id,
        previousReleaseId: prev.release.id,
        previousVersion: prev.release.version,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(err, "Rollback execution failed for %s", recoveryActionId);
      await recoveryActionRepository.updateStatus(recoveryActionId, "FAILED", msg).catch(() => {});
      throw err;
    }
  },

  async triggerManual(deploymentId: string, incidentId: string, projectId: string): Promise<string> {
    const existing = await recoveryActionRepository.findActiveByIncident(incidentId);
    if (existing) return existing.id;

    const action = await recoveryActionRepository.create(
      incidentId,
      deploymentId,
      "ROLLBACK",
      "PENDING",
      "Manual rollback triggered"
    );

    setImmediate(() => {
      rollbackService.execute(action.id).catch((err: unknown) => {
        logger.error(err, "Manual rollback failed for %s", action.id);
      });
    });

    return action.id;
  },
};
