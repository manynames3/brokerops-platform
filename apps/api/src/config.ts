import { isCloudProfile, resolveDatabaseUrl } from "./databaseUrl.js";

const nodeEnv = process.env.NODE_ENV || "development";
const isCloudRuntime = isCloudProfile(nodeEnv);

const databaseUrl = resolveDatabaseUrl(process.env);

const redisUrl =
  process.env.REDIS_URL ||
  (!isCloudRuntime ? process.env.LOCAL_REDIS_URL : undefined) ||
  (!isCloudRuntime ? "redis://localhost:6379" : undefined);

const workspaceApiKey =
  process.env.WORKSPACE_API_KEY ||
  (!isCloudRuntime ? "brokerops-local-demo-key" : undefined);

const authTokenSecret =
  process.env.AUTH_TOKEN_SECRET ||
  (!isCloudRuntime ? "brokerops-local-auth-secret-change-me" : undefined);

const authAdminPassword =
  process.env.AUTH_ADMIN_PASSWORD ||
  (!isCloudRuntime ? "brokerops-demo-password" : undefined);

if (!redisUrl) {
  throw new Error("REDIS_URL is required for BrokerOps demo, preview, and production API runtimes.");
}

if (!workspaceApiKey) {
  throw new Error("WORKSPACE_API_KEY is required for BrokerOps demo, preview, and production API runtimes.");
}

if (!authTokenSecret) {
  throw new Error("AUTH_TOKEN_SECRET is required for BrokerOps demo, preview, and production API runtimes.");
}

if (!authAdminPassword) {
  throw new Error("AUTH_ADMIN_PASSWORD is required for BrokerOps demo, preview, and production API runtimes.");
}

export const config = {
  nodeEnv,
  port: Number(process.env.PORT || 8080),
  databaseUrl,
  redisUrl,
  webAppUrl: process.env.WEB_APP_URL || "http://localhost:3000",
  workspaceApiKey,
  workspaceName: process.env.WORKSPACE_NAME || "BrokerOps Demo Workspace",
  authTokenSecret,
  authAdminEmail: process.env.AUTH_ADMIN_EMAIL || "ops@brokerops.local",
  authAdminPassword,
  aiProvider: process.env.AI_PROVIDER || "local",
  aiModel: process.env.AI_MODEL || "brokerops-local-rules-v1",
  corsOrigins: parseCorsOrigins(process.env.API_ALLOWED_ORIGINS, nodeEnv)
};

function parseCorsOrigins(value: string | undefined, environment: string) {
  const origins = (value || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length > 0) {
    return origins;
  }

  return environment === "production" ? [] : true;
}
