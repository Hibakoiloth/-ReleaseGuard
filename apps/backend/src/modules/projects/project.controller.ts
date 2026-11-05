import type { FastifyReply, FastifyRequest } from "fastify";
import { projectService } from "./project.service";

type WithId = { Params: { id: string } };

export const projectController = {
  async list(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    reply.status(200).send(await projectService.list(req.user!.id));
  },

  async get(req: FastifyRequest<WithId>, reply: FastifyReply): Promise<void> {
    reply.status(200).send(await projectService.get(req.params.id, req.user!.id));
  },

  async create(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    reply.status(201).send(await projectService.create(req.body, req.user!.id));
  },

  async update(req: FastifyRequest<WithId>, reply: FastifyReply): Promise<void> {
    reply
      .status(200)
      .send(await projectService.update(req.params.id, req.user!.id, req.body));
  },

  async remove(req: FastifyRequest<WithId>, reply: FastifyReply): Promise<void> {
    await projectService.remove(req.params.id, req.user!.id);
    reply.status(204).send();
  },

  async archive(
    req: FastifyRequest<WithId>,
    reply: FastifyReply
  ): Promise<void> {
    reply
      .status(200)
      .send(await projectService.archive(req.params.id, req.user!.id));
  },
};
