export const config = {
  port: Number(process.env.PORT || 8080),
  databaseUrl:
    process.env.DATABASE_URL ||
    process.env.LOCAL_DATABASE_URL ||
    "postgres://brokerops:brokerops@localhost:5432/brokerops",
  redisUrl: process.env.REDIS_URL || process.env.LOCAL_REDIS_URL || "redis://localhost:6379",
  aiProvider: process.env.AI_PROVIDER || "local",
  aiModel: process.env.AI_MODEL || "brokerops-local-rules-v1"
};
