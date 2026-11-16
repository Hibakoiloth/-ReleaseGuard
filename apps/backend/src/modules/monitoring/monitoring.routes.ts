import type { FastifyInstance } from "fastify";
import { monitoringService } from "./monitoring.service";
import { monitoringManager } from "../../infrastructure/scheduler/monitoring.manager";

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

  app.get<{ Params: { projectId: string; releaseId: string; deploymentId: string } }>(
    "/:projectId/releases/:releaseId/deployments/:deploymentId/monitoring/status",
    async (req) => monitoringManager.getStatus(req.params.deploymentId)
  );

  app.post<{ Params: { projectId: string; releaseId: string; deploymentId: string } }>(
    "/:projectId/releases/:releaseId/deployments/:deploymentId/monitoring/pause",
    async (req) => {
      monitoringManager.pause(req.params.deploymentId);
      return monitoringManager.getStatus(req.params.deploymentId);
    }
  );

  app.post<{ Params: { projectId: string; releaseId: string; deploymentId: string } }>(
    "/:projectId/releases/:releaseId/deployments/:deploymentId/monitoring/resume",
    async (req) => {
      monitoringManager.resume(req.params.deploymentId);
      return monitoringManager.getStatus(req.params.deploymentId);
    }
  );

  app.patch<{
    Params: { projectId: string; releaseId: string; deploymentId: string };
    Body: { intervalMs: number };
  }>(
    "/:projectId/releases/:releaseId/deployments/:deploymentId/monitoring/settings",
    async (req) => {
      const { intervalMs } = req.body;
      monitoringManager.setIntervalMs(req.params.deploymentId, intervalMs);
      return monitoringManager.getStatus(req.params.deploymentId);
    }
  );
}

