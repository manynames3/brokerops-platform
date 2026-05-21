#!/usr/bin/env node

const apiUrl = (process.env.API_URL || "http://localhost:8080").replace(/\/$/, "");
const workspaceApiKey = process.env.WORKSPACE_API_KEY || "brokerops-local-demo-key";
const runId = process.env.SMOKE_RUN_ID || `${Date.now()}`;
const externalPolicyId = `SMOKE-${runId}`;
const fileName = `smoke-${runId}.csv`;

async function main() {
  const health = await request("GET", "/health");
  assertEqual(health.status, "ok", "health status");
  assertEqual(health.database, "ok", "database status");

  const initialSummary = await request("GET", "/dashboard/summary");
  assertType(initialSummary.summary, "object", "dashboard summary");

  const policyCsv = [
    "external_policy_id,account_name,expected_commission_rate,effective_date",
    `${externalPolicyId},Smoke Test Account,12%,2025-01-01`
  ].join("\n");

  const importedPolicies = await request("POST", "/policies/import", {
    carrierName: "Smoke Test Carrier",
    actor: "smoke-test",
    csv: policyCsv
  }, 201);

  assertEqual(importedPolicies.ok, true, "policy import ok");
  assertEqual(importedPolicies.importedPolicies, 1, "imported policy count");

  const csv = [
    "external_policy_id,account_name,payment_date,premium_cents,commission_rate,commission_amount_cents",
    `${externalPolicyId},Smoke Test Account,2026-01-15,100000,10%,10000`
  ].join("\n");

  const imported = await request("POST", "/statements/import", {
    carrierName: "Smoke Test Carrier",
    fileName,
    actor: "smoke-test",
    csv
  }, 201);

  assertEqual(imported.ok, true, "import ok");
  assertEqual(imported.importedRows, 1, "imported row count");
  assertEqual(imported.exceptionsCreated, 1, "created exception count");

  const exceptionId = imported.exceptions?.[0]?.id;
  if (!exceptionId) {
    throw new Error("statement import did not return an exception id");
  }

  const exceptions = await request("GET", "/exceptions");
  if (!exceptions.exceptions.some((item) => item.id === exceptionId)) {
    throw new Error(`exception ${exceptionId} was not returned from /exceptions`);
  }

  const reviewed = await request("POST", `/exceptions/${exceptionId}/ai-review`, undefined, 200);
  assertEqual(reviewed.review.exceptionId, exceptionId, "ai review exception id");
  assertEqual(reviewed.review.reviewStatus, "complete", "ai review status");
  assertEqual(reviewed.review.promptVersion, "exception-review-v1", "ai review prompt version");

  const updated = await request("PATCH", `/exceptions/${exceptionId}/review`, {
    status: "in_review",
    actor: "smoke-test",
    note: "Smoke workflow verified API review transition."
  });
  assertEqual(updated.exception.status, "in_review", "review status");

  const detail = await request("GET", `/exceptions/${exceptionId}`);
  assertEqual(detail.exception.id, exceptionId, "exception detail id");

  const auditActions = detail.auditEvents.map((event) => event.action);
  if (!auditActions.includes("ai_review_created")) {
    throw new Error("exception detail did not include ai_review_created audit event");
  }
  if (!auditActions.includes("exception_status_changed")) {
    throw new Error("exception detail did not include exception_status_changed audit event");
  }

  console.log(JSON.stringify({
    status: "passed",
    apiUrl,
    statementFileId: imported.statementFileId,
    exceptionId
  }, null, 2));
}

async function request(method, path, body, expectedStatus = 200) {
  const response = await fetch(`${apiUrl}${path}`, {
    method,
    headers: {
      "x-brokerops-workspace-key": workspaceApiKey,
      ...(body ? { "content-type": "application/json" } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const text = await response.text();
  const parsed = text ? JSON.parse(text) : {};

  if (response.status !== expectedStatus) {
    throw new Error(`${method} ${path} returned ${response.status}, expected ${expectedStatus}: ${text}`);
  }

  return parsed;
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label} expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertType(value, expectedType, label) {
  if (typeof value !== expectedType || value === null) {
    throw new Error(`${label} expected ${expectedType}, got ${JSON.stringify(value)}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
