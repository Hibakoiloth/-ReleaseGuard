import type { FastifyReply, FastifyRequest } from "fastify";
import { releaseService } from "./release.service";
import { projectService } from "../projects/project.service";
import { buildService } from "../builds/build.service";
import { testService } from "../tests/test.service";
import { deploymentService } from "../deployments/deployment.service";
import { logger } from "../../infrastructure/logging/logger";
import { rm } from "fs/promises";

type WithProject = { Params: { projectId: string } };
type WithProjectAndId = { Params: { projectId: string; id: string } };

async function runPipeline(
  releaseId: string,
  repositoryUrl: string,
  buildCommand: string,
  testCommand: string,
  project: Awaited<ReturnType<typeof projectService.get>>,
  version: string
): Promise<void> {
  const build = await buildService.execute(
    releaseId,
    repositoryUrl,
    buildCommand,
    { keepWorkspace: true }
  );
  if (build.status !== "SUCCESS") return;

  const workspacePath = build.workspacePath;

  try {
    const test = await testService.execute(releaseId, repositoryUrl, testCommand);
    if (test.status !== "SUCCESS") return;

    if (workspacePath) {
      await deploymentService.deploy(releaseId, project, version, workspacePath);
    }
  } finally {
    if (workspacePath) {
      await rm(workspacePath, { recursive: true, force: true }).catch(() => {});
    }
  }
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
      project.testCommand,
      project,
      release.version
    ).catch((err) => logger.error(err, "Pipeline error"));
    reply.status(200).send(release);
  },
};
