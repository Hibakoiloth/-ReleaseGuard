import { supabaseAdmin } from "../../infrastructure/supabase/supabase.client";
import type { Approval } from "../policies/policy.types";

function toApproval(row: Record<string, unknown>): Approval {
  return {
    id: row.id as string,
    recoveryActionId: row.recovery_action_id as string,
    decision: row.decision as string,
    approvedBy: (row.approved_by as string | null) ?? null,
    createdAt: row.created_at as string,
  };
}

export const approvalRepository = {
  async create(recoveryActionId: string): Promise<Approval> {
    const { data, error } = await supabaseAdmin
      .from("approvals")
      .insert({ recovery_action_id: recoveryActionId, decision: "PENDING" })
      .select()
      .single();
    if (error) throw error;
    return toApproval(data as Record<string, unknown>);
  },

  async findByRecoveryAction(recoveryActionId: string): Promise<Approval | null> {
    const { data, error } = await supabaseAdmin
      .from("approvals")
      .select("*")
      .eq("recovery_action_id", recoveryActionId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data ? toApproval(data as Record<string, unknown>) : null;
  },

  async findById(id: string): Promise<Approval | null> {
    const { data, error } = await supabaseAdmin
      .from("approvals")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? toApproval(data as Record<string, unknown>) : null;
  },

  async findPending(): Promise<Approval[]> {
    const { data, error } = await supabaseAdmin
      .from("approvals")
      .select("*")
      .eq("decision", "PENDING")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r) => toApproval(r as Record<string, unknown>));
  },

  async findHistory(limit = 50): Promise<Approval[]> {
    const { data, error } = await supabaseAdmin
      .from("approvals")
      .select("*")
      .in("decision", ["APPROVED", "REJECTED"])
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []).map((r) => toApproval(r as Record<string, unknown>));
  },

  async decide(id: string, decision: "APPROVED" | "REJECTED", approvedBy: string): Promise<Approval> {
    const { data, error } = await supabaseAdmin
      .from("approvals")
      .update({
        decision,
        approved_by: approvedBy,
      })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return toApproval(data as Record<string, unknown>);
  },
};
