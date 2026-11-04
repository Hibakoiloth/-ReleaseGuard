import { describe, expect, it } from "vitest";
import { buildApp } from "./app";

describe("health endpoint", () => {
  it("returns status ok with timestamp", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ status: string; timestamp: string }>();
    expect(body.status).toBe("ok");
    expect(body.timestamp).toBeDefined();
  });
});

describe("error handling", () => {
  it("returns 404 JSON for unknown routes", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: "/does-not-exist" });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toHaveProperty("message");
  });
});
