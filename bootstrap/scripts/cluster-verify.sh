#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${1:-bootstrap/config/datacenter.env}"

bash bootstrap/scripts/validate-env.sh "$ENV_FILE"

set -a
source "$ENV_FILE"
set +a

export KUBECONFIG="$KUBECONFIG_PATH"

kubectl get nodes
kubectl wait --for=condition=Ready nodes --all --timeout=180s
kubectl wait --for=condition=Available deployment/argocd-server -n argocd --timeout=180s
kubectl get applications -n argocd

echo "cluster verification passed"
