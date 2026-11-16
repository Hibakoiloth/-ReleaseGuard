import { supabaseAdmin } from "../../infrastructure/supabase/supabase.client";
import type { RecoveryAction, RecoveryActionStatus } from "./policy.types";

function toRecoveryAction(row: Record<string, unknown>): RecoveryAction {
  return {
    id: row.id as string,
    incidentId: row.incident_id as string,
    deploymentId: (row.deployment_id as string | null) ?? null,
    actionType: row.action_type as string,
    status: (row.status ?? "PENDING") as RecoveryActionStatus,
    reason: (row.reason as string | null) ?? null,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export const recoveryActionRepository = {
  async create(
    incidentId: string,
    deploymentId: string,
    actionType: string,
    status: RecoveryActionStatus,
    reason?: string
  ): Promise<RecoveryAction> {
    const { data, error } = await supabaseAdmin
      .from("recovery_actions")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert({
        incident_id: incidentId,
        deployment_id: deploymentId,
        action_type: actionType,
        status,
        reason: reason ?? null,
      } as any)
      .select()
      .single();
    if (error) throw error;
    return toRecoveryAction(data as Record<string, unknown>);
  },

  async findActiveByIncident(incidentId: string): Promise<RecoveryAction | null> {
    const { data, error } = await supabaseAdmin
      .from("recovery_actions")
      .select("*")
      .eq("incident_id", incidentId)
      .in("status", ["PENDING", "PENDING_APPROVAL", "IN_PROGRESS"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data ? toRecoveryAction(data as Record<string, unknown>) : null;
  },

  async findById(id: string): Promise<RecoveryAction | null> {
    const { data, error } = await supabaseAdmin
      .from("recovery_actions")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? toRecoveryAction(data as Record<string, unknown>) : null;
  },

  async findByIncident(incidentId: string): Promise<RecoveryAction[]> {
    const { data, error } = await supabaseAdmin
      .from("recovery_actions")
      .select("*")
      .eq("incident_id", incidentId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r) => toRecoveryAction(r as Record<string, unknown>));
  },

  async updateStatus(
    id: string,
    status: RecoveryActionStatus,
    reason?: string
  ): Promise<void> {
    const patch: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (reason !== undefined) patch.reason = reason;
    const { error } = await supabaseAdmin
      .from("recovery_actions")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update(patch as any)
      .eq("id", id);
    if (error) throw error;
  },
};
