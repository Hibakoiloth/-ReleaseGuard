import { healthCheckService } from "./health-check.service";
import { monitoringRepository } from "./monitoring.repository";
import { incidentDetector } from "../incidents/incident.detector";
import { logger } from "../../infrastructure/logging/logger";
import type { MonitoringRecord } from "./monitoring.types";

export const monitoringService = {
  async runCheck(deploymentId: string, url: string): Promise<MonitoringRecord> {
    const result = await healthCheckService.check(url);

    const record = await monitoringRepository.create(
      deploymentId,
      result.healthy ? "HEALTHY" : "UNHEALTHY",
      result.responseTimeMs,
      result.errorMessage
    );

    if (!result.healthy) {
      await incidentDetector.evaluate(deploymentId).catch((err) =>
        logger.error(err, "Incident detection error")
      );
    }

    return record;
  },

  async getRecent(deploymentId: string, limit = 20): Promise<MonitoringRecord[]> {
    return monitoringRepository.findRecent(deploymentId, limit);
  },
};
