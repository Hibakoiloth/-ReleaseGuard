import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../infrastructure/supabase/supabase.client", () => ({
  supabaseAdmin: { from: vi.fn(), auth: { getUser: vi.fn() } },
}));

vi.mock("./deployment.repository", () => ({
  deploymentRepository: {
    create: vi.fn(),
    update: vi.fn(),
    findById: vi.fn(),
    findAll: vi.fn(),
  },
}));

vi.mock("../releases/release.repository", () => ({
  releaseRepository: { adminUpdateStatus: vi.fn() },
}));

vi.mock("../../infrastructure/docker/docker.service", () => ({
  dockerService: {
    buildAndDeploy: vi.fn(),
    checkHealth: vi.fn(),
    stop: vi.fn(),
  },
}));

vi.mock("../../infrastructure/logging/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn() },
}));

import { deploymentService } from "./deployment.service";
import { deploymentRepository } from "./deployment.repository";
import { releaseRepository } from "../releases/release.repository";
import { dockerService } from "../../infrastructure/docker/docker.service";
import type { Deployment } from "./deployment.types";
import type { Project } from "../projects/project.types";

function makeDeployment(overrides: Partial<Deployment> = {}): Deployment {
  return {
    id: "dep-1",
    releaseId: "release-1",
    imageTag: "releaseguard/myapp:1.0.0",
    containerId: null,
    hostPort: null,
    status: "PENDING",
    startedAt: null,
    stoppedAt: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

const project: Project = {
  id: "proj-1",
  ownerId: "user-1",
  name: "My App",
  description: null,
  repositoryUrl: "https://github.com/example/app",
  buildCommand: "npm run build",
  testCommand: "npm test",
  dockerfilePath: "Dockerfile",
  healthCheckPath: "/health",
  status: "ACTIVE",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const containerInfo = {
  containerId: "abc123",
  imageTag: "releaseguard/my-app:1.0.0",
  hostPort: 54321,
  status: "running",
  startedAt: new Date().toISOString(),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(deploymentRepository.create).mockResolvedValue(makeDeployment());
  vi.mocked(deploymentRepository.update).mockResolvedValue(makeDeployment({ status: "RUNNING" }));
  vi.mocked(deploymentRepository.findById).mockResolvedValue(makeDeployment({ status: "RUNNING" }));
  vi.mocked(releaseRepository.adminUpdateStatus).mockResolvedValue(undefined as unknown as void);
  vi.mocked(dockerService.buildAndDeploy).mockResolvedValue(containerInfo);
  vi.mocked(dockerService.checkHealth).mockResolvedValue(undefined);
});

describe("deploymentService.deploy", () => {
  it("builds image, starts container, health-checks, transitions release to SUCCESS", async () => {
    await deploymentService.deploy("release-1", project, "1.0.0", "/tmp/workspace");

    expect(dockerService.buildAndDeploy).toHaveBeenCalledWith(
      "/tmp/workspace",
      "Dockerfile",
      expect.stringContaining("my-app:1.0.0"),
      "release-1"
    );
    expect(dockerService.checkHealth).toHaveBeenCalledWith(54321, "/health");
    expect(releaseRepository.adminUpdateStatus).toHaveBeenCalledWith("release-1", "MONITORING");
    expect(releaseRepository.adminUpdateStatus).toHaveBeenCalledWith("release-1", "SUCCESS");
  });

  it("transitions release to FAILED when image build fails", async () => {
    vi.mocked(dockerService.buildAndDeploy).mockRejectedValue(
      new Error("docker build error")
    );

    await deploymentService.deploy("release-1", project, "1.0.0", "/tmp/workspace");

    expect(releaseRepository.adminUpdateStatus).toHaveBeenCalledWith("release-1", "FAILED");
    expect(deploymentRepository.update).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ status: "FAILED" })
    );
  });

  it("transitions release to FAILED when health check fails", async () => {
    vi.mocked(dockerService.checkHealth).mockRejectedValue(
      new Error("health check timed out")
    );

    await deploymentService.deploy("release-1", project, "1.0.0", "/tmp/workspace");

    expect(releaseRepository.adminUpdateStatus).toHaveBeenCalledWith("release-1", "FAILED");
  });

  it("slugifies project name into image tag", async () => {
    const projectWithSpaces: Project = { ...project, name: "My Cool App!" };

    await deploymentService.deploy("release-1", projectWithSpaces, "2.0.0", "/tmp/workspace");

    expect(dockerService.buildAndDeploy).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      "releaseguard/my-cool-app-:2.0.0",
      "release-1"
    );
  });
});
