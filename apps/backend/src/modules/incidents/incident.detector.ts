import { monitoringRepository } from "../monitoring/monitoring.repository";
import { incidentRepository } from "./incident.repository";
import { incidentService } from "./incident.service";
import { logger } from "../../infrastructure/logging/logger";

const FAILURE_THRESHOLD = 3;
const LOOKBACK = 5;

export const incidentDetector = {
  async evaluate(deploymentId: string): Promise<void> {
    const records = await monitoringRepository.findRecent(deploymentId, LOOKBACK);
    if (records.length < FAILURE_THRESHOLD) return;

    let trailingFailures = 0;
    for (const record of records) {
      if (record.status === "UNHEALTHY") trailingFailures++;
      else break;
    }

    if (trailingFailures < FAILURE_THRESHOLD) return;

    const existing = await incidentRepository.findOpenByDeployment(deploymentId);
    if (existing) return;

    await incidentService
      .open(
        deploymentId,
        `Application failed ${trailingFailures} consecutive health checks.`
      )
      .catch((err) => logger.error(err, "Failed to create incident"));
  },
};
