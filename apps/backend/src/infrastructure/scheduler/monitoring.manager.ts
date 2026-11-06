import { supabaseAdmin } from "../supabase/supabase.client";
import { MonitoringScheduler } from "./monitoring.scheduler";
import { logger } from "../logging/logger";

const schedulers = new Map<string, MonitoringScheduler>();

export const monitoringManager = {
  start(deploymentId: string, url: string, intervalMs = 5000): void {
    if (schedulers.has(deploymentId)) return;
    const scheduler = new MonitoringScheduler();
    scheduler.start(deploymentId, url, intervalMs);
    schedulers.set(deploymentId, scheduler);
    logger.info(`Monitoring started for deployment ${deploymentId}`);
  },

  stop(deploymentId: string): void {
    const scheduler = schedulers.get(deploymentId);
    if (scheduler) {
      scheduler.stop();
      schedulers.delete(deploymentId);
      logger.info(`Monitoring stopped for deployment ${deploymentId}`);
    }
  },

  stopAll(): void {
    for (const [id, scheduler] of schedulers) {
      scheduler.stop();
      logger.info(`Monitoring stopped for deployment ${id}`);
    }
    schedulers.clear();
  },

  async recover(): Promise<void> {
    try {
      const { data: deployments, error } = await supabaseAdmin
        .from("deployments")
        .select("id, host_port, release_id")
        .eq("status", "RUNNING");

      if (error) throw error;
      if (!deployments || deployments.length === 0) return;

      for (const dep of deployments) {
        if (!dep.host_port) continue;

        const { data: release } = await supabaseAdmin
          .from("releases")
          .select("project_id")
          .eq("id", dep.release_id)
          .single();

        if (!release) continue;

        const { data: project } = await supabaseAdmin
          .from("projects")
          .select("configuration")
          .eq("id", release.project_id)
          .single();

        if (!project) continue;

        const cfg = (project.configuration ?? {}) as { healthCheckPath?: string };
        const healthCheckPath = cfg.healthCheckPath ?? "/health";
        const url = `http://127.0.0.1:${dep.host_port}${healthCheckPath}`;

        this.start(dep.id, url);
      }

      if (deployments.length > 0) {
        logger.info(`Monitoring recovered for ${deployments.length} deployment(s)`);
      }
    } catch (err) {
      logger.error(err, "Failed to recover monitoring sessions");
    }
  },
};
