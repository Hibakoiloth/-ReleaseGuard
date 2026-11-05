import { beforeEach, describe, expect, it, vi } from "vitest";
import { projectService } from "./project.service";
import { NotFoundError, ValidationError } from "../../shared/errors";
import type { Project } from "./project.types";

vi.mock("./project.repository", () => ({
  projectRepository: {
    findAll: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

import { projectRepository } from "./project.repository";

const OWNER = "user-123";

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "proj-1",
    ownerId: OWNER,
    name: "Test",
    description: null,
    repositoryUrl: "https://github.com/test/test",
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

const validInput = {
  name: "Test",
  repositoryUrl: "https://github.com/test/test",
  buildCommand: "npm run build",
  testCommand: "npm test",
  dockerfilePath: "Dockerfile",
  healthCheckPath: "/health",
};

describe("projectService", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("create", () => {
    it("creates a project with ACTIVE status", async () => {
      vi.mocked(projectRepository.create).mockResolvedValue(makeProject());
      const project = await projectService.create(validInput, OWNER);
      expect(project.status).toBe("ACTIVE");
      expect(project.id).toBeDefined();
    });

    it("throws ValidationError for empty name", async () => {
      await expect(
        projectService.create({ ...validInput, name: "" }, OWNER)
      ).rejects.toThrow(ValidationError);
    });

    it("throws ValidationError for invalid repository URL", async () => {
      await expect(
        projectService.create({ ...validInput, repositoryUrl: "not-a-url" }, OWNER)
      ).rejects.toThrow(ValidationError);
    });

    it("throws ValidationError for unsafe build command", async () => {
      await expect(
        projectService.create({ ...validInput, buildCommand: "rm -rf /" }, OWNER)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("get", () => {
    it("returns project by id", async () => {
      vi.mocked(projectRepository.findById).mockResolvedValue(makeProject());
      const found = await projectService.get("proj-1", OWNER);
      expect(found.id).toBe("proj-1");
    });

    it("throws NotFoundError for nonexistent id", async () => {
      vi.mocked(projectRepository.findById).mockResolvedValue(null);
      await expect(projectService.get("missing", OWNER)).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe("archive — state transition", () => {
    it("transitions an ACTIVE project to ARCHIVED", async () => {
      vi.mocked(projectRepository.findById).mockResolvedValue(makeProject());
      vi.mocked(projectRepository.update).mockResolvedValue(
        makeProject({ status: "ARCHIVED" })
      );
      const result = await projectService.archive("proj-1", OWNER);
      expect(result.status).toBe("ARCHIVED");
    });

    it("throws ValidationError when archiving an already-archived project", async () => {
      vi.mocked(projectRepository.findById).mockResolvedValue(
        makeProject({ status: "ARCHIVED" })
      );
      await expect(projectService.archive("proj-1", OWNER)).rejects.toThrow(
        ValidationError
      );
    });

    it("throws NotFoundError for nonexistent project", async () => {
      vi.mocked(projectRepository.findById).mockResolvedValue(null);
      await expect(projectService.archive("nonexistent", OWNER)).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe("remove", () => {
    it("removes an existing project", async () => {
      vi.mocked(projectRepository.delete).mockResolvedValue(true);
      await expect(projectService.remove("proj-1", OWNER)).resolves.toBeUndefined();
    });

    it("throws NotFoundError when removing nonexistent project", async () => {
      vi.mocked(projectRepository.delete).mockResolvedValue(false);
      await expect(projectService.remove("missing", OWNER)).rejects.toThrow(
        NotFoundError
      );
    });
  });
});
