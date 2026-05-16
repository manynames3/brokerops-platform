#!/usr/bin/env bash
set -euo pipefail

: "${API_URL:?Set API_URL to the BrokerOps API base URL before running smoke tests.}"

echo "Running BrokerOps API workflow smoke test against ${API_URL}"
node scripts/api-workflow-smoke.mjs
