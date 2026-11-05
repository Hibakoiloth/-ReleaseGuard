import { describe, it, expect } from "vitest";
import { execute } from "./process.executor";
import { ProcessSpawnError } from "./process.errors";
import { mkdtemp, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

async function withTempDir(fn: (dir: string) => Promise<void>): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), "rg-exec-test-"));
  try {
    await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

describe("process.executor", () => {
  it("captures stdout and returns exit code 0 on success", async () => {
    await withTempDir(async (cwd) => {
      const result = await execute({
        command: "node",
        args: ["-e", "process.stdout.write('hello world')"],
        cwd,
      });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("hello world");
      expect(result.timedOut).toBe(false);
    });
  });

  it("captures stderr and returns non-zero exit code on failure", async () => {
    await withTempDir(async (cwd) => {
      const result = await execute({
        command: "node",
        args: ["-e", "process.stderr.write('err msg'); process.exit(1)"],
        cwd,
      });
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain("err msg");
      expect(result.timedOut).toBe(false);
    });
  });

  it("sets timedOut and resolves when process exceeds timeout", async () => {
    await withTempDir(async (cwd) => {
      const result = await execute({
        command: "node",
        args: ["-e", "setTimeout(() => {}, 60000)"],
        cwd,
        timeoutMs: 200,
      });
      expect(result.timedOut).toBe(true);
    });
  }, 10_000);

  it("caps output at maxOutputBytes", async () => {
    await withTempDir(async (cwd) => {
      const maxOutputBytes = 100;
      const result = await execute({
        command: "node",
        args: ["-e", `process.stdout.write('x'.repeat(1000))`],
        cwd,
        maxOutputBytes,
      });
      expect(result.stdout.length).toBeLessThanOrEqual(maxOutputBytes);
    });
  });

  it("rejects with ProcessSpawnError when command does not exist", async () => {
    await withTempDir(async (cwd) => {
      await expect(
        execute({
          command: "definitely-not-a-real-command-xyz",
          args: [],
          cwd,
        })
      ).rejects.toBeInstanceOf(ProcessSpawnError);
    });
  });
});
