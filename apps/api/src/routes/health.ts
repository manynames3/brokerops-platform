import type { FastifyInstance } from "fastify";
import { query } from "../db.js";

export async function registerHealthRoutes(app: FastifyInstance) {
  app.get("/health", async () => {
    const result = await query<{ ok: number }>("SELECT 1 AS ok");
    return {
      status: "ok",
      database: result.rows[0].ok === 1 ? "ok" : "unhealthy",
      service: "brokerops-api"
    };
  });
}
