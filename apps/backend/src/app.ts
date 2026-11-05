import Fastify, { type FastifyInstance } from "fastify";
import { config } from "./infrastructure/config";
import { registerPlugins } from "./plugins";
import { projectRoutes } from "./modules/projects/project.routes";
import { releaseRoutes } from "./modules/releases/release.routes";
import { buildRoutes } from "./modules/builds/build.routes";
import { testRoutes } from "./modules/tests/test.routes";
import { errorHandler } from "./shared/errors";
import { authenticate } from "./plugins/auth";
import type { HealthResponse } from "@releaseguard/shared-types";

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: config.logger });

  await registerPlugins(app);
  app.setErrorHandler(errorHandler);

  app.decorateRequest("user", null);

  app.get("/health", async (): Promise<HealthResponse> => ({
    status: "ok",
    timestamp: new Date().toISOString(),
  }));

  await app.register(
    async (api) => {
      api.addHook("preHandler", authenticate);
      await api.register(projectRoutes, { prefix: "/projects" });
      await api.register(releaseRoutes, { prefix: "/projects" });
      await api.register(buildRoutes, { prefix: "/projects" });
      await api.register(testRoutes, { prefix: "/projects" });
    },
    { prefix: "/api" }
  );

  return app;
}
