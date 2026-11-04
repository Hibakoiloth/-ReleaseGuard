import type { FastifyInstance } from "fastify";
import { projectController } from "./project.controller";

export async function projectRoutes(app: FastifyInstance): Promise<void> {
  app.get("/", projectController.list);
  app.post("/", projectController.create);
  app.get<{ Params: { id: string } }>("/:id", projectController.get);
  app.patch<{ Params: { id: string } }>("/:id", projectController.update);
  app.delete<{ Params: { id: string } }>("/:id", projectController.remove);
  app.post<{ Params: { id: string } }>("/:id/archive", projectController.archive);
}
