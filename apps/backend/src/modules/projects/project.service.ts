import { projectRepository } from "./project.repository";
import { createProjectSchema, updateProjectSchema } from "./project.schema";
import { NotFoundError, ValidationError } from "../../shared/errors";
import type { Project } from "./project.types";

export const projectService = {
  async list(ownerId: string): Promise<Project[]> {
    return projectRepository.findAll(ownerId);
  },

  async get(id: string, ownerId: string): Promise<Project> {
    const project = await projectRepository.findById(id, ownerId);
    if (!project) throw new NotFoundError("Project");
    return project;
  },

  async create(input: unknown, ownerId: string): Promise<Project> {
    const result = createProjectSchema.safeParse(input);
    if (!result.success) {
      throw new ValidationError(result.error.errors[0].message);
    }
    return projectRepository.create({ ...result.data, ownerId });
  },

  async update(id: string, ownerId: string, input: unknown): Promise<Project> {
    const result = updateProjectSchema.safeParse(input);
    if (!result.success) {
      throw new ValidationError(result.error.errors[0].message);
    }
    const project = await projectRepository.update(id, ownerId, result.data);
    if (!project) throw new NotFoundError("Project");
    return project;
  },

  async remove(id: string, ownerId: string): Promise<void> {
    const deleted = await projectRepository.delete(id, ownerId);
    if (!deleted) throw new NotFoundError("Project");
  },

  async archive(id: string, ownerId: string): Promise<Project> {
    const project = await projectRepository.findById(id, ownerId);
    if (!project) throw new NotFoundError("Project");
    if (project.status === "ARCHIVED") {
      throw new ValidationError("Project is already archived");
    }
    const updated = await projectRepository.update(id, ownerId, {
      status: "ARCHIVED",
    });
    if (!updated) throw new NotFoundError("Project");
    return updated;
  },
};
