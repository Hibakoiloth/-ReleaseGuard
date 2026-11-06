import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../infrastructure/supabase/supabase.client", () => ({
  supabaseAdmin: { from: vi.fn(), auth: { getUser: vi.fn() } },
}));

vi.mock("../monitoring/monitoring.repository", () => ({
  monitoringRepository: { findRecent: vi.fn() },
}));

vi.mock("./incident.repository", () => ({
  incidentRepository: {
    findOpenByDeployment: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("./incident.service", () => ({
  incidentService: { open: vi.fn() },
}));

vi.mock("../../infrastructure/logging/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn() },
}));

import { incidentDetector } from "./incident.detector";
import { monitoringRepository } from "../monitoring/monitoring.repository";
import { incidentRepository } from "./incident.repository";
import { incidentService } from "./incident.service";
import type { MonitoringRecord } from "../monitoring/monitoring.types";

function makeRecords(statuses: Array<"HEALTHY" | "UNHEALTHY">): MonitoringRecord[] {
  return statuses.map((status, i) => ({
    id: `rec-${i}`,
    deploymentId: "dep-1",
    status,
    responseTimeMs: 100,
    errorMessage: status === "UNHEALTHY" ? "HTTP 500" : null,
    recordedAt: new Date().toISOString(),
  }));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(incidentRepository.findOpenByDeployment).mockResolvedValue(null);
  vi.mocked(incidentService.open).mockResolvedValue({
    id: "inc-1",
    deploymentId: "dep-1",
    type: "APPLICATION_UNAVAILABLE",
    severity: "HIGH",
    status: "OPEN",
    description: "...",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
});

describe("incidentDetector.evaluate", () => {
  it("does not create incident when fewer than 3 consecutive failures", async () => {
    vi.mocked(monitoringRepository.findRecent).mockResolvedValue(
      makeRecords(["UNHEALTHY", "UNHEALTHY", "HEALTHY"])
    );

    await incidentDetector.evaluate("dep-1");

    expect(incidentService.open).not.toHaveBeenCalled();
  });

  it("creates incident after exactly 3 consecutive failures", async () => {
    vi.mocked(monitoringRepository.findRecent).mockResolvedValue(
      makeRecords(["UNHEALTHY", "UNHEALTHY", "UNHEALTHY", "HEALTHY", "HEALTHY"])
    );

    await incidentDetector.evaluate("dep-1");

    expect(incidentService.open).toHaveBeenCalledWith("dep-1", expect.any(String));
  });

  it("does not create a duplicate incident if one is already OPEN", async () => {
    vi.mocked(monitoringRepository.findRecent).mockResolvedValue(
      makeRecords(["UNHEALTHY", "UNHEALTHY", "UNHEALTHY"])
    );
    vi.mocked(incidentRepository.findOpenByDeployment).mockResolvedValue({
      id: "existing-inc",
      deploymentId: "dep-1",
      type: "APPLICATION_UNAVAILABLE",
      severity: "HIGH",
      status: "OPEN",
      description: "already open",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await incidentDetector.evaluate("dep-1");

    expect(incidentService.open).not.toHaveBeenCalled();
  });

  it("does not create incident when fewer than threshold records exist", async () => {
    vi.mocked(monitoringRepository.findRecent).mockResolvedValue(
      makeRecords(["UNHEALTHY", "UNHEALTHY"])
    );

    await incidentDetector.evaluate("dep-1");

    expect(incidentService.open).not.toHaveBeenCalled();
  });
});
