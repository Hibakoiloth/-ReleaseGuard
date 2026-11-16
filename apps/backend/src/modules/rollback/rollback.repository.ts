import { supabaseAdmin } from "../../infrastructure/supabase/supabase.client";
import type { Release } from "../releases/release.types";
import type { Deployment } from "../deployments/deployment.types";

function toRelease(row: Record<string, unknown>): Release {
  return {
    id: row.id as string,
    projectId: row.project_id as string,
    version: row.version as string,
    status: row.status as Release["status"],
    commitHash: (row.commit_hash as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function toDeployment(row: Record<string, unknown>): Deployment {
  return {
    id: row.id as string,
    releaseId: row.release_id as string,
    imageTag: (row.image_tag as string | null) ?? "",
    containerId: (row.container_id as string | null) ?? null,
    hostPort: (row.host_port as number | null) ?? null,
    status: row.status as Deployment["status"],
    startedAt: (row.started_at as string | null) ?? null,
    stoppedAt: (row.completed_at as string | null) ?? null,
    createdAt: row.created_at as string,
  };
}

export const rollbackRepository = {
  async findPreviousSuccessfulDeployment(
    projectId: string,
    excludeReleaseId: string
  ): Promise<{ release: Release; deployment: Deployment } | null> {
    const { data: releases, error: relErr } = await supabaseAdmin
      .from("releases")
      .select("*")
      .eq("project_id", projectId)
      .eq("status", "SUCCESS")
      .neq("id", excludeReleaseId)
      .order("created_at", { ascending: false })
      .limit(5);
    if (relErr) throw relErr;
    if (!releases || releases.length === 0) return null;

    for (const releaseRow of releases) {
      const release = toRelease(releaseRow as Record<string, unknown>);
      const { data: deps, error: depErr } = await supabaseAdmin
        .from("deployments")
        .select("*")
        .eq("release_id", release.id)
        .in("status", ["RUNNING", "STOPPED"])
        .order("created_at", { ascending: false })
        .limit(1);
      if (depErr) throw depErr;
      if (deps && deps.length > 0) {
        return { release, deployment: toDeployment(deps[0] as Record<string, unknown>) };
      }
    }
    return null;
  },

  async getDeploymentWithRelease(deploymentId: string): Promise<{
    deployment: Deployment;
    release: Release;
    projectId: string;
    projectName: string;
    healthCheckPath: string;
  } | null> {
    const { data: dep, error: depErr } = await supabaseAdmin
      .from("deployments")
      .select("*")
      .eq("id", deploymentId)
      .maybeSingle();
    if (depErr) throw depErr;
    if (!dep) return null;

    const deployment = toDeployment(dep as Record<string, unknown>);

    const { data: rel, error: relErr } = await supabaseAdmin
      .from("releases")
      .select("*")
      .eq("id", deployment.releaseId)
      .maybeSingle();
    if (relErr) throw relErr;
    if (!rel) return null;

    const release = toRelease(rel as Record<string, unknown>);

    const { data: proj, error: projErr } = await supabaseAdmin
      .from("projects")
      .select("id, name, configuration")
      .eq("id", release.projectId)
      .maybeSingle();
    if (projErr) throw projErr;
    if (!proj) return null;

    const cfg = ((proj as Record<string, unknown>).configuration ?? {}) as Record<string, string>;

    return {
      deployment,
      release,
      projectId: release.projectId,
      projectName: (proj as Record<string, unknown>).name as string,
      healthCheckPath: cfg.healthCheckPath ?? "/health",
    };
  },
};
