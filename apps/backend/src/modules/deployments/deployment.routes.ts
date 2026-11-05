import type { FastifyInstance } from "fastify";
import { deploymentService } from "./deployment.service";

export async function deploymentRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { projectId: string; releaseId: string } }>(
    "/:projectId/releases/:releaseId/deployments",
    async (req) => {
      return deploymentService.list(req.params.releaseId);
    }
  );

  app.get<{ Params: { projectId: string; releaseId: string; id: string } }>(
    "/:projectId/releases/:releaseId/deployments/:id",
    async (req, reply) => {
      const result = await deploymentService.get(req.params.id, req.params.releaseId);
      if (!result) return reply.code(404).send({ error: "Deployment not found" });
      return result;
    }
  );
}
