import { supabaseAdmin } from "../../../infrastructure/supabase/supabase.client";
import { monitoringRepository } from "../../monitoring/monitoring.repository";
import { buildRepository } from "../../builds/build.repository";
import { testRepository } from "../../tests/test.repository";
import { dockerClient } from "../../../infrastructure/docker/docker.client";
import { sanitizeLogs } from "./log-sanitizer";
import type { IncidentContext } from "../ai-analysis.types";

async function findDeploymentById(id: string) {
  const { data, error } = await supabaseAdmin
    .from("deployments")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function findReleaseById(id: string) {
  const { data, error } = await supabaseAdmin
    .from("releases")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function findProjectById(id: string) {
  const { data, error } = await supabaseAdmin
    .from("projects")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function collectContext(incidentId: string): Promise<IncidentContext> {
  const { data: incidentRow, error: incErr } = await supabaseAdmin
    .from("incidents")
    .select("*")
    .eq("id", incidentId)
    .maybeSingle();
  if (incErr) throw incErr;
  if (!incidentRow) throw new Error(`Incident ${incidentId} not found`);

  const ctx: IncidentContext = {
    incident: {
      id: incidentRow.id,
      deploymentId: incidentRow.deployment_id,
      type: incidentRow.type,
      severity: incidentRow.severity,
      status: incidentRow.status,
      description: incidentRow.description,
      createdAt: incidentRow.created_at,
    },
    deployment: null,
    release: null,
    project: null,
    monitoringRecords: [],
    buildOutput: null,
    buildExitCode: null,
    testOutput: null,
    testExitCode: null,
    dockerLogs: null,
  };

  const deploymentRow = await findDeploymentById(incidentRow.deployment_id).catch(() => null);
  if (!deploymentRow) return ctx;

  ctx.deployment = {
    id: deploymentRow.id,
    releaseId: deploymentRow.release_id,
    imageTag: deploymentRow.image_tag ?? "",
    containerId: deploymentRow.container_id,
    hostPort: deploymentRow.host_port,
    status: deploymentRow.status,
    startedAt: deploymentRow.started_at,
  };

  const [monRecords, releaseRow] = await Promise.all([
    monitoringRepository.findRecent(deploymentRow.id, 20).catch(() => []),
    findReleaseById(deploymentRow.release_id).catch(() => null),
  ]);

  ctx.monitoringRecords = monRecords.map((r) => ({
    status: r.status,
    responseTimeMs: r.responseTimeMs,
    errorMessage: r.errorMessage,
    recordedAt: r.recordedAt,
  }));

  if (releaseRow) {
    ctx.release = {
      id: releaseRow.id,
      projectId: releaseRow.project_id,
      version: releaseRow.version,
      status: releaseRow.status,
      commitHash: releaseRow.commit_hash,
    };

    const [builds, tests, projectRow] = await Promise.all([
      buildRepository.findAll(releaseRow.id).catch(() => []),
      testRepository.findAll(releaseRow.id).catch(() => []),
      findProjectById(releaseRow.project_id).catch(() => null),
    ]);

    if (builds.length > 0) {
      ctx.buildOutput = builds[0].output;
      ctx.buildExitCode = builds[0].exitCode;
    }
    if (tests.length > 0) {
      ctx.testOutput = tests[0].output;
      ctx.testExitCode = tests[0].exitCode;
    }

    if (projectRow) {
      const cfg = (projectRow.configuration ?? {}) as Record<string, string>;
      ctx.project = {
        id: projectRow.id,
        name: projectRow.name,
        repositoryUrl: cfg.repositoryUrl ?? "",
        buildCommand: cfg.buildCommand ?? "",
        testCommand: cfg.testCommand ?? "",
        dockerfilePath: cfg.dockerfilePath ?? "",
        healthCheckPath: cfg.healthCheckPath ?? "",
      };
    }
  }

  if (deploymentRow.container_id) {
    const rawLogs = await dockerClient
      .getLogs(deploymentRow.container_id)
      .catch(() => null);
    if (rawLogs) ctx.dockerLogs = sanitizeLogs(rawLogs);
  }

  return ctx;
}
