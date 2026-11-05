import type { FastifyInstance } from "fastify";
import { testService } from "./test.service";

export async function testRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/projects/:projectId/releases/:releaseId/tests
  app.get<{ Params: { projectId: string; releaseId: string } }>(
    "/:projectId/releases/:releaseId/tests",
    async (req) => {
      return testService.list(req.params.releaseId);
    }
  );

  // GET /api/projects/:projectId/releases/:releaseId/tests/:id
  app.get<{ Params: { projectId: string; releaseId: string; id: string } }>(
    "/:projectId/releases/:releaseId/tests/:id",
    async (req, reply) => {
      const result = await testService.get(req.params.id, req.params.releaseId);
      if (!result) return reply.code(404).send({ error: "Test execution not found" });
      return result;
    }
  );
}
