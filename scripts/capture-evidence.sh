#!/usr/bin/env bash
set -euo pipefail

mkdir -p docs/evidence/generated

{
  echo "# Evidence Capture"
  echo
  echo "Captured at: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  echo
  echo "## Git"
  git rev-parse --short HEAD 2>/dev/null || true
  echo
  echo "## Local smoke check"
  curl -fsS "${API_URL:-http://localhost:8080}/health" || true
} > docs/evidence/generated/evidence-capture.md

echo "Wrote docs/evidence/generated/evidence-capture.md"
