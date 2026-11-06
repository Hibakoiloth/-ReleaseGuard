import type { FastifyInstance } from "fastify";
import { authService } from "./auth.service";

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: { username: string; password: string } }>(
    "/signup",
    async (req, reply) => {
      const { username, password } = req.body ?? {};
      const result = await authService.signup(username, password);
      return reply.status(201).send(result);
    }
  );

  app.post<{ Body: { username: string; password: string } }>(
    "/login",
    async (req, reply) => {
      const { username, password } = req.body ?? {};
      const result = await authService.login(username, password);
      return reply.status(200).send(result);
    }
  );

  app.post("/logout", async (req, reply) => {
    const token = req.headers.authorization?.slice(7);
    if (token) await authService.logout(token);
    return reply.status(204).send();
  });
}
