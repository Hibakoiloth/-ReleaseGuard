import { z } from "zod";

export const createReleaseSchema = z.object({
  version: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[\w.+-]+$/, "Version contains invalid characters"),
  commitHash: z
    .string()
    .regex(/^[0-9a-f]{7,40}$/, "Invalid commit hash format")
    .optional(),
});
