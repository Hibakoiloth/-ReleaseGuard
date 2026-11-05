import { AppError } from "../../shared/errors";

export class ProcessTimeoutError extends AppError {
  constructor(command: string, timeoutMs: number) {
    super(
      500,
      `Process '${command}' timed out after ${timeoutMs}ms`,
      "PROCESS_TIMEOUT"
    );
  }
}

export class ProcessSpawnError extends AppError {
  constructor(message: string) {
    super(500, `Failed to spawn process: ${message}`, "PROCESS_SPAWN_ERROR");
  }
}
