import type { FastifyReply, FastifyRequest } from "fastify";
import { releaseService } from "./release.service";
import { projectService } from "../projects/project.service";
import { buildService } from "../builds/build.service";
import { testService } from "../tests/test.service";
import { logger } from "../../infrastructure/logging/logger";

type WithProject = { Params: { projectId: string } };
type WithProjectAndId = { Params: { projectId: string; id: string } };

async function runPipeline(
  releaseId: string,
  repositoryUrl: string,
  buildCommand: string,
  testCommand: string
): Promise<void> {
  const build = await buildService.execute(releaseId, repositoryUrl, buildCommand);
  if (build.status !== "SUCCESS") return;
  await testService.execute(releaseId, repositoryUrl, testCommand);
}

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
    const release = await releaseService.start(
      req.params.id,
      req.params.projectId,
      req.user!.id
    );
    const project = await projectService.get(
      req.params.projectId,
      req.user!.id
    );
    runPipeline(
      release.id,
      project.repositoryUrl,
      project.buildCommand,
      project.testCommand
    ).catch((err) => logger.error(err, "Pipeline error"));
    reply.status(200).send(release);
  },
};
