import { supabaseAdmin } from "../../infrastructure/supabase/supabase.client";
import type { MonitoringRecord, HealthStatus } from "./monitoring.types";

function toRecord(row: {
  id: string;
  deployment_id: string;
  status: string;
  response_time_ms: number | null;
  error_message: string | null;
  recorded_at: string;
}): MonitoringRecord {
  return {
    id: row.id,
    deploymentId: row.deployment_id,
    status: row.status as HealthStatus,
    responseTimeMs: row.response_time_ms,
    errorMessage: row.error_message,
    recordedAt: row.recorded_at,
  };
}

export const monitoringRepository = {
  async create(
    deploymentId: string,
    status: HealthStatus,
    responseTimeMs: number | null,
    errorMessage: string | null
  ): Promise<MonitoringRecord> {
    const { data, error } = await supabaseAdmin
      .from("monitoring_records")
      .insert({
        deployment_id: deploymentId,
        status,
        response_time_ms: responseTimeMs,
        error_message: errorMessage,
      })
      .select()
      .single();
    if (error) throw error;
    return toRecord(data);
  },

  async findRecent(deploymentId: string, limit = 20): Promise<MonitoringRecord[]> {
    const { data, error } = await supabaseAdmin
      .from("monitoring_records")
      .select("*")
      .eq("deployment_id", deploymentId)
      .order("recorded_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []).map(toRecord);
  },
};
