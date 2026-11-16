import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../infrastructure/supabase/supabase.client", () => ({
  supabaseAdmin: { from: vi.fn() },
}));

vi.mock("./approval.repository", () => ({
  approvalRepository: {
    findById: vi.fn(),
    findPending: vi.fn(),
    findHistory: vi.fn(),
    decide: vi.fn(),
  },
}));

vi.mock("../policies/recovery-action.repository", () => ({
  recoveryActionRepository: {
    findById: vi.fn(),
    updateStatus: vi.fn(),
  },
}));

vi.mock("../ai-analysis/ai-analysis.repository", () => ({
  aiAnalysisRepository: { findByIncident: vi.fn() },
}));

vi.mock("../rollback/rollback.service", () => ({
  rollbackService: { execute: vi.fn() },
}));

vi.mock("../../infrastructure/logging/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn() },
}));

import { approvalService } from "./approval.service";
import { approvalRepository } from "./approval.repository";
import { recoveryActionRepository } from "../policies/recovery-action.repository";
import type { Approval, RecoveryAction } from "../policies/policy.types";

function makeApproval(overrides: Partial<Approval> = {}): Approval {
  return {
    id: "appr-1",
    recoveryActionId: "ra-1",
    decision: "PENDING",
    approvedBy: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeRecoveryAction(overrides: Partial<RecoveryAction> = {}): RecoveryAction {
  return {
    id: "ra-1",
    incidentId: "inc-1",
    deploymentId: "dep-1",
    actionType: "ROLLBACK",
    status: "PENDING_APPROVAL",
    reason: null,
    metadata: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(approvalRepository.findById).mockResolvedValue(makeApproval());
  vi.mocked(recoveryActionRepository.findById).mockResolvedValue(makeRecoveryAction());
  vi.mocked(approvalRepository.decide).mockResolvedValue(makeApproval({ decision: "APPROVED" }));
  vi.mocked(recoveryActionRepository.updateStatus).mockResolvedValue(undefined);
});

describe("approvalService.approve", () => {
  it("throws when approval not found", async () => {
    vi.mocked(approvalRepository.findById).mockResolvedValue(null);
    // verifyApprovalOwnership queries supabaseAdmin; mock it to return false → throws
    const { supabaseAdmin } = await import("../../infrastructure/supabase/supabase.client");
    vi.mocked(supabaseAdmin.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    } as never);
    await expect(approvalService.approve("appr-1", "user-1")).rejects.toThrow();
  });

  it("throws when approval already decided", async () => {
    vi.mocked(approvalRepository.findById).mockResolvedValue(makeApproval({ decision: "APPROVED" }));
    const { supabaseAdmin } = await import("../../infrastructure/supabase/supabase.client");
    vi.mocked(supabaseAdmin.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    } as never);
    await expect(approvalService.approve("appr-1", "user-1")).rejects.toThrow();
  });

  it("throws when user does not own the project", async () => {
    const { supabaseAdmin } = await import("../../infrastructure/supabase/supabase.client");
    vi.mocked(supabaseAdmin.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    } as never);
    await expect(approvalService.approve("appr-1", "wrong-user")).rejects.toThrow("Not authorized");
  });
});

describe("approvalService.reject", () => {
  it("throws when user does not own the project", async () => {
    const { supabaseAdmin } = await import("../../infrastructure/supabase/supabase.client");
    vi.mocked(supabaseAdmin.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    } as never);
    await expect(approvalService.reject("appr-1", "wrong-user")).rejects.toThrow("Not authorized");
  });

  it("throws when approval already decided", async () => {
    vi.mocked(approvalRepository.findById).mockResolvedValue(makeApproval({ decision: "REJECTED" }));
    const { supabaseAdmin } = await import("../../infrastructure/supabase/supabase.client");
    vi.mocked(supabaseAdmin.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    } as never);
    await expect(approvalService.reject("appr-1", "user-1")).rejects.toThrow();
  });
});

describe("approvalService.getDetail", () => {
  it("returns null when approval not found", async () => {
    vi.mocked(approvalRepository.findById).mockResolvedValue(null);
    const result = await approvalService.getDetail("nonexistent");
    expect(result).toBeNull();
  });

  it("returns enriched detail with recovery action", async () => {
    const { aiAnalysisRepository } = await import("../ai-analysis/ai-analysis.repository");
    vi.mocked(aiAnalysisRepository.findByIncident).mockResolvedValue(null);

    const result = await approvalService.getDetail("appr-1");
    expect(result).not.toBeNull();
    expect(result?.approval.id).toBe("appr-1");
    expect(result?.recoveryAction.id).toBe("ra-1");
    expect(result?.aiAnalysis).toBeNull();
  });
});
