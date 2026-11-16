import type { FastifyInstance } from "fastify";
import { approvalService } from "./approval.service";

export async function approvalRoutes(app: FastifyInstance): Promise<void> {
  app.get("/approvals", async (req) => approvalService.listPending(req.user!.id));

  app.get("/approvals/history", async (req) => approvalService.listHistory(req.user!.id));

  app.get<{ Params: { id: string } }>("/approvals/:id", async (req, reply) => {
    const detail = await approvalService.getDetail(req.params.id);
    if (!detail) return reply.status(404).send({ message: "Approval not found" });
    return detail;
  });

  app.post<{ Params: { id: string } }>("/approvals/:id/approve", async (req, reply) => {
    const userId = req.user!.id;
    await approvalService.approve(req.params.id, userId);
    return reply.status(200).send({ approved: true });
  });

  app.post<{ Params: { id: string } }>("/approvals/:id/reject", async (req, reply) => {
    const userId = req.user!.id;
    await approvalService.reject(req.params.id, userId);
    return reply.status(200).send({ rejected: true });
  });
}
