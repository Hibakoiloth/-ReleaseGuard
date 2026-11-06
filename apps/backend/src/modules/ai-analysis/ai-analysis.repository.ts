import { supabaseAdmin } from "../../infrastructure/supabase/supabase.client";
import type { AiAnalysis, AnalysisStatus, ModelResponse } from "./ai-analysis.types";

function toAnalysis(row: Record<string, unknown>): AiAnalysis {
  return {
    id: row.id as string,
    incidentId: row.incident_id as string,
    status: (row.status ?? "PENDING") as AnalysisStatus,
    modelName: (row.model_name as string | null) ?? null,
    summary: (row.summary as string | null) ?? null,
    probableCause: (row.probable_cause as string | null) ?? null,
    severity: (row.severity as string | null) ?? null,
    confidence: (row.confidence as number | null) ?? null,
    evidence: (row.evidence as string[] | null) ?? null,
    impact: (row.impact as string | null) ?? null,
    recommendedActions: (row.recommended_actions as string[] | null) ?? null,
    recommendation: (row.recommendation as string | null) ?? null,
    rollbackRecommended: (row.rollback_recommended as boolean | null) ?? null,
    rollbackReason: (row.rollback_reason as string | null) ?? null,
    missingInformation: (row.missing_information as string[] | null) ?? null,
    processingDurationMs: (row.processing_duration_ms as number | null) ?? null,
    errorMessage: (row.error_message as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: (row.updated_at as string | null) ?? null,
  };
}

export const aiAnalysisRepository = {
  async create(incidentId: string): Promise<AiAnalysis> {
    const { data, error } = await supabaseAdmin
      .from("ai_analyses")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert({ incident_id: incidentId, status: "PENDING" } as any)
      .select()
      .single();
    if (error) throw error;
    return toAnalysis(data as Record<string, unknown>);
  },

  async findByIncident(incidentId: string): Promise<AiAnalysis | null> {
    const { data, error } = await supabaseAdmin
      .from("ai_analyses")
      .select("*")
      .eq("incident_id", incidentId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data ? toAnalysis(data as Record<string, unknown>) : null;
  },

  async findById(id: string): Promise<AiAnalysis | null> {
    const { data, error } = await supabaseAdmin
      .from("ai_analyses")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? toAnalysis(data as Record<string, unknown>) : null;
  },

  async updateProcessing(id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from("ai_analyses")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ status: "PROCESSING", updated_at: new Date().toISOString() } as any)
      .eq("id", id);
    if (error) throw error;
  },

  async updateCompleted(id: string, result: ModelResponse, modelName: string, durationMs: number): Promise<void> {
    const { error } = await supabaseAdmin
      .from("ai_analyses")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({
        status: "COMPLETED",
        model_name: modelName,
        summary: result.summary,
        probable_cause: result.probable_cause,
        severity: result.severity,
        confidence: result.confidence,
        evidence: result.evidence,
        impact: result.impact,
        recommended_actions: result.recommended_actions,
        recommendation: result.recommendation,
        rollback_recommended: result.rollback_recommended,
        rollback_reason: result.rollback_reason,
        missing_information: result.missing_information,
        processing_duration_ms: durationMs,
        error_message: null,
        updated_at: new Date().toISOString(),
      } as any)
      .eq("id", id);
    if (error) throw error;
  },

  async updateFailed(id: string, errorMessage: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from("ai_analyses")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({
        status: "FAILED",
        error_message: errorMessage,
        updated_at: new Date().toISOString(),
      } as any)
      .eq("id", id);
    if (error) throw error;
  },
};
