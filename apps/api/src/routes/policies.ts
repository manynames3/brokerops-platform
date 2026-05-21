import type { FastifyInstance } from "fastify";
import { query } from "../db.js";
import { importPolicyCsv, type PolicyImportRequest } from "../services/policyImport.js";
import { requireWorkspace } from "../workspace.js";

export async function registerPolicyRoutes(app: FastifyInstance) {
  app.get("/policies", async (request, reply) => {
    const workspace = await requireWorkspace(request, reply);
    if (!workspace) return;

    const result = await query<{
      id: string;
      external_policy_id: string;
      account_name: string;
      expected_commission_rate: string;
      effective_date: string;
      carrier_name: string;
      created_at: string;
    }>(
      `
      SELECT
        p.id,
        p.external_policy_id,
        p.account_name,
        p.expected_commission_rate,
        p.effective_date,
        c.name AS carrier_name,
        p.created_at
      FROM policies p
      JOIN carriers c ON c.id = p.carrier_id
      WHERE p.organization_id = $1
      ORDER BY p.created_at DESC
      LIMIT 50
      `,
      [workspace.id]
    );

    return { policies: result.rows };
  });

  app.post("/policies/import", async (request, reply) => {
    const workspace = await requireWorkspace(request, reply);
    if (!workspace) return;

    const body = request.body as Partial<PolicyImportRequest> | undefined;
    const result = await importPolicyCsv({
      organizationId: workspace.id,
      carrierName: body?.carrierName || "",
      csv: body?.csv || "",
      actor: body?.actor
    });

    if (!result.ok) {
      return reply.status(422).send({
        error: "policy_csv_validation_failed",
        errors: result.errors
      });
    }

    return reply.status(201).send(result);
  });
}
