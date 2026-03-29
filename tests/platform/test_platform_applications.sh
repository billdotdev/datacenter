#!/usr/bin/env bash
set -euo pipefail

assert_contains() {
  local file=$1
  local expected=$2

  grep -Fq "$expected" "$file"
}

test -f clusters/datacenter/platform/kustomization.yaml
test -f clusters/datacenter/platform/ingress-nginx.yaml
test -f clusters/datacenter/platform/cert-manager.yaml
test -f clusters/datacenter/platform/internal-tls.yaml
test -f clusters/datacenter/platform/postgres-operator.yaml
test -f clusters/datacenter/platform/postgres-cluster.yaml
test -f clusters/datacenter/platform/kube-prometheus-stack.yaml
test -f clusters/datacenter/platform/loki.yaml
test -f clusters/datacenter/platform/promtail.yaml
test -f clusters/datacenter/platform/chaos-mesh.yaml

assert_contains clusters/datacenter/platform/ingress-nginx.yaml '$values/platform/security/ingress-nginx/values.yaml'
test -f platform/security/ingress-nginx/values.yaml

assert_contains clusters/datacenter/platform/cert-manager.yaml '$values/platform/security/cert-manager/values.yaml'
test -f platform/security/cert-manager/values.yaml

assert_contains clusters/datacenter/platform/postgres-operator.yaml '$values/platform/data/cloudnative-pg/values.yaml'
test -f platform/data/cloudnative-pg/values.yaml

assert_contains clusters/datacenter/platform/kube-prometheus-stack.yaml '$values/platform/observability/kube-prometheus-stack/values.yaml'
test -f platform/observability/kube-prometheus-stack/values.yaml

assert_contains clusters/datacenter/platform/loki.yaml '$values/platform/observability/loki/values.yaml'
test -f platform/observability/loki/values.yaml

assert_contains clusters/datacenter/platform/promtail.yaml '$values/platform/observability/promtail/values.yaml'
test -f platform/observability/promtail/values.yaml

assert_contains clusters/datacenter/platform/chaos-mesh.yaml '$values/platform/chaos/chaos-mesh/values.yaml'
test -f platform/chaos/chaos-mesh/values.yaml

assert_contains clusters/datacenter/platform/internal-tls.yaml 'path: platform/security/internal-tls'
test -f platform/security/internal-tls/kustomization.yaml

assert_contains clusters/datacenter/platform/postgres-cluster.yaml 'path: platform/data/postgres'
test -f platform/data/postgres/kustomization.yaml

assert_contains clusters/datacenter/platform/cert-manager.yaml 'argocd.argoproj.io/sync-wave: "0"'
assert_contains clusters/datacenter/platform/kube-prometheus-stack.yaml 'argocd.argoproj.io/sync-wave: "0"'
assert_contains clusters/datacenter/platform/ingress-nginx.yaml 'argocd.argoproj.io/sync-wave: "1"'
assert_contains clusters/datacenter/platform/postgres-operator.yaml 'argocd.argoproj.io/sync-wave: "0"'
assert_contains clusters/datacenter/platform/internal-tls.yaml 'argocd.argoproj.io/sync-wave: "1"'
assert_contains clusters/datacenter/platform/postgres-cluster.yaml 'argocd.argoproj.io/sync-wave: "1"'
assert_contains clusters/datacenter/platform/loki.yaml 'argocd.argoproj.io/sync-wave: "1"'
assert_contains clusters/datacenter/platform/promtail.yaml 'argocd.argoproj.io/sync-wave: "2"'

kubectl kustomize clusters/datacenter >/dev/null
kubectl kustomize clusters/datacenter/platform >/dev/null
kubectl kustomize platform/security/internal-tls >/dev/null
kubectl kustomize platform/data/postgres >/dev/null
