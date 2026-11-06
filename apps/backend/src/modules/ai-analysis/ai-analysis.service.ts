import { config } from "../../infrastructure/config";
import { aiAnalysisRepository } from "./ai-analysis.repository";
import { ollamaProvider } from "./providers/ollama.provider";
import { collectContext } from "./utils/context-collector";
import { buildPrompt } from "./prompts/prompt-builder";
import { parseModelResponse } from "./utils/response-parser";
import { logger } from "../../infrastructure/logging/logger";
import type { AiAnalysis } from "./ai-analysis.types";

export const aiAnalysisService = {
  async analyzeIncident(incidentId: string): Promise<void> {
    const existing = await aiAnalysisRepository.findByIncident(incidentId).catch(() => null);
    if (existing && (existing.status === "PENDING" || existing.status === "PROCESSING")) {
      return;
    }

    let analysisId: string | null = null;
    try {
      const analysis = await aiAnalysisRepository.create(incidentId);
      analysisId = analysis.id;

      const available = await ollamaProvider.checkAvailability();
      if (!available) {
        await aiAnalysisRepository.updateFailed(analysisId, "Ollama is not available at " + config.ollamaBaseUrl);
        return;
      }

      const modelOk = await ollamaProvider.checkModel(config.ollamaModel);
      if (!modelOk) {
        await aiAnalysisRepository.updateFailed(analysisId, `Model ${config.ollamaModel} not found in Ollama`);
        return;
      }

      await aiAnalysisRepository.updateProcessing(analysisId);

      const ctx = await collectContext(incidentId);
      const { system, user } = buildPrompt(ctx);

      const startMs = Date.now();
      const rawContent = await ollamaProvider.chat(
        config.ollamaModel,
        [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        config.ollamaTimeoutMs
      );
      const durationMs = Date.now() - startMs;

      const result = parseModelResponse(rawContent);
      await aiAnalysisRepository.updateCompleted(analysisId, result, config.ollamaModel, durationMs);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(err, "AI analysis failed for incident %s", incidentId);
      if (analysisId) {
        await aiAnalysisRepository.updateFailed(analysisId, msg).catch(() => {});
      }
    }
  },

  async triggerReanalysis(incidentId: string): Promise<void> {
    const existing = await aiAnalysisRepository.findByIncident(incidentId).catch(() => null);
    if (existing && (existing.status === "PENDING" || existing.status === "PROCESSING")) {
      return;
    }

    let analysisId: string | null = null;
    try {
      const analysis = await aiAnalysisRepository.create(incidentId);
      analysisId = analysis.id;

      const available = await ollamaProvider.checkAvailability();
      if (!available) {
        await aiAnalysisRepository.updateFailed(analysisId, "Ollama is not available at " + config.ollamaBaseUrl);
        return;
      }

      const modelOk = await ollamaProvider.checkModel(config.ollamaModel);
      if (!modelOk) {
        await aiAnalysisRepository.updateFailed(analysisId, `Model ${config.ollamaModel} not found in Ollama`);
        return;
      }

      await aiAnalysisRepository.updateProcessing(analysisId);

      const ctx = await collectContext(incidentId);
      const { system, user } = buildPrompt(ctx);

      const startMs = Date.now();
      const rawContent = await ollamaProvider.chat(
        config.ollamaModel,
        [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        config.ollamaTimeoutMs
      );
      const durationMs = Date.now() - startMs;

      const result = parseModelResponse(rawContent);
      await aiAnalysisRepository.updateCompleted(analysisId, result, config.ollamaModel, durationMs);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(err, "AI re-analysis failed for incident %s", incidentId);
      if (analysisId) {
        await aiAnalysisRepository.updateFailed(analysisId, msg).catch(() => {});
      }
    }
  },

  async getByIncident(incidentId: string): Promise<AiAnalysis | null> {
    return aiAnalysisRepository.findByIncident(incidentId);
  },
};
