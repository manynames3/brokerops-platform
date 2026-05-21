import type { FastifyInstance } from "fastify";
import { config } from "../config.js";
import { authenticateUser, createSessionToken, ensureDefaultAdminUser } from "../auth.js";
import { ensureConfiguredWorkspace } from "../workspace.js";

export async function registerAuthRoutes(app: FastifyInstance) {
  app.get("/auth/bootstrap", async () => ({
    authRequired: true,
    defaultEmail: config.nodeEnv === "development" ? config.authAdminEmail : undefined,
    workspaceName: config.workspaceName
  }));

  app.post("/auth/login", async (request, reply) => {
    const body = request.body as { email?: string; password?: string } | undefined;
    const email = body?.email?.trim() || "";
    const password = body?.password || "";

    if (!email || !password) {
      return reply.status(422).send({
        error: "missing_credentials",
        message: "Email and password are required."
      });
    }

    const workspace = await ensureConfiguredWorkspace();
    await ensureDefaultAdminUser(workspace.id);

    const user = await authenticateUser(email, password);
    if (!user) {
      return reply.status(401).send({
        error: "invalid_credentials",
        message: "Email or password is incorrect."
      });
    }

    const session = createSessionToken(user);
    return {
      token: session.token,
      expiresAt: session.expiresAt,
      user: {
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        organizationName: workspace.name
      }
    };
  });
}
