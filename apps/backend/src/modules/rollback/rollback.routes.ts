import { z } from "zod";
import type { FastifyInstance } from "fastify";
import { rollbackService } from "./rollback.service";
import { recoveryActionRepository } from "../policies/recovery-action.repository";

const TriggerRollbackBody = z.object({
  incidentId: z.string().uuid(),
});

export async function rollbackRoutes(app: FastifyInstance): Promise<void> {
  app.post<{
    Params: { projectId: string; releaseId: string; deploymentId: string };
    Body: z.infer<typeof TriggerRollbackBody>;
  }>(
    "/:projectId/releases/:releaseId/deployments/:deploymentId/rollback",
    async (req, reply) => {
      const { incidentId } = TriggerRollbackBody.parse(req.body);
      const recoveryActionId = await rollbackService.triggerManual(
        req.params.deploymentId,
        incidentId,
        req.params.projectId
      );
      return reply.status(202).send({ recoveryActionId, queued: true });
    }
  );

  app.get<{
    Params: { projectId: string; releaseId: string; deploymentId: string; recoveryActionId: string };
  }>(
    "/:projectId/releases/:releaseId/deployments/:deploymentId/rollback/:recoveryActionId",
    async (req, reply) => {
      const action = await recoveryActionRepository.findById(req.params.recoveryActionId);
      if (!action) return reply.status(404).send({ message: "Recovery action not found" });
      return action;
    }
  );
}
