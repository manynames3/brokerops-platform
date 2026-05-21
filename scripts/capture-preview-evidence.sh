#!/usr/bin/env bash
set -euo pipefail

: "${API_URL:?Set API_URL to the deployed BrokerOps API base URL.}"
: "${WEB_URL:?Set WEB_URL to the deployed BrokerOps web app URL.}"

mkdir -p docs/evidence/generated

evidence_file="docs/evidence/generated/preview-validation.md"

{
  echo "# Preview Validation Evidence"
  echo
  echo "Captured at: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  echo
  echo "## Targets"
  echo
  echo "- API: ${API_URL}"
  echo "- Web: ${WEB_URL}"
  echo
  echo "## Git"
  echo
  echo '```text'
  git rev-parse HEAD
  git status --short
  echo '```'
  echo
  echo "## API Root"
  echo
  echo '```json'
  curl -fsS "${API_URL%/}/" || true
  echo
  echo '```'
  echo
  echo "## API Health"
  echo
  echo '```json'
  curl -fsS "${API_URL%/}/health" || true
  echo
  echo '```'
  echo
  echo "## API Readiness"
  echo
  echo '```json'
  curl -fsS "${API_URL%/}/health/readiness" || true
  echo
  echo '```'
  echo
  echo "## Web Headers"
  echo
  echo '```text'
  curl -fsSI "${WEB_URL}" || true
  echo '```'
} > "${evidence_file}"

echo "Wrote ${evidence_file}"
