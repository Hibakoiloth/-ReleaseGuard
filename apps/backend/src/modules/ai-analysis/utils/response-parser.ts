import { z } from "zod";
import type { ModelResponse } from "../ai-analysis.types";

const ModelResponseSchema = z.object({
  summary: z.string(),
  probable_cause: z.string(),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  confidence: z.number().min(0).max(1),
  evidence: z.array(z.string()),
  impact: z.string(),
  recommended_actions: z.array(z.string()),
  recommendation: z.string(),
  rollback_recommended: z.boolean(),
  rollback_reason: z.string().nullable(),
  missing_information: z.array(z.string()),
});

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    return text.slice(start, end + 1);
  }

  return text.trim();
}

export function parseModelResponse(rawContent: string): ModelResponse {
  const jsonStr = extractJson(rawContent);

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    const cleaned = jsonStr
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, " ")
      .replace(/,(\s*[}\]])/g, "$1");
    parsed = JSON.parse(cleaned);
  }

  return ModelResponseSchema.parse(parsed);
}
