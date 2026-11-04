export const config = {
  port: Number(process.env.PORT) || 3000,
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  nodeEnv: process.env.NODE_ENV ?? "development",
  get isTest(): boolean {
    return this.nodeEnv === "test";
  },
  get logger(): boolean {
    return !this.isTest;
  },
};
