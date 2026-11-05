import { describe, it, expect, vi, beforeEach } from "vitest";
import type { BuildExecution } from "./build.types";

vi.mock("../../infrastructure/supabase/supabase.client", () => ({
  supabaseAdmin: {
    from: vi.fn(),
    auth: { getUser: vi.fn() },
  },
}));

vi.mock("./build.repository", () => ({
  buildRepository: {
    create: vi.fn(),
    update: vi.fn(),
    findById: vi.fn(),
    findAll: vi.fn(),
  },
}));

vi.mock("../releases/release.repository", () => ({
  releaseRepository: {
    adminUpdateStatus: vi.fn(),
  },
}));

vi.mock("../../infrastructure/process/process.executor", () => ({
  execute: vi.fn(),
}));

vi.mock("../../infrastructure/logging/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn() },
}));

vi.mock("fs", () => ({
  existsSync: vi.fn(() => false),
}));

vi.mock("fs/promises", () => ({
  mkdtemp: vi.fn(() => Promise.resolve("/tmp/rg-build-abc")),
  rm: vi.fn(() => Promise.resolve()),
}));

import { buildService } from "./build.service";
import { buildRepository } from "./build.repository";
import { releaseRepository } from "../releases/release.repository";
import { execute } from "../../infrastructure/process/process.executor";

function makeBuild(overrides: Partial<BuildExecution> = {}): BuildExecution {
  return {
    id: "build-1",
    releaseId: "release-1",
    status: "PENDING",
    output: null,
    exitCode: null,
    startedAt: null,
    completedAt: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

const SUCCESS_RESULT = {
  exitCode: 0,
  stdout: "Build successful",
  stderr: "",
  durationMs: 100,
  timedOut: false,
};

const FAILURE_RESULT = {
  exitCode: 1,
  stdout: "",
  stderr: "Build failed",
  durationMs: 100,
  timedOut: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(buildRepository.create).mockResolvedValue(makeBuild());
  vi.mocked(buildRepository.update).mockResolvedValue(makeBuild({ status: "RUNNING" }));
  vi.mocked(buildRepository.findById).mockResolvedValue(makeBuild({ status: "SUCCESS" }));
  vi.mocked(releaseRepository.adminUpdateStatus).mockResolvedValue(undefined as unknown as void);
});

describe("buildService.execute", () => {
  it("transitions release to TESTING on build success", async () => {
    vi.mocked(execute).mockResolvedValue(SUCCESS_RESULT);

    await buildService.execute("release-1", "https://github.com/example/repo", "npm run build");

    expect(releaseRepository.adminUpdateStatus).toHaveBeenCalledWith("release-1", "TESTING");
  });

  it("transitions release to FAILED on build failure", async () => {
    vi.mocked(execute)
      .mockResolvedValueOnce(SUCCESS_RESULT) // clone
      .mockResolvedValueOnce(SUCCESS_RESULT) // install
      .mockResolvedValueOnce(FAILURE_RESULT); // build

    await buildService.execute("release-1", "https://github.com/example/repo", "npm run build");

    expect(releaseRepository.adminUpdateStatus).toHaveBeenCalledWith("release-1", "FAILED");
  });

  it("transitions release to FAILED when clone fails", async () => {
    vi.mocked(execute).mockResolvedValueOnce(FAILURE_RESULT);

    await buildService.execute("release-1", "https://github.com/example/repo", "npm run build");

    expect(releaseRepository.adminUpdateStatus).toHaveBeenCalledWith("release-1", "FAILED");
  });

  it("marks build as TIMED_OUT when process times out", async () => {
    vi.mocked(execute).mockResolvedValue({
      ...SUCCESS_RESULT,
      timedOut: true,
      exitCode: -1,
    });

    await buildService.execute("release-1", "https://github.com/example/repo", "npm run build");

    expect(buildRepository.update).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ status: "TIMED_OUT" })
    );
  });

  it("always cleans up the workspace", async () => {
    const { rm } = await import("fs/promises");
    vi.mocked(execute).mockResolvedValue(SUCCESS_RESULT);

    await buildService.execute("release-1", "https://github.com/example/repo", "npm run build");

    expect(rm).toHaveBeenCalledWith("/tmp/rg-build-abc", {
      recursive: true,
      force: true,
    });
  });
});

describe("buildService.list", () => {
  it("delegates to buildRepository.findAll", async () => {
    vi.mocked(buildRepository.findAll).mockResolvedValue([makeBuild()]);

    const result = await buildService.list("release-1");

    expect(result).toHaveLength(1);
    expect(buildRepository.findAll).toHaveBeenCalledWith("release-1");
  });
});
