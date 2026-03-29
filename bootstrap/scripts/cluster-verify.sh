#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${1:-bootstrap/config/datacenter.env}"

bash bootstrap/scripts/validate-env.sh "$ENV_FILE"

set -a
source "$ENV_FILE"
set +a

export KUBECONFIG="$KUBECONFIG_PATH"

expect_jsonpath() {
  local resource="$1"
  local namespace="$2"
  local jsonpath="$3"
  local expected="$4"
  local actual=""

  if [[ -n "$namespace" ]]; then
    actual="$(kubectl get "$resource" -n "$namespace" -o "jsonpath=${jsonpath}")"
  else
    actual="$(kubectl get "$resource" -o "jsonpath=${jsonpath}")"
  fi

  if [[ "$actual" != "$expected" ]]; then
    echo "unexpected value for $resource: expected '$expected', got '$actual'" >&2
    exit 1
  fi
}

expect_application_healthy() {
  local app_name="$1"

  expect_jsonpath "application/${app_name}" "argocd" '{.status.sync.status}' 'Synced'
  expect_jsonpath "application/${app_name}" "argocd" '{.status.health.status}' 'Healthy'
}

kubectl get nodes
kubectl wait --for=condition=Ready nodes --all --timeout=180s
kubectl wait --for=condition=Available deployment/argocd-server -n argocd --timeout=180s
kubectl wait --for=condition=Available deployment/argocd-repo-server -n argocd --timeout=180s
kubectl get applications -n argocd
expect_application_healthy datacenter-root
expect_application_healthy gateway-api-crds
expect_application_healthy istio-base
expect_application_healthy istiod
expect_application_healthy metallb
expect_application_healthy metallb-config
expect_application_healthy gateway-shared
expect_application_healthy cert-manager
expect_application_healthy internal-tls
expect_application_healthy postgres-operator
expect_application_healthy postgres-cluster
expect_application_healthy prometheus-operator-crds
expect_application_healthy kube-prometheus-stack
expect_application_healthy loki
expect_application_healthy promtail
expect_application_healthy chaos-mesh

kubectl wait --for=condition=Programmed gateway.gateway.networking.k8s.io/shared-gateway -n istio-ingress --timeout=180s
kubectl wait --for=condition=Ready certificate.cert-manager.io/datacenter-root-ca -n cert-manager --timeout=180s
kubectl wait --for=condition=Ready certificate.cert-manager.io/datacenter-ingress-tls -n istio-ingress --timeout=180s
kubectl wait --for=jsonpath='{.status.readyInstances}'=3 cluster.postgresql.cnpg.io/datacenter-postgres -n database --timeout=180s
kubectl rollout status deployment/cnpg-controller-manager -n database --timeout=180s
kubectl rollout status deployment/kube-prometheus-stack-operator -n observability --timeout=180s
kubectl rollout status statefulset/loki -n observability --timeout=180s
kubectl wait --for=condition=Ready pod -n observability -l app.kubernetes.io/name=promtail --timeout=180s

echo "cluster verification passed"
