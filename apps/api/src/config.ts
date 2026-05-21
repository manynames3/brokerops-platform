const nodeEnv = process.env.NODE_ENV || "development";
const isCloudProfile = nodeEnv === "preview" || nodeEnv === "production";

const databaseUrl =
  process.env.DATABASE_URL ||
  (!isCloudProfile ? process.env.LOCAL_DATABASE_URL : undefined) ||
  (!isCloudProfile ? "postgres://brokerops:brokerops@localhost:5432/brokerops" : undefined);

const redisUrl =
  process.env.REDIS_URL ||
  (!isCloudProfile ? process.env.LOCAL_REDIS_URL : undefined) ||
  (!isCloudProfile ? "redis://localhost:6379" : undefined);

const workspaceApiKey =
  process.env.WORKSPACE_API_KEY ||
  (!isCloudProfile ? "brokerops-local-demo-key" : undefined);

const authTokenSecret =
  process.env.AUTH_TOKEN_SECRET ||
  (!isCloudProfile ? "brokerops-local-auth-secret-change-me" : undefined);

const authAdminPassword =
  process.env.AUTH_ADMIN_PASSWORD ||
  (!isCloudProfile ? "brokerops-demo-password" : undefined);

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for BrokerOps preview and production API runtimes.");
}

if (!redisUrl) {
  throw new Error("REDIS_URL is required for BrokerOps preview and production API runtimes.");
}

if (!workspaceApiKey) {
  throw new Error("WORKSPACE_API_KEY is required for BrokerOps preview and production API runtimes.");
}

if (!authTokenSecret) {
  throw new Error("AUTH_TOKEN_SECRET is required for BrokerOps preview and production API runtimes.");
}

if (!authAdminPassword) {
  throw new Error("AUTH_ADMIN_PASSWORD is required for BrokerOps preview and production API runtimes.");
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
