import type { FastifyReply, FastifyRequest } from "fastify";
import { verifySessionToken, type AuthenticatedUser } from "./auth.js";
import { config } from "./config.js";
import { query } from "./db.js";

export const workspaceHeaderName = "x-brokerops-workspace-key";
export const authHeaderName = "authorization";

export type WorkspaceContext = {
  id: string;
  name: string;
  user?: AuthenticatedUser;
};

let configuredWorkspace: WorkspaceContext | null = null;

export async function requireWorkspace(request: FastifyRequest, reply: FastifyReply) {
  const bearerToken = getBearerToken(request);
  if (bearerToken) {
    const user = verifySessionToken(bearerToken);
    if (!user) {
      reply.status(401).send({
        error: "invalid_session",
        message: "Sign in again to access BrokerOps workspace data."
      });
      return null;
    }

    const organization = await query<{ id: string; name: string }>(
      "SELECT id, name FROM organizations WHERE id = $1",
      [user.organizationId]
    );

    if (!organization.rows[0]) {
      reply.status(401).send({
        error: "organization_not_found",
        message: "The signed-in user is not attached to an active BrokerOps organization."
      });
      return null;
    }

    return {
      id: organization.rows[0].id,
      name: organization.rows[0].name,
      user
    };
  }

  const providedKey = request.headers[workspaceHeaderName];
  const normalizedKey = Array.isArray(providedKey) ? providedKey[0] : providedKey;

  if (!normalizedKey) {
    reply.status(401).send({
      error: "authentication_required",
      message: "Sign in with a BrokerOps user to access workspace data."
    });
    return null;
  }

  if (normalizedKey !== config.workspaceApiKey) {
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

function getBearerToken(request: FastifyRequest) {
  const header = request.headers[authHeaderName];
  const value = Array.isArray(header) ? header[0] : header;
  const match = value?.match(/^Bearer\s+(.+)$/i);

  return match?.[1] || null;
}
