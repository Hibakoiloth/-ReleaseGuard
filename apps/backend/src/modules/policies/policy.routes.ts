import { z } from "zod";
import type { FastifyInstance } from "fastify";
import { policyService } from "./policy.service";

const CreatePolicyBody = z.object({
  name: z.string().min(1),
  action: z.enum(["ROLLBACK", "BLOCK", "REQUIRE_APPROVAL"]),
  conditions: z.object({
    event: z.enum(["DEPLOYMENT_FAILED", "HEALTH_CHECK_FAILED", "BUILD_FAILED", "TEST_FAILED"]),
    requireApproval: z.boolean().optional(),
  }),
});

export async function policyRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { projectId: string } }>(
    "/:projectId/policies",
    async (req) => policyService.list(req.params.projectId)
  );

  app.post<{ Params: { projectId: string }; Body: z.infer<typeof CreatePolicyBody> }>(
    "/:projectId/policies",
    async (req, reply) => {
      const body = CreatePolicyBody.parse(req.body);
      const policy = await policyService.create(
        req.params.projectId,
        body.name,
        body.action,
        body.conditions
      );
      return reply.status(201).send(policy);
    }
  );

  app.delete<{ Params: { projectId: string; policyId: string } }>(
    "/:projectId/policies/:policyId",
    async (req, reply) => {
      await policyService.delete(req.params.policyId, req.params.projectId);
      return reply.status(204).send();
    }
  );

  app.get<{
    Params: { projectId: string; releaseId: string; deploymentId: string; incidentId: string };
  }>(
    "/:projectId/releases/:releaseId/deployments/:deploymentId/incidents/:incidentId/recovery",
    async (req) => policyService.listRecoveryActions(req.params.incidentId)
  );
}
