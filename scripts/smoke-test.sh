#!/usr/bin/env bash
set -euo pipefail

API_URL="${API_URL:-http://localhost:8080}"

echo "Checking API health at ${API_URL}/health"
curl -fsS "${API_URL}/health" | tee /tmp/brokerops-health.json

echo "Checking exception endpoint"
curl -fsS "${API_URL}/exceptions" | tee /tmp/brokerops-exceptions.json

echo "Smoke checks passed"
