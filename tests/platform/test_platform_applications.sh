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

assert_no_duplicate_resources() {
  local rendered=$1
  local duplicates

  duplicates=$(
    awk '
      BEGIN {
        RS="---"
        FS="\n"
      }
      {
        apiVersion=""
        kind=""
        name=""
        namespace=""
        inMetadata=0

        for (i = 1; i <= NF; i++) {
          line = $i
          sub(/\r$/, "", line)

          if (line == "metadata:") {
            inMetadata=1
            continue
          }

          if (line ~ /^[^ ]/ && line != "metadata:") {
            inMetadata=0
          }

          if (line ~ /^apiVersion:/ && apiVersion == "") {
            sub(/^apiVersion:[[:space:]]*/, "", line)
            apiVersion=line
          } else if (line ~ /^kind:/ && kind == "") {
            sub(/^kind:[[:space:]]*/, "", line)
            kind=line
          } else if (inMetadata && line ~ /^  name:/ && name == "") {
            sub(/^  name:[[:space:]]*/, "", line)
            name=line
          } else if (inMetadata && line ~ /^  namespace:/ && namespace == "") {
            sub(/^  namespace:[[:space:]]*/, "", line)
            namespace=line
          }
        }

        if (apiVersion != "" && kind != "" && name != "") {
          if (namespace == "") {
            namespace="_cluster"
          }
          print apiVersion "|" kind "|" namespace "|" name
        }
      }
    ' "$rendered" | sort | uniq -d
  )

  test -z "$duplicates"
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
test -f platform/gitops/argocd/bootstrap/argocd-cm-application-health.yaml

assert_contains clusters/datacenter/kustomization.yaml '  - platform'
assert_contains platform/gitops/argocd/bootstrap/kustomization.yaml 'argocd-cm-application-health.yaml'
assert_contains platform/gitops/argocd/bootstrap/argocd-cm-application-health.yaml 'kind: ConfigMap'
assert_contains platform/gitops/argocd/bootstrap/argocd-cm-application-health.yaml 'name: argocd-cm'
assert_contains platform/gitops/argocd/bootstrap/argocd-cm-application-health.yaml 'resource.customizations: |'
assert_contains platform/gitops/argocd/bootstrap/argocd-cm-application-health.yaml 'argoproj.io/Application:'
assert_contains platform/gitops/argocd/bootstrap/argocd-cm-application-health.yaml 'health.lua: |'

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
assert_contains platform/security/istio/istiod-values.yaml 'global:'
assert_contains platform/security/istio/istiod-values.yaml 'platform: k3s'
assert_contains platform/security/istio/istiod-values.yaml 'accessLogFile: /dev/stdout'
assert_contains platform/security/istio/istiod-values.yaml 'replicaCount: 2'

assert_contains clusters/datacenter/platform/gateway-shared.yaml 'path: platform/security/gateway-api/shared-gateway'
test -f platform/security/gateway-api/shared-gateway/kustomization.yaml
test -f platform/security/gateway-api/shared-gateway/gateway.yaml
assert_contains platform/security/gateway-api/shared-gateway/kustomization.yaml 'gateway.yaml'
assert_not_contains platform/security/gateway-api/shared-gateway/kustomization.yaml 'namespace.yaml'
assert_not_contains platform/security/gateway-api/shared-gateway/kustomization.yaml 'placeholder-configmap.yaml'
assert_contains platform/security/gateway-api/shared-gateway/gateway.yaml 'kind: Gateway'
assert_contains platform/security/gateway-api/shared-gateway/gateway.yaml 'name: shared-gateway'
assert_contains platform/security/gateway-api/shared-gateway/gateway.yaml 'namespace: istio-ingress'
assert_contains platform/security/gateway-api/shared-gateway/gateway.yaml 'gatewayClassName: istio'
assert_contains platform/security/gateway-api/shared-gateway/gateway.yaml 'name: http'
assert_contains platform/security/gateway-api/shared-gateway/gateway.yaml 'port: 80'
assert_contains platform/security/gateway-api/shared-gateway/gateway.yaml 'name: https'
assert_contains platform/security/gateway-api/shared-gateway/gateway.yaml 'port: 443'
assert_contains platform/security/gateway-api/shared-gateway/gateway.yaml 'certificateRefs:'
assert_contains platform/security/gateway-api/shared-gateway/gateway.yaml 'name: datacenter-ingress-tls'
assert_contains platform/security/gateway-api/shared-gateway/gateway.yaml 'from: All'

assert_contains clusters/datacenter/platform/cert-manager.yaml '$values/platform/security/cert-manager/values.yaml'
test -f platform/security/cert-manager/values.yaml

assert_contains clusters/datacenter/platform/postgres-operator.yaml '$values/platform/data/cloudnative-pg/values.yaml'
assert_contains clusters/datacenter/platform/postgres-operator.yaml 'ServerSideApply=true'
test -f platform/data/cloudnative-pg/values.yaml
assert_contains platform/data/cloudnative-pg/values.yaml 'INHERITED_ANNOTATIONS: argocd.argoproj.io/sync-wave'
assert_contains platform/data/cloudnative-pg/values.yaml 'podMonitorEnabled: true'
assert_contains platform/data/cloudnative-pg/values.yaml 'create: true'

assert_contains clusters/datacenter/platform/kube-prometheus-stack.yaml '$values/platform/observability/kube-prometheus-stack/values.yaml'
test -f platform/observability/kube-prometheus-stack/values.yaml

assert_contains clusters/datacenter/platform/loki.yaml '$values/platform/observability/loki/values.yaml'
test -f platform/observability/loki/values.yaml

assert_contains clusters/datacenter/platform/promtail.yaml '$values/platform/observability/promtail/values.yaml'
test -f platform/observability/promtail/values.yaml

assert_contains clusters/datacenter/platform/chaos-mesh.yaml '$values/platform/chaos/chaos-mesh/values.yaml'
assert_contains clusters/datacenter/platform/chaos-mesh.yaml 'ServerSideApply=true'
test -f platform/chaos/chaos-mesh/values.yaml

assert_contains clusters/datacenter/platform/internal-tls.yaml 'path: platform/security/internal-tls'
test -f platform/security/internal-tls/kustomization.yaml
test -f platform/security/internal-tls/namespace.yaml
test -f platform/security/internal-tls/ingress-certificate.yaml
assert_contains platform/security/internal-tls/kustomization.yaml 'namespace.yaml'
assert_contains platform/security/internal-tls/namespace.yaml 'name: istio-ingress'
assert_contains platform/security/internal-tls/kustomization.yaml 'ingress-certificate.yaml'
assert_contains platform/security/internal-tls/ingress-certificate.yaml 'name: datacenter-ingress-tls'
assert_contains platform/security/internal-tls/ingress-certificate.yaml 'namespace: istio-ingress'
assert_contains platform/security/internal-tls/ingress-certificate.yaml 'secretName: datacenter-ingress-tls'

assert_contains clusters/datacenter/platform/postgres-cluster.yaml 'path: platform/data/postgres'
test -f platform/data/postgres/kustomization.yaml
test -f platform/data/postgres/cluster.yaml
test -f platform/data/postgres/backup-schedule.yaml
assert_contains platform/data/postgres/kustomization.yaml 'cluster.yaml'
assert_contains platform/data/postgres/kustomization.yaml 'backup-schedule.yaml'
assert_not_contains platform/data/postgres/kustomization.yaml 'placeholder-configmap.yaml'
assert_contains platform/data/postgres/cluster.yaml 'kind: Cluster'
assert_contains platform/data/postgres/cluster.yaml 'name: datacenter-postgres'
assert_contains platform/data/postgres/cluster.yaml 'storageClass: local-path'
assert_contains platform/data/postgres/cluster.yaml 'enablePodMonitor: true'
assert_contains platform/data/postgres/backup-schedule.yaml 'kind: ScheduledBackup'
assert_contains platform/data/postgres/backup-schedule.yaml 'name: datacenter-postgres-daily'

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

rendered_resources=$(mktemp)
trap 'rm -f "$rendered_resources"' EXIT
{
  kubectl kustomize platform/security/internal-tls
  kubectl kustomize platform/security/gateway-api/shared-gateway
} >"$rendered_resources"
assert_no_duplicate_resources "$rendered_resources"
