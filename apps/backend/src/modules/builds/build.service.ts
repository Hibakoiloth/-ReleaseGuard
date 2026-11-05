import { mkdtemp, rm } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { execute } from "../../infrastructure/process/process.executor";
import { buildRepository } from "./build.repository";
import { releaseRepository } from "../releases/release.repository";
import { logger } from "../../infrastructure/logging/logger";
import type { BuildExecution } from "./build.types";
import type { ReleaseStatus } from "../releases/release.types";

function detectInstallCommand(cwd: string): [string, string[]] {
  if (existsSync(join(cwd, "pnpm-lock.yaml"))) return ["pnpm", ["install", "--frozen-lockfile"]];
  if (existsSync(join(cwd, "yarn.lock"))) return ["yarn", ["install", "--frozen-lockfile"]];
  return ["npm", ["ci"]];
}

function parseCommand(cmd: string): [string, string[]] {
  const parts = cmd.trim().split(/\s+/);
  return [parts[0], parts.slice(1)];
}

export const buildService = {
  async execute(
    releaseId: string,
    repositoryUrl: string,
    buildCommand: string,
    options: { keepWorkspace?: boolean } = {}
  ): Promise<BuildExecution & { workspacePath?: string }> {
    const execution = await buildRepository.create(releaseId);
    let workspace: string | null = null;

    try {
      workspace = await mkdtemp(join(tmpdir(), "rg-build-"));

      await buildRepository.update(execution.id, {
        status: "RUNNING",
        startedAt: new Date().toISOString(),
      });

      let output = "";

      // Step 1: clone
      output += "--- Cloning repository ---\n";
      const clone = await execute({
        command: "git",
        args: ["clone", "--depth=1", repositoryUrl, "."],
        cwd: workspace,
        timeoutMs: 120_000,
      });
      output += clone.stdout;
      if (clone.stderr) output += clone.stderr;

      if (clone.exitCode !== 0 || clone.timedOut) {
        const status = clone.timedOut ? "TIMED_OUT" : "FAILED";
        await this._fail(releaseId, execution.id, status, output, clone.exitCode);
        return buildRepository.findById(execution.id, releaseId) as Promise<BuildExecution>;
      }

      // Step 2: install
      const [installCmd, installArgs] = detectInstallCommand(workspace);
      output += `\n--- Installing dependencies (${installCmd}) ---\n`;
      const install = await execute({
        command: installCmd,
        args: installArgs,
        cwd: workspace,
        timeoutMs: 180_000,
      });
      output += install.stdout;
      if (install.stderr) output += install.stderr;

      if (install.exitCode !== 0 || install.timedOut) {
        const status = install.timedOut ? "TIMED_OUT" : "FAILED";
        await this._fail(releaseId, execution.id, status, output, install.exitCode);
        return buildRepository.findById(execution.id, releaseId) as Promise<BuildExecution>;
      }

      // Step 3: build command
      const [cmd, cmdArgs] = parseCommand(buildCommand);
      output += `\n--- Running build: ${buildCommand} ---\n`;
      const build = await execute({
        command: cmd,
        args: cmdArgs,
        cwd: workspace,
        timeoutMs: 300_000,
      });
      output += build.stdout;
      if (build.stderr) output += build.stderr;

      const succeeded = build.exitCode === 0 && !build.timedOut;
      const buildStatus = build.timedOut ? "TIMED_OUT" : succeeded ? "SUCCESS" : "FAILED";
      const releaseStatus: ReleaseStatus = succeeded ? "TESTING" : "FAILED";

      await releaseRepository.adminUpdateStatus(releaseId, releaseStatus);
      await buildRepository.update(execution.id, {
        status: buildStatus,
        exitCode: build.exitCode,
        output,
        completedAt: new Date().toISOString(),
      });

      const result = await buildRepository.findById(execution.id, releaseId);
      if (options.keepWorkspace && succeeded) {
        return { ...result!, workspacePath: workspace };
      }
      return result!;
    } catch (err) {
      logger.error(err, "Unexpected error during build");
      await this._fail(releaseId, execution.id, "FAILED", "Internal error during build", -1);
      return (await buildRepository.findById(execution.id, releaseId))!;
    } finally {
      if (workspace && !options.keepWorkspace) {
        await rm(workspace, { recursive: true, force: true }).catch(() => {});
      }
    }
  },

  async _fail(
    releaseId: string,
    executionId: string,
    status: "FAILED" | "TIMED_OUT",
    output: string,
    exitCode: number | null
  ): Promise<void> {
    await releaseRepository.adminUpdateStatus(releaseId, "FAILED").catch(() => {});
    await buildRepository
      .update(executionId, {
        status,
        output,
        exitCode,
        completedAt: new Date().toISOString(),
      })
      .catch(() => {});
  },

  async list(releaseId: string) {
    return buildRepository.findAll(releaseId);
  },

  async get(id: string, releaseId: string) {
    return buildRepository.findById(id, releaseId);
  },
};
