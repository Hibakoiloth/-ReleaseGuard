import { beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../../app";
import { projectRepository } from "./project.repository";

describe("project routes", () => {
  beforeEach(() => {
    projectRepository.clear();
  });

  it("GET /api/projects returns empty array initially", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: "/api/projects" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
  });

  it("POST /api/projects creates a project and returns 201", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/projects",
      payload: { name: "MyApp", repositoryUrl: "https://github.com/org/myapp" },
    });
    expect(res.statusCode).toBe(201);
    const project = res.json<{ name: string; status: string }>();
    expect(project.name).toBe("MyApp");
    expect(project.status).toBe("ACTIVE");
  });

  it("POST /api/projects returns 400 for missing name", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/projects",
      payload: { repositoryUrl: "https://github.com/org/myapp" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("POST /api/projects returns 400 for invalid repository URL", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/projects",
      payload: { name: "MyApp", repositoryUrl: "not-a-url" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("GET /api/projects/:id returns 404 for nonexistent project", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/projects/nonexistent-id",
    });
    expect(res.statusCode).toBe(404);
  });

  it("DELETE /api/projects/:id returns 204 on success", async () => {
    const app = await buildApp();
    const createRes = await app.inject({
      method: "POST",
      url: "/api/projects",
      payload: { name: "ToDelete", repositoryUrl: "https://github.com/org/del" },
    });
    const { id } = createRes.json<{ id: string }>();
    const deleteRes = await app.inject({
      method: "DELETE",
      url: `/api/projects/${id}`,
    });
    expect(deleteRes.statusCode).toBe(204);
  });

  it("POST /api/projects/:id/archive returns archived project", async () => {
    const app = await buildApp();
    const createRes = await app.inject({
      method: "POST",
      url: "/api/projects",
      payload: { name: "ToArchive", repositoryUrl: "https://github.com/org/arc" },
    });
    const { id } = createRes.json<{ id: string }>();
    const archiveRes = await app.inject({
      method: "POST",
      url: `/api/projects/${id}/archive`,
    });
    expect(archiveRes.statusCode).toBe(200);
    expect(archiveRes.json<{ status: string }>().status).toBe("ARCHIVED");
  });
});
