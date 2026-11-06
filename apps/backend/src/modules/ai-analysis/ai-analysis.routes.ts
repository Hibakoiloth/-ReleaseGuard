import type { FastifyInstance } from "fastify";
import { aiAnalysisService } from "./ai-analysis.service";

export async function aiAnalysisRoutes(app: FastifyInstance): Promise<void> {
  app.get<{
    Params: {
      projectId: string;
      releaseId: string;
      deploymentId: string;
      incidentId: string;
    };
  }>(
    "/:projectId/releases/:releaseId/deployments/:deploymentId/incidents/:incidentId/analysis",
    async (req) => {
      return aiAnalysisService.getByIncident(req.params.incidentId);
    }
  );

  app.post<{
    Params: {
      projectId: string;
      releaseId: string;
      deploymentId: string;
      incidentId: string;
    };
  }>(
    "/:projectId/releases/:releaseId/deployments/:deploymentId/incidents/:incidentId/analysis/trigger",
    async (req, reply) => {
      setImmediate(() => {
        aiAnalysisService.triggerReanalysis(req.params.incidentId).catch(() => {});
      });
      return reply.status(202).send({ queued: true });
    }
  );
}
