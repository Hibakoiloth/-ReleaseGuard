import { z } from "zod";

const safeCommand = z
  .string()
  .min(1)
  .regex(
    /^(npm|yarn|pnpm)\s+[\w:._-]+(\s+[\w:._-]+)*$/,
    "Command must start with npm, yarn, or pnpm and use only safe arguments"
  );

const relativePath = z
  .string()
  .min(1)
  .regex(/^[\w._/-]+$/, "Path contains invalid characters")
  .refine((v) => !v.includes(".."), "Path must not contain ..")
  .refine((v) => !v.startsWith("/"), "Path must be relative");

const healthPath = z
  .string()
  .min(1)
  .regex(/^\/[\w._/-]*$/, "Health check path must start with /");

export const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  repositoryUrl: z.string().url(),
  buildCommand: safeCommand,
  testCommand: safeCommand,
  dockerfilePath: relativePath,
  healthCheckPath: healthPath,
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  repositoryUrl: z.string().url().optional(),
  buildCommand: safeCommand.optional(),
  testCommand: safeCommand.optional(),
  dockerfilePath: relativePath.optional(),
  healthCheckPath: healthPath.optional(),
});
