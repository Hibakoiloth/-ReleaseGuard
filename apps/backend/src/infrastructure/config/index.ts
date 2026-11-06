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
  get ollamaBaseUrl() {
    return process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
  },
  get ollamaModel() {
    return process.env.OLLAMA_MODEL ?? "llama3.1:8b";
  },
  get ollamaTimeoutMs() {
    return Number(process.env.OLLAMA_TIMEOUT_MS) || 120000;
  },
};
