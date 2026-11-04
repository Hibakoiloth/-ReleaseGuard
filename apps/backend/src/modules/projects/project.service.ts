import { projectRepository } from "./project.repository";
import {
  createProjectSchema,
  updateProjectSchema,
} from "./project.schema";
import { NotFoundError, ValidationError } from "../../shared/errors";
import type { Project, UpdateProjectInput } from "./project.types";

export const projectService = {
  list(): Project[] {
    return projectRepository.findAll();
  },

  get(id: string): Project {
    const project = projectRepository.findById(id);
    if (!project) throw new NotFoundError("Project");
    return project;
  },

  create(input: unknown): Project {
    const result = createProjectSchema.safeParse(input);
    if (!result.success) {
      throw new ValidationError(result.error.errors[0].message);
    }
    return projectRepository.create(result.data);
  },

  update(id: string, input: unknown): Project {
    const result = updateProjectSchema.safeParse(input);
    if (!result.success) {
      throw new ValidationError(result.error.errors[0].message);
    }
    const project = projectRepository.findById(id);
    if (!project) throw new NotFoundError("Project");
    return projectRepository.update(id, result.data as UpdateProjectInput)!;
  },

  remove(id: string): void {
    const project = projectRepository.findById(id);
    if (!project) throw new NotFoundError("Project");
    projectRepository.delete(id);
  },

  archive(id: string): Project {
    const project = projectRepository.findById(id);
    if (!project) throw new NotFoundError("Project");
    if (project.status === "ARCHIVED") {
      throw new ValidationError("Project is already archived");
    }
    return projectRepository.update(id, { status: "ARCHIVED" })!;
  },
};
