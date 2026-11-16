import { supabaseAdmin } from "../../infrastructure/supabase/supabase.client";
import type { Policy, PolicyConditions } from "./policy.types";

function toPolicy(row: Record<string, unknown>): Policy {
  return {
    id: row.id as string,
    projectId: row.project_id as string,
    name: row.name as string,
    action: row.action as Policy["action"],
    conditions: row.conditions as PolicyConditions,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export const policyRepository = {
  async findByProject(projectId: string): Promise<Policy[]> {
    const { data, error } = await supabaseAdmin
      .from("policies")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r) => toPolicy(r as Record<string, unknown>));
  },

  async findById(id: string): Promise<Policy | null> {
    const { data, error } = await supabaseAdmin
      .from("policies")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? toPolicy(data as Record<string, unknown>) : null;
  },

  async create(
    projectId: string,
    name: string,
    action: string,
    conditions: PolicyConditions
  ): Promise<Policy> {
    const { data, error } = await supabaseAdmin
      .from("policies")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert({ project_id: projectId, name, action, conditions } as any)
      .select()
      .single();
    if (error) throw error;
    return toPolicy(data as Record<string, unknown>);
  },

  async delete(id: string, projectId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from("policies")
      .delete()
      .eq("id", id)
      .eq("project_id", projectId);
    if (error) throw error;
  },
};
