import { monitoringService } from "../../modules/monitoring/monitoring.service";
import { logger } from "../logging/logger";

export class MonitoringScheduler {
  private timer: ReturnType<typeof setInterval> | null = null;
  private isChecking = false;

  start(deploymentId: string, url: string, intervalMs = 5000): void {
    if (this.timer) return;

    this.timer = setInterval(async () => {
      if (this.isChecking) return;
      this.isChecking = true;
      try {
        await monitoringService.runCheck(deploymentId, url);
      } catch (err) {
        logger.error(err, `Monitor check failed for deployment ${deploymentId}`);
      } finally {
        this.isChecking = false;
      }
    }, intervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isChecking = false;
  }

  isActive(): boolean {
    return this.timer !== null;
  }
}
