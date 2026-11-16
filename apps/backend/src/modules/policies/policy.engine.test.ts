import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../infrastructure/supabase/supabase.client", () => ({
  supabaseAdmin: { from: vi.fn() },
}));

vi.mock("./policy.repository", () => ({
  policyRepository: { findByProject: vi.fn() },
}));

vi.mock("./recovery-action.repository", () => ({
  recoveryActionRepository: {
    findActiveByIncident: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("../approvals/approval.repository", () => ({
  approvalRepository: { create: vi.fn() },
}));

vi.mock("../../infrastructure/logging/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn() },
}));

// Dynamic import of rollback.service is used inside policy.engine — mock it
vi.mock("../rollback/rollback.service", () => ({
  rollbackService: { execute: vi.fn().mockResolvedValue(undefined) },
}));

import { policyEngine } from "./policy.engine";
import { policyRepository } from "./policy.repository";
import { recoveryActionRepository } from "./recovery-action.repository";
import { approvalRepository } from "../approvals/approval.repository";
import type { Policy } from "./policy.types";

function makePolicy(overrides: Partial<Policy> = {}): Policy {
  return {
    id: "pol-1",
    projectId: "proj-1",
    name: "Auto-rollback",
    action: "ROLLBACK",
    conditions: { event: "HEALTH_CHECK_FAILED", requireApproval: false },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

const ctx = { projectId: "proj-1", incidentId: "inc-1", deploymentId: "dep-1" };

const recoveryAction = {
  id: "ra-1",
  incidentId: "inc-1",
  deploymentId: "dep-1",
  actionType: "ROLLBACK",
  status: "PENDING" as const,
  reason: null,
  metadata: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(recoveryActionRepository.findActiveByIncident).mockResolvedValue(null);
  vi.mocked(recoveryActionRepository.create).mockResolvedValue(recoveryAction);
  vi.mocked(approvalRepository.create).mockResolvedValue({
    id: "appr-1",
    recoveryActionId: "ra-1",
    decision: "PENDING",
    approvedBy: null,
    createdAt: new Date().toISOString(),
  });
});

describe("policyEngine.evaluate", () => {
  it("does nothing when no matching policies", async () => {
    vi.mocked(policyRepository.findByProject).mockResolvedValue([]);

    await policyEngine.evaluate("HEALTH_CHECK_FAILED", ctx);

    expect(recoveryActionRepository.create).not.toHaveBeenCalled();
  });

  it("skips when an active recovery action already exists (idempotency)", async () => {
    vi.mocked(policyRepository.findByProject).mockResolvedValue([makePolicy()]);
    vi.mocked(recoveryActionRepository.findActiveByIncident).mockResolvedValue(recoveryAction);

    await policyEngine.evaluate("HEALTH_CHECK_FAILED", ctx);

    expect(recoveryActionRepository.create).not.toHaveBeenCalled();
  });

  it("creates a PENDING recovery action for ROLLBACK policy without approval", async () => {
    vi.mocked(policyRepository.findByProject).mockResolvedValue([makePolicy()]);

    await policyEngine.evaluate("HEALTH_CHECK_FAILED", ctx);

    expect(recoveryActionRepository.create).toHaveBeenCalledWith(
      "inc-1",
      "dep-1",
      "ROLLBACK",
      "PENDING",
      expect.stringContaining("Auto-rollback")
    );
    expect(approvalRepository.create).not.toHaveBeenCalled();
  });

  it("creates PENDING_APPROVAL action and approval record when requireApproval is true", async () => {
    vi.mocked(policyRepository.findByProject).mockResolvedValue([
      makePolicy({ conditions: { event: "HEALTH_CHECK_FAILED", requireApproval: true } }),
    ]);

    await policyEngine.evaluate("HEALTH_CHECK_FAILED", ctx);

    expect(recoveryActionRepository.create).toHaveBeenCalledWith(
      "inc-1",
      "dep-1",
      "ROLLBACK",
      "PENDING_APPROVAL",
      expect.any(String)
    );
    expect(approvalRepository.create).toHaveBeenCalledWith("ra-1");
  });

  it("only matches policies for the correct event", async () => {
    vi.mocked(policyRepository.findByProject).mockResolvedValue([
      makePolicy({ conditions: { event: "BUILD_FAILED" } }),
    ]);

    await policyEngine.evaluate("HEALTH_CHECK_FAILED", ctx);

    expect(recoveryActionRepository.create).not.toHaveBeenCalled();
  });

  it("does not throw on repository error — swallows and logs", async () => {
    vi.mocked(policyRepository.findByProject).mockRejectedValue(new Error("DB error"));

    await expect(policyEngine.evaluate("HEALTH_CHECK_FAILED", ctx)).resolves.toBeUndefined();
  });
});
