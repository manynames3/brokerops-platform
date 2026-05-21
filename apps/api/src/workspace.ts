import type { FastifyReply, FastifyRequest } from "fastify";
import { config } from "./config.js";
import { query } from "./db.js";

export const workspaceHeaderName = "x-brokerops-workspace-key";

export type WorkspaceContext = {
  id: string;
  name: string;
};

let configuredWorkspace: WorkspaceContext | null = null;

export async function requireWorkspace(request: FastifyRequest, reply: FastifyReply) {
  const providedKey = request.headers[workspaceHeaderName];
  const normalizedKey = Array.isArray(providedKey) ? providedKey[0] : providedKey;

  if (!normalizedKey || normalizedKey !== config.workspaceApiKey) {
    reply.status(401).send({
      error: "workspace_key_required",
      message: `Send a valid ${workspaceHeaderName} header to access BrokerOps workspace data.`
    });
    return null;
  }

  return ensureConfiguredWorkspace();
}

export async function ensureConfiguredWorkspace(): Promise<WorkspaceContext> {
  if (configuredWorkspace) {
    return configuredWorkspace;
  }

  const result = await query<WorkspaceContext>(
    `
    INSERT INTO organizations (name, workspace_key)
    VALUES ($1, $2)
    ON CONFLICT (workspace_key) DO UPDATE SET name = EXCLUDED.name
    RETURNING id, name
    `,
    [config.workspaceName, config.workspaceApiKey]
  );

  configuredWorkspace = result.rows[0];
  return configuredWorkspace;
}
