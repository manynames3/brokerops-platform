#!/usr/bin/env bash
set -euo pipefail

PROJECT_TAG="${PROJECT_TAG:-brokerops-platform}"
AWS_REGION="${AWS_REGION:-us-east-1}"

echo "Verifying teardown for ${PROJECT_TAG} in ${AWS_REGION}"

aws resourcegroupstaggingapi get-resources   --region "${AWS_REGION}"   --tag-filters Key=Project,Values="${PROJECT_TAG}"   --query 'ResourceTagMappingList[].ResourceARN'   --output table || true

echo "Teardown verification completed. Empty output means no tagged resources were found."
