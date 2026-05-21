import Fastify from "fastify";
import cors from "@fastify/cors";
import { config } from "./config.js";
import { initializeTelemetry } from "./telemetry.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerStatementRoutes } from "./routes/statements.js";
import { registerExceptionRoutes } from "./routes/exceptions.js";
import { registerDashboardRoutes } from "./routes/dashboard.js";
import { registerPolicyRoutes } from "./routes/policies.js";
import { workspaceHeaderName } from "./workspace.js";

initializeTelemetry();

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: config.corsOrigins,
  allowedHeaders: ["content-type", workspaceHeaderName],
  methods: ["GET", "POST", "PATCH", "OPTIONS"]
});

app.get("/", async () => ({
  service: "brokerops-api",
  product: "BrokerOps Platform",
  purpose: "Insurance carrier statement reconciliation API",
  webAppUrl: config.webAppUrl,
  healthUrl: "/health",
  workspaceHeader: workspaceHeaderName,
  workspaceRequiredForOperationalRoutes: true,
  workflow: [
    "POST /policies/import",
    "POST /statements/import",
    "GET /exceptions",
    "GET /exceptions/report.csv",
    "POST /exceptions/:id/ai-review",
    "PATCH /exceptions/:id/review"
  ]
}));

await registerHealthRoutes(app);
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
