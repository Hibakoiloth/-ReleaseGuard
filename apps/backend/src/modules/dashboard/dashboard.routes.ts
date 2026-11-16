import type { FastifyInstance } from "fastify";
import { supabaseAdmin } from "../../infrastructure/supabase/supabase.client";

export async function dashboardRoutes(app: FastifyInstance): Promise<void> {
  app.get("/dashboard", async (req) => {
    const userId = req.user!.id;

    const { data: projects } = await supabaseAdmin
      .from("projects")
      .select("id, name, status, created_at, updated_at")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false });

    const projectIds = (projects ?? []).map((p: { id: string }) => p.id);

    if (projectIds.length === 0) {
      return {
        summary: {
          projects: { total: 0, active: 0, archived: 0 },
          releases: { total: 0, success: 0, failed: 0, active: 0 },
          deployments: { total: 0, running: 0, failed: 0 },
          incidents: { open: 0, resolved: 0 },
          approvals: { pending: 0 },
          recovery: { total: 0, completed: 0 },
        },
        recentProjects: [],
        recentReleases: [],
        recentIncidents: [],
      };
    }

    const [releasesRes, approvalsRes] = await Promise.all([
      supabaseAdmin
        .from("releases")
        .select("id, project_id, version, status, created_at, updated_at, commit_hash")
        .in("project_id", projectIds)
        .order("created_at", { ascending: false })
        .limit(200),
      supabaseAdmin
        .from("approvals")
        .select("id, decision")
        .eq("decision", "PENDING"),
    ]);

    const releases = releasesRes.data ?? [];
    const releaseIds = releases.map((r: { id: string }) => r.id);

    const [deploymentsRes, incidentsRes, recoveryRes] = await Promise.all([
      releaseIds.length > 0
        ? supabaseAdmin
            .from("deployments")
            .select("id, release_id, status, host_port, started_at")
            .in("release_id", releaseIds)
            .order("started_at", { ascending: false })
        : Promise.resolve({ data: [] }),
      supabaseAdmin
        .from("incidents")
        .select("id, deployment_id, type, severity, status, description, created_at")
        .order("created_at", { ascending: false })
        .limit(50),
      supabaseAdmin
        .from("recovery_actions")
        .select("id, status")
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

    const deployments = deploymentsRes.data ?? [];
    const incidents = incidentsRes.data ?? [];
    const recoveryActions = recoveryRes.data ?? [];

    const deploymentIds = new Set(deployments.map((d: { id: string }) => d.id));
    const userIncidents = incidents.filter((i: { deployment_id: string }) =>
      deploymentIds.has(i.deployment_id)
    );

    const projectStats = {
      total: (projects ?? []).length,
      active: (projects ?? []).filter((p: { status: string }) => p.status === "ACTIVE").length,
      archived: (projects ?? []).filter((p: { status: string }) => p.status === "ARCHIVED").length,
    };
    const releaseStats = {
      total: releases.length,
      success: releases.filter((r: { status: string }) => r.status === "SUCCESS").length,
      failed: releases.filter((r: { status: string }) =>
        r.status === "FAILED" || r.status === "ROLLED_BACK"
      ).length,
      active: releases.filter((r: { status: string }) =>
        ["BUILDING", "TESTING", "DEPLOYING", "MONITORING"].includes(r.status)
      ).length,
    };
    const deploymentStats = {
      total: deployments.length,
      running: deployments.filter((d: { status: string }) => d.status === "RUNNING").length,
      failed: deployments.filter((d: { status: string }) => d.status === "FAILED").length,
    };
    const incidentStats = {
      open: userIncidents.filter((i: { status: string }) => i.status === "OPEN").length,
      resolved: userIncidents.filter((i: { status: string }) => i.status === "RESOLVED").length,
    };
    const recoveryStats = {
      total: recoveryActions.length,
      completed: recoveryActions.filter((r: { status: string }) => r.status === "COMPLETED").length,
    };

    const projectMap = new Map(
      (projects ?? []).map((p: { id: string; name: string }) => [p.id, p.name])
    );

    const recentReleases = releases.slice(0, 10).map((r: Record<string, unknown>) => ({
      ...r,
      projectName: projectMap.get(r.project_id as string) ?? "Unknown",
    }));

    const recentIncidents = userIncidents
      .filter((i: { status: string }) => i.status === "OPEN")
      .slice(0, 5);

    const latestReleaseByProject = new Map<string, string>();
    for (const r of releases) {
      const rid = (r as { project_id: string }).project_id;
      if (!latestReleaseByProject.has(rid)) {
        latestReleaseByProject.set(rid, (r as { status: string }).status);
      }
    }
    const recentProjects = (projects ?? []).slice(0, 5).map((p: Record<string, unknown>) => ({
      ...p,
      latestReleaseStatus: latestReleaseByProject.get(p.id as string) ?? null,
    }));

    return {
      summary: {
        projects: projectStats,
        releases: releaseStats,
        deployments: deploymentStats,
        incidents: incidentStats,
        approvals: { pending: (approvalsRes.data ?? []).length },
        recovery: recoveryStats,
      },
      recentProjects,
      recentReleases,
      recentIncidents,
    };
  });
}
