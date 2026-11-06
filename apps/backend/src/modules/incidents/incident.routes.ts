import type { FastifyInstance } from "fastify";
import { incidentService } from "./incident.service";
import { supabaseAdmin } from "../../infrastructure/supabase/supabase.client";
import type { IncidentType, IncidentSeverity, IncidentStatus } from "./incident.types";

export async function incidentRoutes(app: FastifyInstance): Promise<void> {
  app.get<{
    Params: { projectId: string; releaseId: string; deploymentId: string };
  }>(
    "/:projectId/releases/:releaseId/deployments/:deploymentId/incidents",
    async (req) => {
      return incidentService.list(req.params.deploymentId);
    }
  );

  app.get<{
    Params: { projectId: string; releaseId: string; deploymentId: string; incidentId: string };
  }>(
    "/:projectId/releases/:releaseId/deployments/:deploymentId/incidents/:incidentId",
    async (req, reply) => {
      const { data, error } = await supabaseAdmin
        .from("incidents")
        .select("*")
        .eq("id", req.params.incidentId)
        .eq("deployment_id", req.params.deploymentId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return reply.status(404).send({ message: "Incident not found" });
      return {
        id: data.id,
        deploymentId: data.deployment_id,
        type: data.type as IncidentType,
        severity: data.severity as IncidentSeverity,
        status: data.status as IncidentStatus,
        description: data.description,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    }
  );
}

