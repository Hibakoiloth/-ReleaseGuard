import { policyRepository } from "./policy.repository";
import { recoveryActionRepository } from "./recovery-action.repository";
import type { Policy, PolicyConditions, RecoveryAction } from "./policy.types";

export const policyService = {
  async list(projectId: string): Promise<Policy[]> {
    return policyRepository.findByProject(projectId);
  },

  async create(projectId: string, name: string, action: string, conditions: PolicyConditions): Promise<Policy> {
    return policyRepository.create(projectId, name, action, conditions);
  },

  async delete(id: string, projectId: string): Promise<void> {
    return policyRepository.delete(id, projectId);
  },

  async listRecoveryActions(incidentId: string): Promise<RecoveryAction[]> {
    return recoveryActionRepository.findByIncident(incidentId);
  },
};
