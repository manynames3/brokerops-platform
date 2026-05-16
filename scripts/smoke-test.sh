#!/usr/bin/env bash
set -euo pipefail

API_URL="${API_URL:-http://localhost:8080}"

echo "Running BrokerOps API workflow smoke test against ${API_URL}"
node scripts/api-workflow-smoke.mjs
