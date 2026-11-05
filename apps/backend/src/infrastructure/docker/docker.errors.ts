import { AppError } from "../../shared/errors";

export class DockerBuildError extends AppError {
  constructor(message: string) {
    super(500, `Docker image build failed: ${message}`, "DOCKER_BUILD_ERROR");
  }
}

export class DockerStartError extends AppError {
  constructor(message: string) {
    super(500, `Docker container start failed: ${message}`, "DOCKER_START_ERROR");
  }
}

export class DockerHealthCheckError extends AppError {
  constructor(path: string, attempts: number) {
    super(
      500,
      `Health check failed at ${path} after ${attempts} attempts`,
      "DOCKER_HEALTH_CHECK_ERROR"
    );
  }
}

export class DockerInspectError extends AppError {
  constructor(containerId: string) {
    super(500, `Failed to inspect container ${containerId}`, "DOCKER_INSPECT_ERROR");
  }
}
