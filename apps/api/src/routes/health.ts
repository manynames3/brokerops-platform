import type { FastifyInstance } from "fastify";
import { query } from "../db.js";

export async function registerHealthRoutes(app: FastifyInstance) {
  app.get("/health", async () => {
    const result = await query<{ ok: number }>("SELECT 1 AS ok");
    return {
      status: "ok",
      database: result.rows[0].ok === 1 ? "ok" : "unhealthy",
      service: "brokerops-api",
      checkedAt: new Date().toISOString()
    };
  });

  app.get("/health/readiness", async () => {
    const result = await query<{ migrations: number }>("SELECT count(*)::int AS migrations FROM pg_tables WHERE schemaname = 'public'");
    return {
      status: result.rows[0].migrations > 0 ? "ready" : "not_ready",
      database: "reachable",
      tablesDetected: result.rows[0].migrations,
      checkedAt: new Date().toISOString()
    };
  });
}
