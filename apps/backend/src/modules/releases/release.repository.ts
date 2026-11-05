import { supabaseAdmin } from "../../infrastructure/supabase/supabase.client";
import type { Release, CreateReleaseInput, ReleaseStatus } from "./release.types";

function toRelease(row: {
  id: string;
  project_id: string;
  version: string;
  status: string;
  commit_hash: string | null;
  created_at: string;
  updated_at: string;
}): Release {
  return {
    id: row.id,
    projectId: row.project_id,
    version: row.version,
    status: row.status as ReleaseStatus,
    commitHash: row.commit_hash,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const releaseRepository = {
  async findAll(projectId: string): Promise<Release[]> {
    const { data, error } = await supabaseAdmin
      .from("releases")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(toRelease);
  },

  async findById(id: string, projectId: string): Promise<Release | null> {
    const { data, error } = await supabaseAdmin
      .from("releases")
      .select("*")
      .eq("id", id)
      .eq("project_id", projectId)
      .single();
    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return toRelease(data);
  },

  async create(
    input: CreateReleaseInput & { projectId: string }
  ): Promise<Release> {
    const { data, error } = await supabaseAdmin
      .from("releases")
      .insert({
        project_id: input.projectId,
        version: input.version,
        commit_hash: input.commitHash ?? null,
        status: "CREATED",
      })
      .select()
      .single();
    if (error) throw error;
    return toRelease(data);
  },

  async updateStatus(
    id: string,
    projectId: string,
    status: ReleaseStatus
  ): Promise<Release | null> {
    const { data, error } = await supabaseAdmin
      .from("releases")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("project_id", projectId)
      .select()
      .single();
    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return toRelease(data);
  },

  async adminUpdateStatus(id: string, status: ReleaseStatus): Promise<void> {
    const { error } = await supabaseAdmin
      .from("releases")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  },
};
