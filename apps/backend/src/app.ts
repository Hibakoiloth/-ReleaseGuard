import Fastify, { type FastifyInstance } from "fastify";
import { config } from "./infrastructure/config";
import { registerPlugins } from "./plugins";
import { projectRoutes } from "./modules/projects/project.routes";
import { errorHandler } from "./shared/errors";
import type { HealthResponse } from "@releaseguard/shared-types";

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: config.logger });

  await registerPlugins(app);
  app.setErrorHandler(errorHandler);

  app.get("/health", async (): Promise<HealthResponse> => ({
    status: "ok",
    timestamp: new Date().toISOString(),
  }));

  await app.register(projectRoutes, { prefix: "/api/projects" });

  return app;
}
