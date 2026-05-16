import Fastify from "fastify";
import cors from "@fastify/cors";
import { config } from "./config.js";
import { initializeTelemetry } from "./telemetry.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerStatementRoutes } from "./routes/statements.js";
import { registerExceptionRoutes } from "./routes/exceptions.js";

initializeTelemetry();

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });

await registerHealthRoutes(app);
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
