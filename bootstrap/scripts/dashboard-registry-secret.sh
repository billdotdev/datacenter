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
  GHCR_USERNAME
  GHCR_PULL_TOKEN
)

for name in "${required_vars[@]}"; do
  if [[ -z "${!name:-}" ]]; then
    echo "missing required variable: $name" >&2
    exit 1
  fi
done

export KUBECONFIG="$KUBECONFIG_PATH"

kubectl create namespace dashboard --dry-run=client -o yaml | kubectl apply -f -
kubectl create secret docker-registry regcred \
  --namespace dashboard \
  --docker-server ghcr.io \
  --docker-username "$GHCR_USERNAME" \
  --docker-password "$GHCR_PULL_TOKEN" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "dashboard registry secret applied"
