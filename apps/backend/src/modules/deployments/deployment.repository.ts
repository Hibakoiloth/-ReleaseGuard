import { supabaseAdmin } from "../../infrastructure/supabase/supabase.client";
import type { Deployment, DeploymentStatus } from "./deployment.types";

function toDeployment(row: {
  id: string;
  release_id: string;
  image_tag: string | null;
  container_id: string | null;
  host_port: number | null;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}): Deployment {
  return {
    id: row.id,
    releaseId: row.release_id,
    imageTag: row.image_tag ?? "",
    containerId: row.container_id,
    hostPort: row.host_port,
    status: row.status as DeploymentStatus,
    startedAt: row.started_at,
    stoppedAt: row.completed_at,
    createdAt: row.created_at,
  };
}

export const deploymentRepository = {
  async findAll(releaseId: string): Promise<Deployment[]> {
    const { data, error } = await supabaseAdmin
      .from("deployments")
      .select("*")
      .eq("release_id", releaseId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(toDeployment);
  },

  async findById(id: string, releaseId: string): Promise<Deployment | null> {
    const { data, error } = await supabaseAdmin
      .from("deployments")
      .select("*")
      .eq("id", id)
      .eq("release_id", releaseId)
      .single();
    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return toDeployment(data);
  },

  async create(releaseId: string, imageTag: string): Promise<Deployment> {
    const { data, error } = await supabaseAdmin
      .from("deployments")
      .insert({ release_id: releaseId, image_tag: imageTag, status: "PENDING" })
      .select()
      .single();
    if (error) throw error;
    return toDeployment(data);
  },

  async update(
    id: string,
    patch: {
      status: DeploymentStatus;
      containerId?: string | null;
      hostPort?: number | null;
      startedAt?: string;
      stoppedAt?: string;
    }
  ): Promise<Deployment> {
    const payload: Record<string, unknown> = { status: patch.status };
    if (patch.containerId !== undefined) payload.container_id = patch.containerId;
    if (patch.hostPort !== undefined) payload.host_port = patch.hostPort;
    if (patch.startedAt !== undefined) payload.started_at = patch.startedAt;
    if (patch.stoppedAt !== undefined) payload.completed_at = patch.stoppedAt;

    const { data, error } = await supabaseAdmin
      .from("deployments")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update(payload as any)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return toDeployment(data);
  },
};
