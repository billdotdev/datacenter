#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${1:-bootstrap/config/datacenter.env}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "missing env file: $ENV_FILE" >&2
  exit 1
fi

set -a
source "$ENV_FILE"
set +a

required_vars=(
  KUBECONFIG_PATH
  DATABASE_URL
  BETTER_AUTH_SECRET
  BETTER_AUTH_URL
)

for name in "${required_vars[@]}"; do
  if [[ -z "${!name:-}" ]]; then
    echo "missing required variable: $name" >&2
    exit 1
  fi
done

export KUBECONFIG="$KUBECONFIG_PATH"

kubectl create namespace dashboard --dry-run=client -o yaml | kubectl apply -f -
kubectl create secret generic dashboard-app-env \
  --namespace dashboard \
  --from-literal=DATABASE_URL="$DATABASE_URL" \
  --from-literal=BETTER_AUTH_SECRET="$BETTER_AUTH_SECRET" \
  --from-literal=BETTER_AUTH_URL="$BETTER_AUTH_URL" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "dashboard app secret applied"
