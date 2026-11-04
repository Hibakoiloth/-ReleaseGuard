import { beforeEach, describe, expect, it } from "vitest";
import { projectService } from "./project.service";
import { projectRepository } from "./project.repository";
import { NotFoundError, ValidationError } from "../../shared/errors";

const validInput = {
  name: "Test",
  repositoryUrl: "https://github.com/test/test",
};

describe("projectService", () => {
  beforeEach(() => {
    projectRepository.clear();
  });

  describe("create", () => {
    it("creates a project with ACTIVE status and generated id", () => {
      const project = projectService.create(validInput);
      expect(project.status).toBe("ACTIVE");
      expect(project.id).toBeDefined();
      expect(project.createdAt).toBeDefined();
    });

    it("throws ValidationError for empty name", () => {
      expect(() =>
        projectService.create({ ...validInput, name: "" })
      ).toThrow(ValidationError);
    });

    it("throws ValidationError for invalid repository URL", () => {
      expect(() =>
        projectService.create({ ...validInput, repositoryUrl: "not-a-url" })
      ).toThrow(ValidationError);
    });
  });

  describe("get", () => {
    it("returns project by id", () => {
      const created = projectService.create(validInput);
      const found = projectService.get(created.id);
      expect(found.id).toBe(created.id);
    });

    it("throws NotFoundError for nonexistent id", () => {
      expect(() => projectService.get("missing")).toThrow(NotFoundError);
    });
  });

  describe("archive — state transition", () => {
    it("transitions an ACTIVE project to ARCHIVED", () => {
      const project = projectService.create(validInput);
      expect(project.status).toBe("ACTIVE");
      const archived = projectService.archive(project.id);
      expect(archived.status).toBe("ARCHIVED");
    });

    it("throws ValidationError when archiving an already-archived project", () => {
      const project = projectService.create(validInput);
      projectService.archive(project.id);
      expect(() => projectService.archive(project.id)).toThrow(ValidationError);
    });

    it("throws NotFoundError for nonexistent project", () => {
      expect(() => projectService.archive("nonexistent")).toThrow(NotFoundError);
    });
  });

  describe("remove", () => {
    it("removes an existing project", () => {
      const project = projectService.create(validInput);
      projectService.remove(project.id);
      expect(() => projectService.get(project.id)).toThrow(NotFoundError);
    });

    it("throws NotFoundError when removing nonexistent project", () => {
      expect(() => projectService.remove("missing")).toThrow(NotFoundError);
    });
  });
});
