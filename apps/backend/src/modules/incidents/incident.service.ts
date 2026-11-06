import { incidentRepository } from "./incident.repository";
import { aiAnalysisService } from "../ai-analysis/ai-analysis.service";
import type { Incident } from "./incident.types";

export const incidentService = {
  async open(
    deploymentId: string,
    description: string
  ): Promise<Incident> {
    const incident = await incidentRepository.create(
      deploymentId,
      "APPLICATION_UNAVAILABLE",
      "HIGH",
      description
    );
    setImmediate(() => {
      aiAnalysisService.analyzeIncident(incident.id).catch(() => {});
    });
    return incident;
  },

  async list(deploymentId: string): Promise<Incident[]> {
    return incidentRepository.findByDeployment(deploymentId);
  },
};
