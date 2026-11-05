export const config = {
  get port() {
    return Number(process.env.PORT) || 3000;
  },
  get corsOrigin() {
    return process.env.CORS_ORIGIN ?? "http://localhost:5173";
  },
  get nodeEnv() {
    return process.env.NODE_ENV ?? "development";
  },
  get isTest(): boolean {
    return this.nodeEnv === "test";
  },
  get logger(): boolean {
    return !this.isTest;
  },
  get supabaseUrl() {
    return process.env.SUPABASE_URL ?? "";
  },
  get supabasePublishableKey() {
    return process.env.SUPABASE_PUBLISHABLE_KEY ?? "";
  },
  get supabaseSecretKey() {
    return process.env.SUPABASE_SECRET_KEY ?? "";
  },
};
