import type { FastifyRequest, FastifyReply } from "fastify";
import { authRepository } from "../modules/auth/auth.repository";
import { UnauthorizedError } from "../shared/errors";

declare module "fastify" {
  interface FastifyRequest {
    user: { id: string; email: string } | null;
  }
}

export async function authenticate(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    throw new UnauthorizedError("Missing authorization header");
  }

  const token = authHeader.slice(7);
  const user = await authRepository.findSessionUser(token);
  if (!user) throw new UnauthorizedError("Invalid or expired token");

  request.user = { id: user.id, email: user.username };
}
