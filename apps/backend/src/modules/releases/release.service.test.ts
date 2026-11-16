import { describe, it, expect, vi, beforeEach } from "vitest";
import { NotFoundError, ValidationError } from "../../shared/errors";
import type { Release } from "./release.types";
import type { Project } from "../projects/project.types";

vi.mock("../../infrastructure/supabase/supabase.client", () => ({
  supabaseAdmin: { from: vi.fn() },
}));

vi.mock("./release.repository", () => ({
  releaseRepository: {
    findAll: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    updateStatus: vi.fn(),
    adminUpdateStatus: vi.fn(),
  },
}));

vi.mock("../projects/project.service", () => ({
  projectService: { get: vi.fn() },
}));

import { releaseService } from "./release.service";
import { releaseRepository } from "./release.repository";
import { projectService } from "../projects/project.service";

function makeRelease(overrides: Partial<Release> = {}): Release {
  return {
    id: "rel-1",
    projectId: "proj-1",
    version: "1.0.0",
    status: "CREATED",
    commitHash: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

const mockProject: Project = {
  id: "proj-1",
  ownerId: "user-1",
  name: "Test",
  description: null,
  repositoryUrl: "https://github.com/test/app",
  buildCommand: "npm run build",
  testCommand: "npm test",
  dockerfilePath: "Dockerfile",
  healthCheckPath: "/health",
  status: "ACTIVE",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(projectService.get).mockResolvedValue(mockProject);
});

describe("releaseService.list", () => {
  it("verifies project ownership then returns releases", async () => {
    vi.mocked(releaseRepository.findAll).mockResolvedValue([makeRelease()]);
    const result = await releaseService.list("proj-1", "user-1");
    expect(projectService.get).toHaveBeenCalledWith("proj-1", "user-1");
    expect(result).toHaveLength(1);
  });

  it("throws NotFoundError when project not found", async () => {
    vi.mocked(projectService.get).mockRejectedValue(new NotFoundError("Project"));
    await expect(releaseService.list("proj-1", "wrong-user")).rejects.toThrow(NotFoundError);
  });
});

describe("releaseService.create", () => {
  it("creates a release with valid input", async () => {
    vi.mocked(releaseRepository.create).mockResolvedValue(makeRelease());
    const result = await releaseService.create({ version: "1.0.0" }, "proj-1", "user-1");
    expect(releaseRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ version: "1.0.0", projectId: "proj-1" })
    );
    expect(result.version).toBe("1.0.0");
  });

  it("throws ValidationError for missing version", async () => {
    await expect(releaseService.create({}, "proj-1", "user-1")).rejects.toThrow(ValidationError);
  });
});

describe("releaseService.start", () => {
  it("transitions CREATED release to BUILDING", async () => {
    vi.mocked(releaseRepository.findById).mockResolvedValue(makeRelease({ status: "CREATED" }));
    vi.mocked(releaseRepository.updateStatus).mockResolvedValue(makeRelease({ status: "BUILDING" }));

    const result = await releaseService.start("rel-1", "proj-1", "user-1");
    expect(releaseRepository.updateStatus).toHaveBeenCalledWith("rel-1", "proj-1", "BUILDING");
    expect(result.status).toBe("BUILDING");
  });

  it("throws ValidationError when release is not in CREATED state", async () => {
    vi.mocked(releaseRepository.findById).mockResolvedValue(makeRelease({ status: "BUILDING" }));
    await expect(releaseService.start("rel-1", "proj-1", "user-1")).rejects.toThrow(ValidationError);
  });

  it("throws NotFoundError when release does not exist", async () => {
    vi.mocked(releaseRepository.findById).mockResolvedValue(null);
    await expect(releaseService.start("rel-1", "proj-1", "user-1")).rejects.toThrow(NotFoundError);
  });
});
