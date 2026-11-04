import type { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { config } from "../infrastructure/config";

export async function registerPlugins(app: FastifyInstance): Promise<void> {
  await app.register(cors, { origin: config.corsOrigin });
  await app.register(helmet);
  if (!config.isTest) {
    await app.register(rateLimit, { max: 100, timeWindow: "1 minute" });
  }
}
