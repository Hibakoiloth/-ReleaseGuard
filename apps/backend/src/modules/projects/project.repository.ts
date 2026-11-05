import { supabaseAdmin } from "../../infrastructure/supabase/supabase.client";
import type {
  Project,
  CreateProjectInput,
  UpdateProjectInput,
  ProjectConfiguration,
} from "./project.types";

function toProject(row: {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  configuration: unknown;
  status: string;
  created_at: string;
  updated_at: string;
}): Project {
  const cfg = (row.configuration ?? {}) as ProjectConfiguration;
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    description: row.description,
    repositoryUrl: cfg.repositoryUrl ?? "",
    buildCommand: cfg.buildCommand ?? "",
    testCommand: cfg.testCommand ?? "",
    dockerfilePath: cfg.dockerfilePath ?? "",
    healthCheckPath: cfg.healthCheckPath ?? "",
    status: row.status as Project["status"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const projectRepository = {
  async findAll(ownerId: string): Promise<Project[]> {
    const { data, error } = await supabaseAdmin
      .from("projects")
      .select("*")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(toProject);
  },

  async findById(id: string, ownerId: string): Promise<Project | null> {
    const { data, error } = await supabaseAdmin
      .from("projects")
      .select("*")
      .eq("id", id)
      .eq("owner_id", ownerId)
      .single();
    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return toProject(data);
  },

  async create(
    input: CreateProjectInput & { ownerId: string }
  ): Promise<Project> {
    const {
      ownerId,
      name,
      description,
      repositoryUrl,
      buildCommand,
      testCommand,
      dockerfilePath,
      healthCheckPath,
    } = input;
    const { data, error } = await supabaseAdmin
      .from("projects")
      .insert({
        owner_id: ownerId,
        name,
        description: description ?? null,
        configuration: {
          repositoryUrl,
          buildCommand,
          testCommand,
          dockerfilePath,
          healthCheckPath,
        },
        status: "ACTIVE",
      })
      .select()
      .single();
    if (error) throw error;
    return toProject(data);
  },

  async update(
    id: string,
    ownerId: string,
    patch: UpdateProjectInput
  ): Promise<Project | null> {
    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (patch.name !== undefined) payload.name = patch.name;
    if (patch.description !== undefined) payload.description = patch.description;
    if (patch.status !== undefined) payload.status = patch.status;

    const cfgKeys = [
      "repositoryUrl",
      "buildCommand",
      "testCommand",
      "dockerfilePath",
      "healthCheckPath",
    ] as const;
    const hasCfgChange = cfgKeys.some((k) => patch[k] !== undefined);

    if (hasCfgChange) {
      const current = await this.findById(id, ownerId);
      if (!current) return null;
      payload.configuration = {
        repositoryUrl: patch.repositoryUrl ?? current.repositoryUrl,
        buildCommand: patch.buildCommand ?? current.buildCommand,
        testCommand: patch.testCommand ?? current.testCommand,
        dockerfilePath: patch.dockerfilePath ?? current.dockerfilePath,
        healthCheckPath: patch.healthCheckPath ?? current.healthCheckPath,
      };
    }

    const { data, error } = await supabaseAdmin
      .from("projects")
      .update(payload)
      .eq("id", id)
      .eq("owner_id", ownerId)
      .select()
      .single();
    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return toProject(data);
  },

  async delete(id: string, ownerId: string): Promise<boolean> {
    const { error, count } = await supabaseAdmin
      .from("projects")
      .delete({ count: "exact" })
      .eq("id", id)
      .eq("owner_id", ownerId);
    if (error) throw error;
    return (count ?? 0) > 0;
  },
};
