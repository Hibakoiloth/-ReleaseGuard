import "dotenv/config";
import { buildApp } from "./app";
import { config } from "./infrastructure/config";
import { logger } from "./infrastructure/logging/logger";

const app = await buildApp();

const shutdown = async (): Promise<void> => {
  try {
    await app.close();
    logger.info("Server closed");
    process.exit(0);
  } catch (err) {
    logger.error(err, "Error during shutdown");
    process.exit(1);
  }
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

try {
  await app.listen({ port: config.port, host: "0.0.0.0" });
} catch (err) {
  logger.error(err, "Failed to start server");
  process.exit(1);
}
