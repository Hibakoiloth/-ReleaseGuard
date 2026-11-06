import type { FastifyInstance } from "fastify";
import { monitoringService } from "./monitoring.service";

export async function monitoringRoutes(app: FastifyInstance): Promise<void> {
  app.get<{
    Params: { projectId: string; releaseId: string; deploymentId: string };
    Querystring: { limit?: string };
  }>(
    "/:projectId/releases/:releaseId/deployments/:deploymentId/monitoring",
    async (req) => {
      const limit = Math.min(parseInt(req.query.limit ?? "20", 10), 100);
      return monitoringService.getRecent(req.params.deploymentId, limit);
    }
  );
}
