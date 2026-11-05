import { releaseRepository } from "./release.repository";
import { projectService } from "../projects/project.service";
import { createReleaseSchema } from "./release.schema";
import { NotFoundError, ValidationError } from "../../shared/errors";
import type { Release } from "./release.types";

export const releaseService = {
  async list(projectId: string, ownerId: string): Promise<Release[]> {
    await projectService.get(projectId, ownerId);
    return releaseRepository.findAll(projectId);
  },

  async get(id: string, projectId: string, ownerId: string): Promise<Release> {
    await projectService.get(projectId, ownerId);
    const release = await releaseRepository.findById(id, projectId);
    if (!release) throw new NotFoundError("Release");
    return release;
  },

  async create(
    input: unknown,
    projectId: string,
    ownerId: string
  ): Promise<Release> {
    await projectService.get(projectId, ownerId);
    const result = createReleaseSchema.safeParse(input);
    if (!result.success) {
      throw new ValidationError(result.error.errors[0].message);
    }
    return releaseRepository.create({ ...result.data, projectId });
  },

  async start(
    id: string,
    projectId: string,
    ownerId: string
  ): Promise<Release> {
    const release = await this.get(id, projectId, ownerId);
    if (release.status !== "CREATED") {
      throw new ValidationError(
        `Release cannot be started from status: ${release.status}`
      );
    }
    const updated = await releaseRepository.updateStatus(
      id,
      projectId,
      "BUILDING"
    );
    if (!updated) throw new NotFoundError("Release");
    return updated;
  },
};
