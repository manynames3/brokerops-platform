type Env = Record<string, string | undefined>;

const cloudProfiles = new Set(["demo", "preview", "production"]);

export function isCloudProfile(environment: string) {
  return cloudProfiles.has(environment);
}

export function resolveDatabaseUrl(env: Env = process.env, options: { migration?: boolean } = {}) {
  const nodeEnv = env.NODE_ENV || "development";
  const cloudProfile = isCloudProfile(nodeEnv);
  const migrationUrl = options.migration ? env.MIGRATION_DATABASE_URL : undefined;
  const variableName = migrationUrl ? "MIGRATION_DATABASE_URL" : "DATABASE_URL";
  const value =
    migrationUrl ||
    env.DATABASE_URL ||
    (!cloudProfile ? env.LOCAL_DATABASE_URL : undefined) ||
    (!cloudProfile ? "postgres://brokerops:brokerops@localhost:5432/brokerops" : undefined);

  if (!value) {
    throw new Error(`${variableName} or DATABASE_URL is required for BrokerOps demo, preview, and production API runtimes.`);
  }

  assertPostgresDatabaseUrl(value, variableName);
  return value;
}

export function assertPostgresDatabaseUrl(value: string, variableName = "DATABASE_URL") {
  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${variableName} must be a valid postgres:// or postgresql:// URL.`);
  }

  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
    throw new Error(`${variableName} must use the postgres:// or postgresql:// protocol.`);
  }

  if (isNeonHost(parsed.hostname)) {
    const sslMode = parsed.searchParams.get("sslmode");

    if (sslMode !== "require" && sslMode !== "verify-full") {
      throw new Error(`${variableName} points at Neon and must include sslmode=require or sslmode=verify-full.`);
    }
  }
}

function isNeonHost(hostname: string) {
  return hostname === "neon.tech" || hostname.endsWith(".neon.tech");
}
