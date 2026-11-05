import type { FastifyInstance } from "fastify";
import { buildService } from "./build.service";

export async function buildRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/projects/:projectId/releases/:releaseId/builds
  app.get<{ Params: { projectId: string; releaseId: string } }>(
    "/:projectId/releases/:releaseId/builds",
    async (req) => {
      return buildService.list(req.params.releaseId);
    }
  );

  // GET /api/projects/:projectId/releases/:releaseId/builds/:id
  app.get<{ Params: { projectId: string; releaseId: string; id: string } }>(
    "/:projectId/releases/:releaseId/builds/:id",
    async (req, reply) => {
      const result = await buildService.get(req.params.id, req.params.releaseId);
      if (!result) return reply.code(404).send({ error: "Build execution not found" });
      return result;
    }
  );
}
