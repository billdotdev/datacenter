#!/usr/bin/env bash
set -euo pipefail

assert_contains() {
  local file=$1
  local expected=$2

  grep -Fq "$expected" "$file"
}

assert_not_contains() {
  local file=$1
  local unexpected=$2

  ! grep -Fq "$unexpected" "$file"
}

test -f clusters/datacenter/platform/kustomization.yaml
test -f clusters/datacenter/platform/gateway-api-crds.yaml
test -f clusters/datacenter/platform/istio-base.yaml
test -f clusters/datacenter/platform/istiod.yaml
test -f clusters/datacenter/platform/gateway-shared.yaml
test -f clusters/datacenter/platform/cert-manager.yaml
test -f clusters/datacenter/platform/internal-tls.yaml
test -f clusters/datacenter/platform/postgres-operator.yaml
test -f clusters/datacenter/platform/postgres-cluster.yaml
test -f clusters/datacenter/platform/kube-prometheus-stack.yaml
test -f clusters/datacenter/platform/loki.yaml
test -f clusters/datacenter/platform/promtail.yaml
test -f clusters/datacenter/platform/chaos-mesh.yaml

assert_contains clusters/datacenter/kustomization.yaml '  - platform'

assert_contains clusters/datacenter/platform/kustomization.yaml 'gateway-api-crds.yaml'
assert_contains clusters/datacenter/platform/kustomization.yaml 'istiod.yaml'
assert_not_contains clusters/datacenter/platform/kustomization.yaml 'ingress-nginx.yaml'

assert_contains clusters/datacenter/platform/gateway-api-crds.yaml 'repoURL: https://github.com/kubernetes-sigs/gateway-api.git'
assert_contains clusters/datacenter/platform/gateway-api-crds.yaml 'targetRevision: v1.4.0'
assert_contains clusters/datacenter/platform/gateway-api-crds.yaml 'path: config/crd'

assert_contains clusters/datacenter/platform/istio-base.yaml 'repoURL: https://istio-release.storage.googleapis.com/charts'
assert_contains clusters/datacenter/platform/istio-base.yaml 'chart: base'
assert_contains clusters/datacenter/platform/istio-base.yaml 'targetRevision: 1.28.3'

assert_contains clusters/datacenter/platform/istiod.yaml '$values/platform/security/istio/istiod-values.yaml'
test -f platform/security/istio/istiod-values.yaml

assert_contains clusters/datacenter/platform/gateway-shared.yaml 'path: platform/security/gateway-api/shared-gateway'
test -f platform/security/gateway-api/shared-gateway/kustomization.yaml

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

assert_contains clusters/datacenter/platform/gateway-api-crds.yaml 'argocd.argoproj.io/sync-wave: "-1"'
assert_contains clusters/datacenter/platform/istio-base.yaml 'argocd.argoproj.io/sync-wave: "0"'
assert_contains clusters/datacenter/platform/istiod.yaml 'argocd.argoproj.io/sync-wave: "1"'
assert_contains clusters/datacenter/platform/gateway-shared.yaml 'argocd.argoproj.io/sync-wave: "3"'
assert_contains clusters/datacenter/platform/cert-manager.yaml 'argocd.argoproj.io/sync-wave: "1"'
assert_contains clusters/datacenter/platform/postgres-operator.yaml 'argocd.argoproj.io/sync-wave: "1"'
assert_contains clusters/datacenter/platform/kube-prometheus-stack.yaml 'argocd.argoproj.io/sync-wave: "1"'
assert_contains clusters/datacenter/platform/chaos-mesh.yaml 'argocd.argoproj.io/sync-wave: "1"'
assert_contains clusters/datacenter/platform/internal-tls.yaml 'argocd.argoproj.io/sync-wave: "2"'
assert_contains clusters/datacenter/platform/postgres-cluster.yaml 'argocd.argoproj.io/sync-wave: "2"'
assert_contains clusters/datacenter/platform/loki.yaml 'argocd.argoproj.io/sync-wave: "2"'
assert_contains clusters/datacenter/platform/promtail.yaml 'argocd.argoproj.io/sync-wave: "3"'

kubectl kustomize clusters/datacenter >/dev/null
kubectl kustomize clusters/datacenter/platform >/dev/null
kubectl kustomize platform/security/gateway-api/shared-gateway >/dev/null
kubectl kustomize platform/security/internal-tls >/dev/null
kubectl kustomize platform/data/postgres >/dev/null
