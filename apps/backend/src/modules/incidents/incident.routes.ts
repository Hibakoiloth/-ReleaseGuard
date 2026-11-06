import type { FastifyInstance } from "fastify";
import { incidentService } from "./incident.service";

export async function incidentRoutes(app: FastifyInstance): Promise<void> {
  app.get<{
    Params: { projectId: string; releaseId: string; deploymentId: string };
  }>(
    "/:projectId/releases/:releaseId/deployments/:deploymentId/incidents",
    async (req) => {
      return incidentService.list(req.params.deploymentId);
    }
  );
}
