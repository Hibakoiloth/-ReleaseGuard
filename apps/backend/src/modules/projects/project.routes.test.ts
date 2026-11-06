import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../../app";
import type { Project } from "./project.types";

vi.mock("../../infrastructure/supabase/supabase.client", () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

vi.mock("../auth/auth.repository", () => ({
  authRepository: {
    findSessionUser: vi.fn(),
  },
}));

vi.mock("./project.repository", () => ({
  projectRepository: {
    findAll: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

import { authRepository } from "../auth/auth.repository";
import { projectRepository } from "./project.repository";

const AUTH = { authorization: "Bearer test-token" };
const TEST_USER = { id: "user-123", username: "testuser" };

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "proj-1",
    ownerId: "user-123",
    name: "MyApp",
    description: null,
    repositoryUrl: "https://github.com/org/myapp",
    buildCommand: "npm run build",
    testCommand: "npm test",
    dockerfilePath: "Dockerfile",
    healthCheckPath: "/health",
    status: "ACTIVE",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("project routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authRepository.findSessionUser).mockResolvedValue(TEST_USER);
  });

  it("GET /api/projects returns empty array", async () => {
    vi.mocked(projectRepository.findAll).mockResolvedValue([]);
    const app = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/projects",
      headers: AUTH,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
  });

  it("POST /api/projects creates a project and returns 201", async () => {
    vi.mocked(projectRepository.create).mockResolvedValue(makeProject());
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/projects",
      headers: AUTH,
      payload: {
        name: "MyApp",
        repositoryUrl: "https://github.com/org/myapp",
        buildCommand: "npm run build",
        testCommand: "npm test",
        dockerfilePath: "Dockerfile",
        healthCheckPath: "/health",
      },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json<{ name: string }>().name).toBe("MyApp");
  });

  it("POST /api/projects returns 400 for missing name", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/projects",
      headers: AUTH,
      payload: {
        repositoryUrl: "https://github.com/org/myapp",
        buildCommand: "npm run build",
        testCommand: "npm test",
        dockerfilePath: "Dockerfile",
        healthCheckPath: "/health",
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it("GET /api/projects/:id returns 404 for nonexistent project", async () => {
    vi.mocked(projectRepository.findById).mockResolvedValue(null);
    const app = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/projects/nonexistent-id",
      headers: AUTH,
    });
    expect(res.statusCode).toBe(404);
  });

  it("DELETE /api/projects/:id returns 204 on success", async () => {
    vi.mocked(projectRepository.delete).mockResolvedValue(true);
    const app = await buildApp();
    const res = await app.inject({
      method: "DELETE",
      url: "/api/projects/proj-1",
      headers: AUTH,
    });
    expect(res.statusCode).toBe(204);
  });

  it("POST /api/projects/:id/archive returns archived project", async () => {
    vi.mocked(projectRepository.findById).mockResolvedValue(makeProject());
    vi.mocked(projectRepository.update).mockResolvedValue(
      makeProject({ status: "ARCHIVED" })
    );
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/projects/proj-1/archive",
      headers: AUTH,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json<{ status: string }>().status).toBe("ARCHIVED");
  });

  it("returns 401 when no Authorization header", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: "/api/projects" });
    expect(res.statusCode).toBe(401);
  });
});
