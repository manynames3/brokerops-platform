#!/usr/bin/env bash
set -euo pipefail

PROJECT_TAG="${PROJECT_TAG:-brokerops-platform}"
ENVIRONMENT_TAG="${ENVIRONMENT_TAG:-preview}"
AWS_REGION="${AWS_REGION:-us-east-1}"
ECR_REPOSITORY="${ECR_REPOSITORY:-brokerops-platform-api}"
ECR_PREVIEW_TAG_PREFIX="${ECR_PREVIEW_TAG_PREFIX:-preview-}"

echo "Verifying teardown for Project=${PROJECT_TAG}, Environment=${ENVIRONMENT_TAG} in ${AWS_REGION}"

mapfile -t tagged_arns < <(
  aws resourcegroupstaggingapi get-resources \
    --region "${AWS_REGION}" \
    --tag-filters "Key=Project,Values=${PROJECT_TAG}" "Key=Environment,Values=${ENVIRONMENT_TAG}" \
    --query 'ResourceTagMappingList[].ResourceARN' \
    --output text | tr '\t' '\n' | sed '/^$/d;/^None$/d'
)

if ((${#tagged_arns[@]} > 0)); then
  echo "Tagged AWS resources still exist after teardown:" >&2
  printf '  %s\n' "${tagged_arns[@]}" >&2
  exit 1
fi

if aws ecr describe-repositories \
  --region "${AWS_REGION}" \
  --repository-names "${ECR_REPOSITORY}" >/dev/null 2>&1; then
  mapfile -t preview_image_tags < <(
    aws ecr list-images \
      --region "${AWS_REGION}" \
      --repository-name "${ECR_REPOSITORY}" \
      --filter tagStatus=TAGGED \
      --query 'imageIds[].imageTag' \
      --output text | tr '\t' '\n' | grep "^${ECR_PREVIEW_TAG_PREFIX}" || true
  )

  if ((${#preview_image_tags[@]} > 0)); then
    echo "Preview ECR images still exist in ${ECR_REPOSITORY}:" >&2
    printf '  %s\n' "${preview_image_tags[@]}" >&2
    echo "Delete preview images or expire them with an ECR lifecycle policy before considering teardown complete." >&2
    exit 1
  fi
fi

echo "Teardown verification passed. No tagged preview resources or preview ECR images were found."
