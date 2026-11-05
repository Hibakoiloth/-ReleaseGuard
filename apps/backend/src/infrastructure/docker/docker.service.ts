import { dockerClient } from "./docker.client";
import { DockerHealthCheckError } from "./docker.errors";
import type { ContainerInfo } from "./docker.types";

const HEALTH_CHECK_ATTEMPTS = 10;
const HEALTH_CHECK_DELAY_MS = 3000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const dockerService = {
  async buildAndDeploy(
    contextPath: string,
    dockerfilePath: string,
    imageTag: string,
    releaseId: string
  ): Promise<ContainerInfo> {
    await dockerClient.buildImage({ contextPath, dockerfilePath, tag: imageTag });

    const containerInfo = await dockerClient.startContainer({
      imageTag,
      releaseId,
    });

    return containerInfo;
  },

  async checkHealth(hostPort: number, healthPath: string): Promise<void> {
    const url = `http://127.0.0.1:${hostPort}${healthPath}`;

    for (let attempt = 1; attempt <= HEALTH_CHECK_ATTEMPTS; attempt++) {
      try {
        const res = await fetch(url);
        if (res.ok) return;
      } catch {
        // not ready yet
      }
      if (attempt < HEALTH_CHECK_ATTEMPTS) await sleep(HEALTH_CHECK_DELAY_MS);
    }

    throw new DockerHealthCheckError(healthPath, HEALTH_CHECK_ATTEMPTS);
  },

  async stop(containerId: string): Promise<void> {
    await dockerClient.stopContainer(containerId);
  },
};
