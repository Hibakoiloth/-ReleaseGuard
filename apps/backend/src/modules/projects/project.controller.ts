import type { FastifyReply, FastifyRequest } from "fastify";
import { projectService } from "./project.service";

type WithId = { Params: { id: string } };

export const projectController = {
  async list(_req: FastifyRequest, reply: FastifyReply): Promise<void> {
    reply.status(200).send(projectService.list());
  },

  async get(req: FastifyRequest<WithId>, reply: FastifyReply): Promise<void> {
    reply.status(200).send(projectService.get(req.params.id));
  },

  async create(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    reply.status(201).send(projectService.create(req.body));
  },

  async update(req: FastifyRequest<WithId>, reply: FastifyReply): Promise<void> {
    reply.status(200).send(projectService.update(req.params.id, req.body));
  },

  async remove(req: FastifyRequest<WithId>, reply: FastifyReply): Promise<void> {
    projectService.remove(req.params.id);
    reply.status(204).send();
  },

  async archive(req: FastifyRequest<WithId>, reply: FastifyReply): Promise<void> {
    reply.status(200).send(projectService.archive(req.params.id));
  },
};
