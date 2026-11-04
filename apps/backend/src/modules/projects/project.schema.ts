import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  repositoryUrl: z.string().url(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  repositoryUrl: z.string().url().optional(),
});
