import { incidentRepository } from "./incident.repository";
import { aiAnalysisService } from "../ai-analysis/ai-analysis.service";
import { policyEngine } from "../policies/policy.engine";
import { supabaseAdmin } from "../../infrastructure/supabase/supabase.client";
import type { Incident } from "./incident.types";
import type { PolicyEvent } from "../policies/policy.types";

export const incidentService = {
  async open(
    deploymentId: string,
    description: string,
    policyEvent: PolicyEvent = "HEALTH_CHECK_FAILED"
  ): Promise<Incident> {
    const incident = await incidentRepository.create(
      deploymentId,
      "APPLICATION_UNAVAILABLE",
      "HIGH",
      description
    );
    setImmediate(() => {
      aiAnalysisService.analyzeIncident(incident.id).catch(() => {});
      resolveProjectId(deploymentId)
        .then((projectId) => {
          if (projectId) {
            return policyEngine.evaluate(policyEvent, {
              projectId,
              incidentId: incident.id,
              deploymentId,
            });
          }
        })
        .catch(() => {});
    });
    return incident;
  },

  async list(deploymentId: string): Promise<Incident[]> {
    return incidentRepository.findByDeployment(deploymentId);
  },
};

async function resolveProjectId(deploymentId: string): Promise<string | null> {
  try {
    const { data: dep } = await supabaseAdmin
      .from("deployments")
      .select("release_id")
      .eq("id", deploymentId)
      .single();
    if (!dep) return null;
    const { data: rel } = await supabaseAdmin
      .from("releases")
      .select("project_id")
      .eq("id", dep.release_id)
      .single();
    return rel?.project_id ?? null;
  } catch {
    return null;
  }
}
