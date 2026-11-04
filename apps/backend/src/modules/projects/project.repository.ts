import { randomUUID } from "crypto";
import type {
  Project,
  CreateProjectInput,
  UpdateProjectInput,
} from "./project.types";

const store = new Map<string, Project>();

export const projectRepository = {
  findAll(): Project[] {
    return Array.from(store.values());
  },

  findById(id: string): Project | undefined {
    return store.get(id);
  },

  create(input: CreateProjectInput): Project {
    const now = new Date().toISOString();
    const project: Project = {
      id: randomUUID(),
      name: input.name,
      repositoryUrl: input.repositoryUrl,
      status: "ACTIVE",
      createdAt: now,
      updatedAt: now,
    };
    store.set(project.id, project);
    return project;
  },

  update(
    id: string,
    patch: Partial<Omit<Project, "id" | "createdAt">>
  ): Project | undefined {
    const project = store.get(id);
    if (!project) return undefined;
    const updated: Project = {
      ...project,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    store.set(id, updated);
    return updated;
  },

  delete(id: string): boolean {
    return store.delete(id);
  },

  clear(): void {
    store.clear();
  },
};
