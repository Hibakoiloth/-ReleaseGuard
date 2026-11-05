import { supabaseAdmin } from "../../infrastructure/supabase/supabase.client";
import type { TestExecution, TestStatus } from "./test.types";

function toExecution(row: {
  id: string;
  release_id: string;
  status: string;
  output: string | null;
  exit_code: number | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}): TestExecution {
  return {
    id: row.id,
    releaseId: row.release_id,
    status: row.status as TestStatus,
    output: row.output,
    exitCode: row.exit_code,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
  };
}

export const testRepository = {
  async findAll(releaseId: string): Promise<TestExecution[]> {
    const { data, error } = await supabaseAdmin
      .from("test_executions")
      .select("*")
      .eq("release_id", releaseId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(toExecution);
  },

  async findById(id: string, releaseId: string): Promise<TestExecution | null> {
    const { data, error } = await supabaseAdmin
      .from("test_executions")
      .select("*")
      .eq("id", id)
      .eq("release_id", releaseId)
      .single();
    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return toExecution(data);
  },

  async create(releaseId: string): Promise<TestExecution> {
    const { data, error } = await supabaseAdmin
      .from("test_executions")
      .insert({ release_id: releaseId, status: "PENDING" })
      .select()
      .single();
    if (error) throw error;
    return toExecution(data);
  },

  async update(
    id: string,
    patch: {
      status: TestStatus;
      output?: string;
      exitCode?: number | null;
      startedAt?: string;
      completedAt?: string;
    }
  ): Promise<TestExecution> {
    const payload: Record<string, unknown> = { status: patch.status };
    if (patch.output !== undefined) payload.output = patch.output;
    if (patch.exitCode !== undefined) payload.exit_code = patch.exitCode;
    if (patch.startedAt !== undefined) payload.started_at = patch.startedAt;
    if (patch.completedAt !== undefined) payload.completed_at = patch.completedAt;

    const { data, error } = await supabaseAdmin
      .from("test_executions")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update(payload as any)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return toExecution(data);
  },
};
