import type { IncidentContext } from "../ai-analysis.types";

export function buildPrompt(ctx: IncidentContext): {
  system: string;
  user: string;
} {
  const system = `You are an expert site reliability engineer analysing an incident detected by ReleaseGuard.
You will be given structured context about the incident, the affected deployment, and recent monitoring data.
Your task is to produce a structured root-cause analysis.

You MUST respond with ONLY valid JSON — no prose, no markdown outside the JSON block. The JSON must match this exact schema:
{
  "summary": "string — one paragraph summarising what happened",
  "probable_cause": "string — most likely root cause",
  "severity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "confidence": number between 0 and 1,
  "evidence": ["string", ...],
  "impact": "string — user-facing or system impact",
  "recommended_actions": ["string", ...],
  "recommendation": "string — top single recommendation",
  "rollback_recommended": boolean,
  "rollback_reason": "string or null",
  "missing_information": ["string", ...]
}`;

  const lines: string[] = [];

  lines.push("=== INCIDENT ===");
  lines.push(`ID: ${ctx.incident.id}`);
  lines.push(`Type: ${ctx.incident.type}`);
  lines.push(`Severity: ${ctx.incident.severity}`);
  lines.push(`Status: ${ctx.incident.status}`);
  lines.push(`Description: ${ctx.incident.description}`);
  lines.push(`Detected at: ${ctx.incident.createdAt}`);

  if (ctx.project) {
    lines.push("\n=== PROJECT ===");
    lines.push(`Name: ${ctx.project.name}`);
    lines.push(`Health check path: ${ctx.project.healthCheckPath}`);
    lines.push(`Build command: ${ctx.project.buildCommand}`);
    lines.push(`Test command: ${ctx.project.testCommand}`);
  }

  if (ctx.release) {
    lines.push("\n=== RELEASE ===");
    lines.push(`Version: ${ctx.release.version}`);
    lines.push(`Status: ${ctx.release.status}`);
    if (ctx.release.commitHash) lines.push(`Commit: ${ctx.release.commitHash}`);
  }

  if (ctx.deployment) {
    lines.push("\n=== DEPLOYMENT ===");
    lines.push(`Status: ${ctx.deployment.status}`);
    lines.push(`Image: ${ctx.deployment.imageTag}`);
    if (ctx.deployment.hostPort) lines.push(`Port: ${ctx.deployment.hostPort}`);
    if (ctx.deployment.startedAt) lines.push(`Started: ${ctx.deployment.startedAt}`);
  }

  if (ctx.monitoringRecords.length > 0) {
    lines.push(`\n=== LAST ${ctx.monitoringRecords.length} HEALTH CHECKS ===`);
    for (const r of ctx.monitoringRecords) {
      const ms = r.responseTimeMs != null ? `${r.responseTimeMs}ms` : "no response";
      const err = r.errorMessage ? ` | error: ${r.errorMessage}` : "";
      lines.push(`[${r.recordedAt}] ${r.status} — ${ms}${err}`);
    }
  }

  if (ctx.buildOutput != null) {
    lines.push("\n=== BUILD OUTPUT (last 2000 chars) ===");
    lines.push(ctx.buildOutput.slice(-2000));
    if (ctx.buildExitCode != null) lines.push(`Exit code: ${ctx.buildExitCode}`);
  }

  if (ctx.testOutput != null) {
    lines.push("\n=== TEST OUTPUT (last 2000 chars) ===");
    lines.push(ctx.testOutput.slice(-2000));
    if (ctx.testExitCode != null) lines.push(`Exit code: ${ctx.testExitCode}`);
  }

  if (ctx.dockerLogs) {
    lines.push("\n=== CONTAINER LOGS (sanitised, last 200 lines) ===");
    lines.push(ctx.dockerLogs);
  } else {
    lines.push("\n=== CONTAINER LOGS ===");
    lines.push("Not available.");
  }

  return { system, user: lines.join("\n") };
}
