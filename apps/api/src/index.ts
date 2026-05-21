import crypto from "node:crypto";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { config } from "./config.js";
import { initializeTelemetry } from "./telemetry.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerStatementRoutes } from "./routes/statements.js";
import { registerExceptionRoutes } from "./routes/exceptions.js";
import { registerDashboardRoutes } from "./routes/dashboard.js";
import { registerPolicyRoutes } from "./routes/policies.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { authHeaderName, workspaceHeaderName } from "./workspace.js";

initializeTelemetry();

const app = Fastify({ logger: true });

app.addHook("onRequest", async (request, reply) => {
  const incomingRequestId = request.headers["x-request-id"];
  const requestId = Array.isArray(incomingRequestId) ? incomingRequestId[0] : incomingRequestId;
  reply.header("x-request-id", requestId || crypto.randomUUID());
});

await app.register(cors, {
  origin: config.corsOrigins,
  allowedHeaders: ["content-type", "x-request-id", authHeaderName, workspaceHeaderName],
  methods: ["GET", "POST", "PATCH", "OPTIONS"]
});

app.get("/", async () => ({
  service: "brokerops-api",
  product: "BrokerOps Platform",
  purpose: "Insurance carrier statement reconciliation API",
  webAppUrl: config.webAppUrl,
  healthUrl: "/health",
  authUrl: "/auth/login",
  workspaceHeader: workspaceHeaderName,
  authRequiredForOperationalRoutes: true,
  workflow: [
    "POST /auth/login",
    "POST /policies/import",
    "POST /statements/import",
    "GET /exceptions",
    "GET /exceptions/report.csv",
    "POST /exceptions/:id/ai-review",
    "PATCH /exceptions/:id/review"
  ]
}));

await registerHealthRoutes(app);
await registerAuthRoutes(app);
await registerDashboardRoutes(app);
await registerPolicyRoutes(app);
await registerStatementRoutes(app);
await registerExceptionRoutes(app);

app.setErrorHandler((error, request, reply) => {
  request.log.error(error);
  reply.status(500).send({
    error: "internal_error",
    message: "The request could not be completed."
  });
});

await app.listen({ port: config.port, host: "0.0.0.0" });
