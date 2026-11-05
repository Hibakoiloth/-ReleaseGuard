import { join } from "path";
import { dockerService } from "../../infrastructure/docker/docker.service";
import { deploymentRepository } from "./deployment.repository";
import { releaseRepository } from "../releases/release.repository";
import { logger } from "../../infrastructure/logging/logger";
import type { Deployment } from "./deployment.types";
import type { Project } from "../projects/project.types";

function makeImageTag(projectName: string, version: string): string {
  const slug = projectName.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  return `releaseguard/${slug}:${version}`;
}

export const deploymentService = {
  async deploy(
    releaseId: string,
    project: Project,
    version: string,
    workspacePath: string
  ): Promise<Deployment> {
    const imageTag = makeImageTag(project.name, version);
    const deployment = await deploymentRepository.create(releaseId, imageTag);

    try {
      await deploymentRepository.update(deployment.id, { status: "BUILDING_IMAGE" });

      const contextPath = workspacePath;
      const dockerfilePath = project.dockerfilePath || "Dockerfile";

      const containerInfo = await dockerService.buildAndDeploy(
        contextPath,
        dockerfilePath,
        imageTag,
        releaseId
      );

      await deploymentRepository.update(deployment.id, {
        status: "STARTING",
        containerId: containerInfo.containerId,
        hostPort: containerInfo.hostPort,
        startedAt: containerInfo.startedAt ?? new Date().toISOString(),
      });

      await releaseRepository.adminUpdateStatus(releaseId, "MONITORING");

      await dockerService.checkHealth(containerInfo.hostPort, project.healthCheckPath);

      await deploymentRepository.update(deployment.id, { status: "RUNNING" });
      await releaseRepository.adminUpdateStatus(releaseId, "SUCCESS");

      return (await deploymentRepository.findById(deployment.id, releaseId))!;
    } catch (err) {
      logger.error(err, "Deployment failed");
      await deploymentRepository
        .update(deployment.id, { status: "FAILED" })
        .catch(() => {});
      await releaseRepository.adminUpdateStatus(releaseId, "FAILED").catch(() => {});
      return (await deploymentRepository.findById(deployment.id, releaseId))!;
    }
  },

  async list(releaseId: string): Promise<Deployment[]> {
    return deploymentRepository.findAll(releaseId);
  },

  async get(id: string, releaseId: string): Promise<Deployment | null> {
    return deploymentRepository.findById(id, releaseId);
  },
};
