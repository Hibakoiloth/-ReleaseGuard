import { incidentRepository } from "./incident.repository";
import type { Incident } from "./incident.types";

export const incidentService = {
  async open(
    deploymentId: string,
    description: string
  ): Promise<Incident> {
    return incidentRepository.create(
      deploymentId,
      "APPLICATION_UNAVAILABLE",
      "HIGH",
      description
    );
  },

  async list(deploymentId: string): Promise<Incident[]> {
    return incidentRepository.findByDeployment(deploymentId);
  },
};
