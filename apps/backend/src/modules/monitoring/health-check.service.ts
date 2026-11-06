import type { HealthCheckResult } from "../monitoring/monitoring.types";

const TIMEOUT_MS = 5000;

export const healthCheckService = {
  async check(url: string): Promise<HealthCheckResult> {
    const start = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const res = await fetch(url, { signal: controller.signal });
      const responseTimeMs = Date.now() - start;
      const healthy = res.status >= 200 && res.status < 300;
      return {
        statusCode: res.status,
        responseTimeMs,
        healthy,
        errorMessage: healthy ? null : `HTTP ${res.status}`,
      };
    } catch (err) {
      const responseTimeMs = Date.now() - start;
      const msg = err instanceof Error ? err.message : "Unknown error";
      return {
        statusCode: null,
        responseTimeMs,
        healthy: false,
        errorMessage: msg,
      };
    } finally {
      clearTimeout(timeout);
    }
  },
};
