import assert from "node:assert/strict";
import { resolveDatabaseUrl } from "../databaseUrl.js";

assert.equal(
  resolveDatabaseUrl({ NODE_ENV: "development" }),
  "postgres://brokerops:brokerops@localhost:5432/brokerops"
);

assert.throws(
  () => resolveDatabaseUrl({ NODE_ENV: "demo" }),
  /DATABASE_URL/
);

assert.throws(
  () => resolveDatabaseUrl({
    NODE_ENV: "demo",
    DATABASE_URL: "postgresql://user:password@ep-demo.us-east-1.aws.neon.tech/neondb"
  }),
  /sslmode=require/
);

assert.equal(
  resolveDatabaseUrl({
    NODE_ENV: "demo",
    DATABASE_URL: "postgresql://user:password@ep-demo.us-east-1.aws.neon.tech/neondb?sslmode=require"
  }),
  "postgresql://user:password@ep-demo.us-east-1.aws.neon.tech/neondb?sslmode=require"
);

assert.equal(
  resolveDatabaseUrl({
    NODE_ENV: "demo",
    DATABASE_URL: "postgresql://user:password@ep-demo-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require",
    MIGRATION_DATABASE_URL: "postgresql://user:password@ep-demo.us-east-1.aws.neon.tech/neondb?sslmode=require"
  }, { migration: true }),
  "postgresql://user:password@ep-demo.us-east-1.aws.neon.tech/neondb?sslmode=require"
);

console.log("database URL tests passed");
