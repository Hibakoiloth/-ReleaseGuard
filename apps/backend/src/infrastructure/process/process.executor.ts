import { spawn } from "child_process";
import type { ExecutionOptions, ExecutionResult } from "./process.types";
import { ProcessSpawnError } from "./process.errors";

const DEFAULT_TIMEOUT_MS = 300_000;
const DEFAULT_MAX_OUTPUT_BYTES = 1_048_576;

export function execute(opts: ExecutionOptions): Promise<ExecutionResult> {
  const {
    command,
    args,
    cwd,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxOutputBytes = DEFAULT_MAX_OUTPUT_BYTES,
  } = opts;

  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    let stdout = "";
    let stderr = "";
    let totalBytes = 0;
    let timedOut = false;
    let settled = false;
    let killTimer: NodeJS.Timeout | null = null;

    const proc = spawn(command, args, {
      cwd,
      env: { ...process.env, CI: "true", ...opts.env },
      shell: false,
    });

    const timeoutTimer = setTimeout(() => {
      timedOut = true;
      proc.kill("SIGTERM");
      killTimer = setTimeout(() => {
        if (!settled) proc.kill("SIGKILL");
      }, 5_000);
    }, timeoutMs);

    function appendOutput(chunk: Buffer, target: "stdout" | "stderr") {
      const remaining = maxOutputBytes - totalBytes;
      if (remaining <= 0) return;
      const text = chunk.slice(0, remaining).toString("utf8");
      if (target === "stdout") stdout += text;
      else stderr += text;
      totalBytes += text.length;
    }

    proc.stdout.on("data", (chunk: Buffer) => appendOutput(chunk, "stdout"));
    proc.stderr.on("data", (chunk: Buffer) => appendOutput(chunk, "stderr"));

    proc.on("error", (err) => {
      settled = true;
      clearTimeout(timeoutTimer);
      if (killTimer) clearTimeout(killTimer);
      reject(new ProcessSpawnError(err.message));
    });

    proc.on("close", (code) => {
      settled = true;
      clearTimeout(timeoutTimer);
      if (killTimer) clearTimeout(killTimer);
      resolve({
        exitCode: code ?? 1,
        stdout,
        stderr,
        durationMs: Date.now() - startedAt,
        timedOut,
      });
    });
  });
}
