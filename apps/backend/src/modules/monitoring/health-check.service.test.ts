import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { healthCheckService } from "./health-check.service";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("healthCheckService.check", () => {
  it("returns healthy=true and statusCode for HTTP 200", async () => {
    mockFetch.mockResolvedValue({ status: 200, ok: true });

    const result = await healthCheckService.check("http://localhost:3000/health");

    expect(result.healthy).toBe(true);
    expect(result.statusCode).toBe(200);
    expect(result.errorMessage).toBeNull();
    expect(result.responseTimeMs).toBeGreaterThanOrEqual(0);
  });

  it("returns healthy=false and error message for HTTP 500", async () => {
    mockFetch.mockResolvedValue({ status: 500, ok: false });

    const result = await healthCheckService.check("http://localhost:3000/health");

    expect(result.healthy).toBe(false);
    expect(result.statusCode).toBe(500);
    expect(result.errorMessage).toBe("HTTP 500");
  });

  it("returns healthy=false when fetch throws a network error", async () => {
    mockFetch.mockRejectedValue(new Error("ECONNREFUSED"));

    const result = await healthCheckService.check("http://localhost:3000/health");

    expect(result.healthy).toBe(false);
    expect(result.statusCode).toBeNull();
    expect(result.errorMessage).toContain("ECONNREFUSED");
  });
});
