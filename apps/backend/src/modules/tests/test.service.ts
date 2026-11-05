import { mkdtemp, rm } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { execute } from "../../infrastructure/process/process.executor";
import { testRepository } from "./test.repository";
import { releaseRepository } from "../releases/release.repository";
import { logger } from "../../infrastructure/logging/logger";
import type { TestExecution } from "./test.types";
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

export const testService = {
  async execute(
    releaseId: string,
    repositoryUrl: string,
    testCommand: string
  ): Promise<TestExecution> {
    const execution = await testRepository.create(releaseId);
    let workspace: string | null = null;

    try {
      workspace = await mkdtemp(join(tmpdir(), "rg-test-"));

      await testRepository.update(execution.id, {
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
        return testRepository.findById(execution.id, releaseId) as Promise<TestExecution>;
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
        return testRepository.findById(execution.id, releaseId) as Promise<TestExecution>;
      }

      // Step 3: test command
      const [cmd, cmdArgs] = parseCommand(testCommand);
      output += `\n--- Running tests: ${testCommand} ---\n`;
      const test = await execute({
        command: cmd,
        args: cmdArgs,
        cwd: workspace,
        timeoutMs: 300_000,
        env: { CI: "true" },
      });
      output += test.stdout;
      if (test.stderr) output += test.stderr;

      const succeeded = test.exitCode === 0 && !test.timedOut;
      const testStatus = test.timedOut ? "TIMED_OUT" : succeeded ? "SUCCESS" : "FAILED";
      const releaseStatus: ReleaseStatus = succeeded ? "DEPLOYING" : "FAILED";

      await releaseRepository.adminUpdateStatus(releaseId, releaseStatus);
      await testRepository.update(execution.id, {
        status: testStatus,
        exitCode: test.exitCode,
        output,
        completedAt: new Date().toISOString(),
      });

      return (await testRepository.findById(execution.id, releaseId))!;
    } catch (err) {
      logger.error(err, "Unexpected error during test");
      await this._fail(releaseId, execution.id, "FAILED", "Internal error during test", -1);
      return (await testRepository.findById(execution.id, releaseId))!;
    } finally {
      if (workspace) {
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
    await testRepository
      .update(executionId, {
        status,
        output,
        exitCode,
        completedAt: new Date().toISOString(),
      })
      .catch(() => {});
  },

  async list(releaseId: string) {
    return testRepository.findAll(releaseId);
  },

  async get(id: string, releaseId: string) {
    return testRepository.findById(id, releaseId);
  },
};
