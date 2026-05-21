import crypto from "node:crypto";
import { config } from "./config.js";
import { query } from "./db.js";

const passwordIterations = 120_000;
const sessionTtlSeconds = 60 * 60 * 8;

export type AuthenticatedUser = {
  id: string;
  organizationId: string;
  email: string;
  displayName: string;
  role: "admin" | "reviewer";
};

type TokenPayload = {
  sub: string;
  org: string;
  email: string;
  name: string;
  role: "admin" | "reviewer";
  exp: number;
};

type UserRecord = {
  id: string;
  organization_id: string;
  email: string;
  display_name: string;
  role: "admin" | "reviewer";
  password_hash: string;
};

export async function ensureDefaultAdminUser(organizationId: string) {
  const existing = await query<{ id: string }>(
    "SELECT id FROM app_users WHERE lower(email) = lower($1)",
    [config.authAdminEmail]
  );

  if (existing.rows[0]) {
    return;
  }

  await query(
    `
    INSERT INTO app_users (organization_id, email, display_name, role, password_hash)
    VALUES ($1, $2, $3, $4, $5)
    `,
    [
      organizationId,
      config.authAdminEmail,
      "BrokerOps Admin",
      "admin",
      hashPassword(config.authAdminPassword)
    ]
  );
}

export async function authenticateUser(email: string, password: string): Promise<AuthenticatedUser | null> {
  const result = await query<UserRecord>(
    `
    SELECT id, organization_id, email, display_name, role, password_hash
    FROM app_users
    WHERE lower(email) = lower($1)
    `,
    [email.trim()]
  );
  const user = result.rows[0];

  if (!user || !verifyPassword(password, user.password_hash)) {
    return null;
  }

  await query("UPDATE app_users SET last_login_at = now() WHERE id = $1", [user.id]);

  return {
    id: user.id,
    organizationId: user.organization_id,
    email: user.email,
    displayName: user.display_name,
    role: user.role
  };
}

export function createSessionToken(user: AuthenticatedUser) {
  const payload: TokenPayload = {
    sub: user.id,
    org: user.organizationId,
    email: user.email,
    name: user.displayName,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + sessionTtlSeconds
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(encodedPayload);

  return {
    token: `${encodedPayload}.${signature}`,
    expiresAt: new Date(payload.exp * 1000).toISOString()
  };
}

export function verifySessionToken(token: string): AuthenticatedUser | null {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature || !timingSafeEqual(signature, sign(encodedPayload))) {
    return null;
  }

  const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as TokenPayload;
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }

  return {
    id: payload.sub,
    organizationId: payload.org,
    email: payload.email,
    displayName: payload.name,
    role: payload.role
  };
}

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("base64url");
  const hash = crypto.pbkdf2Sync(password, salt, passwordIterations, 32, "sha256").toString("base64url");
  return `pbkdf2_sha256$${passwordIterations}$${salt}$${hash}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [algorithm, iterations, salt, expectedHash] = storedHash.split("$");
  if (algorithm !== "pbkdf2_sha256" || !iterations || !salt || !expectedHash) {
    return false;
  }

  const actualHash = crypto.pbkdf2Sync(password, salt, Number(iterations), 32, "sha256").toString("base64url");
  return timingSafeEqual(actualHash, expectedHash);
}

function sign(value: string) {
  return crypto
    .createHmac("sha256", config.authTokenSecret)
    .update(value)
    .digest("base64url");
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function timingSafeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}
