import { supabaseAdmin } from "../../infrastructure/supabase/supabase.client";
import type { Incident, IncidentType, IncidentSeverity, IncidentStatus } from "./incident.types";

function toIncident(row: {
  id: string;
  deployment_id: string;
  type: string;
  severity: string;
  status: string;
  description: string;
  created_at: string;
  updated_at: string;
}): Incident {
  return {
    id: row.id,
    deploymentId: row.deployment_id,
    type: row.type as IncidentType,
    severity: row.severity as IncidentSeverity,
    status: row.status as IncidentStatus,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const incidentRepository = {
  async create(
    deploymentId: string,
    type: IncidentType,
    severity: IncidentSeverity,
    description: string
  ): Promise<Incident> {
    const { data, error } = await supabaseAdmin
      .from("incidents")
      .insert({ deployment_id: deploymentId, type, severity, description, status: "OPEN" })
      .select()
      .single();
    if (error) throw error;
    return toIncident(data);
  },

  async findByDeployment(deploymentId: string): Promise<Incident[]> {
    const { data, error } = await supabaseAdmin
      .from("incidents")
      .select("*")
      .eq("deployment_id", deploymentId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(toIncident);
  },

  async findOpenByDeployment(deploymentId: string): Promise<Incident | null> {
    const { data, error } = await supabaseAdmin
      .from("incidents")
      .select("*")
      .eq("deployment_id", deploymentId)
      .eq("status", "OPEN")
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data ? toIncident(data) : null;
  },
};
