import type { FastifyInstance } from "fastify";
import { releaseController } from "./release.controller";

export async function releaseRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Params: { projectId: string } }>(
    "/:projectId/releases",
    releaseController.create
  );
  app.get<{ Params: { projectId: string } }>(
    "/:projectId/releases",
    releaseController.list
  );
  app.get<{ Params: { projectId: string; id: string } }>(
    "/:projectId/releases/:id",
    releaseController.get
  );
  app.post<{ Params: { projectId: string; id: string } }>(
    "/:projectId/releases/:id/start",
    releaseController.start
  );
}
