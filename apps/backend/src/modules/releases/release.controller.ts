import type { FastifyReply, FastifyRequest } from "fastify";
import { releaseService } from "./release.service";

type WithProject = { Params: { projectId: string } };
type WithProjectAndId = { Params: { projectId: string; id: string } };

export const releaseController = {
  async list(
    req: FastifyRequest<WithProject>,
    reply: FastifyReply
  ): Promise<void> {
    reply
      .status(200)
      .send(await releaseService.list(req.params.projectId, req.user!.id));
  },

  async get(
    req: FastifyRequest<WithProjectAndId>,
    reply: FastifyReply
  ): Promise<void> {
    reply
      .status(200)
      .send(
        await releaseService.get(
          req.params.id,
          req.params.projectId,
          req.user!.id
        )
      );
  },

  async create(
    req: FastifyRequest<WithProject>,
    reply: FastifyReply
  ): Promise<void> {
    reply
      .status(201)
      .send(
        await releaseService.create(req.body, req.params.projectId, req.user!.id)
      );
  },

  async start(
    req: FastifyRequest<WithProjectAndId>,
    reply: FastifyReply
  ): Promise<void> {
    reply
      .status(200)
      .send(
        await releaseService.start(
          req.params.id,
          req.params.projectId,
          req.user!.id
        )
      );
  },
};
