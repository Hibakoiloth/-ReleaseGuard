import { supabaseAdmin } from "../../infrastructure/supabase/supabase.client";
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  return timingSafeEqual(Buffer.from(hash, "hex"), candidate);
}

export const authRepository = {
  async findUserByUsername(username: string) {
    const { data, error } = await supabaseAdmin
      .from("app_users")
      .select("id, username, password")
      .eq("username", username)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async createUser(username: string, password: string) {
    const { data, error } = await supabaseAdmin
      .from("app_users")
      .insert({ username, password: hashPassword(password) })
      .select("id, username")
      .single();
    if (error) throw error;
    return data;
  },

  async createSession(userId: string): Promise<string> {
    const token = randomBytes(32).toString("hex");
    const { error } = await supabaseAdmin
      .from("sessions")
      .insert({ user_id: userId, token });
    if (error) throw error;
    return token;
  },

  async findSessionUser(token: string) {
    const { data: session } = await supabaseAdmin
      .from("sessions")
      .select("user_id")
      .eq("token", token)
      .maybeSingle();
    if (!session) return null;

    const { data: user } = await supabaseAdmin
      .from("app_users")
      .select("id, username")
      .eq("id", session.user_id)
      .maybeSingle();
    return user;
  },

  async deleteSession(token: string): Promise<void> {
    await supabaseAdmin.from("sessions").delete().eq("token", token);
  },

  verifyPassword,
};
