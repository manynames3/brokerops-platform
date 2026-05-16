#!/usr/bin/env bash
set -euo pipefail

: "${ECS_CLUSTER_NAME:?Set ECS_CLUSTER_NAME to the target ECS cluster name.}"
: "${ECS_TASK_DEFINITION_ARN:?Set ECS_TASK_DEFINITION_ARN to the API task definition ARN.}"
: "${ECS_SUBNET_IDS:?Set ECS_SUBNET_IDS to a comma-separated subnet list.}"
: "${ECS_SECURITY_GROUP_ID:?Set ECS_SECURITY_GROUP_ID to the ECS task security group.}"

ECS_ASSIGN_PUBLIC_IP="${ECS_ASSIGN_PUBLIC_IP:-DISABLED}"
ECS_CONTAINER_NAME="${ECS_CONTAINER_NAME:-api}"

network_configuration="awsvpcConfiguration={subnets=[$ECS_SUBNET_IDS],securityGroups=[$ECS_SECURITY_GROUP_ID],assignPublicIp=$ECS_ASSIGN_PUBLIC_IP}"
overrides="{\"containerOverrides\":[{\"name\":\"$ECS_CONTAINER_NAME\",\"command\":[\"node\",\"apps/api/dist/migrate.js\"]}]}"

echo "Starting BrokerOps database migration task in cluster ${ECS_CLUSTER_NAME}"
task_arn="$(
  aws ecs run-task \
    --cluster "$ECS_CLUSTER_NAME" \
    --task-definition "$ECS_TASK_DEFINITION_ARN" \
    --launch-type FARGATE \
    --network-configuration "$network_configuration" \
    --overrides "$overrides" \
    --query 'tasks[0].taskArn' \
    --output text
)"

if [[ -z "$task_arn" || "$task_arn" == "None" ]]; then
  echo "Migration task did not start."
  exit 1
fi

echo "Waiting for migration task ${task_arn} to stop"
aws ecs wait tasks-stopped --cluster "$ECS_CLUSTER_NAME" --tasks "$task_arn"

exit_code="$(
  aws ecs describe-tasks \
    --cluster "$ECS_CLUSTER_NAME" \
    --tasks "$task_arn" \
    --query 'tasks[0].containers[0].exitCode' \
    --output text
)"

stopped_reason="$(
  aws ecs describe-tasks \
    --cluster "$ECS_CLUSTER_NAME" \
    --tasks "$task_arn" \
    --query 'tasks[0].stoppedReason' \
    --output text
)"

if [[ "$exit_code" != "0" ]]; then
  echo "Migration task failed with exit code ${exit_code}. Stopped reason: ${stopped_reason}"
  exit 1
fi

echo "BrokerOps database migration task completed."
