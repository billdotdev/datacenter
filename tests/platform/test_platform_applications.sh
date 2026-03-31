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
test -f clusters/datacenter/platform/argocd-access.yaml
test -f clusters/datacenter/platform/gateway-api-crds.yaml
test -f clusters/datacenter/platform/istio-base.yaml
test -f clusters/datacenter/platform/istiod.yaml
test -f clusters/datacenter/platform/metallb.yaml
test -f clusters/datacenter/platform/metallb-config.yaml
test -f clusters/datacenter/platform/gateway-shared.yaml
test -f clusters/datacenter/platform/cert-manager.yaml
test -f clusters/datacenter/platform/internal-tls.yaml
test -f clusters/datacenter/platform/postgres-operator.yaml
test -f clusters/datacenter/platform/postgres-cluster.yaml
test -f clusters/datacenter/platform/prometheus-operator-crds.yaml
test -f clusters/datacenter/platform/kube-prometheus-stack.yaml
test -f clusters/datacenter/platform/loki.yaml
test -f clusters/datacenter/platform/promtail.yaml
test -f clusters/datacenter/platform/chaos-mesh.yaml
test -f platform/gitops/argocd/bootstrap/argocd-cm-application-health.yaml
test -f platform/gitops/argocd/bootstrap/argocd-application-controller-resources.yaml
test -f platform/gitops/argocd/bootstrap/argocd-server-resources.yaml
test -f platform/gitops/argocd/bootstrap/argocd-dex-server-resources.yaml
test -f platform/gitops/argocd/bootstrap/argocd-redis-resources.yaml
test -f platform/gitops/argocd/bootstrap/argocd-repo-server-hardening.yaml
test -f platform/gitops/argocd/access/kustomization.yaml

assert_contains clusters/datacenter/kustomization.yaml '  - platform'
assert_not_contains clusters/datacenter/kustomization.yaml '  - root-application.yaml'
assert_contains platform/gitops/argocd/bootstrap/kustomization.yaml 'argocd-cm-application-health.yaml'
assert_contains platform/gitops/argocd/bootstrap/kustomization.yaml 'argocd-application-controller-resources.yaml'
assert_contains platform/gitops/argocd/bootstrap/kustomization.yaml 'argocd-server-resources.yaml'
assert_contains platform/gitops/argocd/bootstrap/kustomization.yaml 'argocd-dex-server-resources.yaml'
assert_contains platform/gitops/argocd/bootstrap/kustomization.yaml 'argocd-redis-resources.yaml'
assert_contains platform/gitops/argocd/bootstrap/kustomization.yaml 'argocd-repo-server-hardening.yaml'
assert_contains platform/gitops/argocd/bootstrap/argocd-cm-application-health.yaml 'kind: ConfigMap'
assert_contains platform/gitops/argocd/bootstrap/argocd-cm-application-health.yaml 'name: argocd-cm'
assert_contains platform/gitops/argocd/bootstrap/argocd-cm-application-health.yaml 'resource.customizations: |'
assert_contains platform/gitops/argocd/bootstrap/argocd-cm-application-health.yaml 'argoproj.io/Application:'
assert_contains platform/gitops/argocd/bootstrap/argocd-cm-application-health.yaml 'health.lua: |'
assert_contains platform/gitops/argocd/bootstrap/argocd-application-controller-resources.yaml 'kind: StatefulSet'
assert_contains platform/gitops/argocd/bootstrap/argocd-application-controller-resources.yaml 'name: argocd-application-controller'
assert_contains platform/gitops/argocd/bootstrap/argocd-application-controller-resources.yaml 'memory: 1Gi'
assert_contains platform/gitops/argocd/bootstrap/argocd-server-resources.yaml 'name: argocd-server'
assert_contains platform/gitops/argocd/bootstrap/argocd-server-resources.yaml 'memory: 192Mi'
assert_contains platform/gitops/argocd/bootstrap/argocd-dex-server-resources.yaml 'name: argocd-dex-server'
assert_contains platform/gitops/argocd/bootstrap/argocd-dex-server-resources.yaml 'memory: 256Mi'
assert_contains platform/gitops/argocd/bootstrap/argocd-redis-resources.yaml 'name: argocd-redis'
assert_contains platform/gitops/argocd/bootstrap/argocd-redis-resources.yaml 'memory: 128Mi'
assert_contains platform/gitops/argocd/bootstrap/argocd-repo-server-hardening.yaml 'replicas: 2'
assert_contains platform/gitops/argocd/bootstrap/argocd-repo-server-hardening.yaml 'ln -sf'
assert_contains platform/gitops/argocd/bootstrap/argocd-repo-server-hardening.yaml 'memory: 256Mi'

assert_contains clusters/datacenter/platform/kustomization.yaml 'gateway-api-crds.yaml'
assert_contains clusters/datacenter/platform/kustomization.yaml 'argocd-access.yaml'
assert_contains clusters/datacenter/platform/kustomization.yaml 'istiod.yaml'
assert_contains clusters/datacenter/platform/kustomization.yaml 'metallb.yaml'
assert_contains clusters/datacenter/platform/kustomization.yaml 'metallb-config.yaml'
assert_not_contains clusters/datacenter/platform/kustomization.yaml 'ingress-nginx.yaml'

assert_contains clusters/datacenter/platform/argocd-access.yaml 'name: argocd-access'
assert_contains clusters/datacenter/platform/argocd-access.yaml 'path: platform/gitops/argocd/access'
assert_contains clusters/datacenter/platform/argocd-access.yaml 'namespace: argocd'
assert_contains clusters/datacenter/platform/argocd-access.yaml 'ServerSideApply=true'
assert_contains platform/gitops/argocd/access/kustomization.yaml 'namespace: argocd'
assert_contains platform/gitops/argocd/access/kustomization.yaml 'argocd-cmd-params-cm-server-insecure.yaml'
assert_contains platform/gitops/argocd/access/kustomization.yaml 'argocd-server-httproute.yaml'

assert_contains clusters/datacenter/platform/gateway-api-crds.yaml 'repoURL: https://github.com/kubernetes-sigs/gateway-api.git'
assert_contains clusters/datacenter/platform/gateway-api-crds.yaml 'targetRevision: v1.4.0'
assert_contains clusters/datacenter/platform/gateway-api-crds.yaml 'path: config/crd'

assert_contains clusters/datacenter/platform/istio-base.yaml 'repoURL: https://istio-release.storage.googleapis.com/charts'
assert_contains clusters/datacenter/platform/istio-base.yaml 'chart: base'
assert_contains clusters/datacenter/platform/istio-base.yaml 'targetRevision: 1.28.3'
assert_contains clusters/datacenter/platform/istio-base.yaml 'istiod-default-validator'
assert_contains clusters/datacenter/platform/istio-base.yaml '.webhooks[]?.clientConfig.caBundle'
assert_contains clusters/datacenter/platform/istio-base.yaml '.webhooks[]?.clientConfig.service.port'
assert_contains clusters/datacenter/platform/istio-base.yaml '.webhooks[]?.failurePolicy'
assert_contains clusters/datacenter/platform/istio-base.yaml '.webhooks[]?.rules[]?.scope'

assert_contains clusters/datacenter/platform/istiod.yaml '$values/platform/security/istio/istiod-values.yaml'
assert_contains clusters/datacenter/platform/istiod.yaml 'istio-validator-istio-system'
assert_contains clusters/datacenter/platform/istiod.yaml '.webhooks[]?.clientConfig.caBundle'
assert_contains clusters/datacenter/platform/istiod.yaml '.webhooks[]?.clientConfig.service.port'
assert_contains clusters/datacenter/platform/istiod.yaml '.webhooks[]?.failurePolicy'
assert_contains clusters/datacenter/platform/istiod.yaml '.webhooks[]?.rules[]?.scope'
test -f platform/security/istio/istiod-values.yaml
assert_contains platform/security/istio/istiod-values.yaml 'global:'
assert_contains platform/security/istio/istiod-values.yaml 'platform: k3s'
assert_contains platform/security/istio/istiod-values.yaml 'accessLogFile: /dev/stdout'
assert_contains platform/security/istio/istiod-values.yaml 'replicaCount: 2'

assert_contains clusters/datacenter/platform/metallb.yaml 'repoURL: https://metallb.github.io/metallb'
assert_contains clusters/datacenter/platform/metallb.yaml 'chart: metallb'
assert_contains clusters/datacenter/platform/metallb.yaml 'targetRevision: 0.15.3'
assert_contains clusters/datacenter/platform/metallb.yaml '$values/platform/network/metallb/values.yaml'
assert_contains clusters/datacenter/platform/metallb.yaml 'namespace: metallb-system'
assert_contains clusters/datacenter/platform/metallb.yaml 'ServerSideApply=true'
test -f platform/network/metallb/values.yaml
assert_contains platform/network/metallb/values.yaml 'speaker:'
assert_contains platform/network/metallb/values.yaml 'tolerateMaster: true'

assert_contains clusters/datacenter/platform/metallb-config.yaml 'path: platform/network/metallb/config'
assert_contains clusters/datacenter/platform/metallb-config.yaml 'namespace: metallb-system'
assert_contains clusters/datacenter/platform/metallb-config.yaml 'ServerSideApply=true'
test -f platform/network/metallb/config/kustomization.yaml
test -f platform/network/metallb/config/namespace.yaml
test -f platform/network/metallb/config/ip-address-pool.yaml
test -f platform/network/metallb/config/l2-advertisement.yaml
assert_contains platform/network/metallb/config/kustomization.yaml 'namespace.yaml'
assert_contains platform/network/metallb/config/kustomization.yaml 'ip-address-pool.yaml'
assert_contains platform/network/metallb/config/kustomization.yaml 'l2-advertisement.yaml'
assert_contains platform/network/metallb/config/namespace.yaml 'name: metallb-system'
assert_contains platform/network/metallb/config/namespace.yaml 'pod-security.kubernetes.io/enforce: privileged'
assert_contains platform/network/metallb/config/ip-address-pool.yaml 'kind: IPAddressPool'
assert_contains platform/network/metallb/config/ip-address-pool.yaml 'name: lan-pool'
assert_contains platform/network/metallb/config/ip-address-pool.yaml '10.100.0.240-10.100.0.250'
assert_contains platform/network/metallb/config/l2-advertisement.yaml 'kind: L2Advertisement'
assert_contains platform/network/metallb/config/l2-advertisement.yaml 'name: lan-pool'
assert_contains platform/network/metallb/config/l2-advertisement.yaml 'ipAddressPools:'

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

assert_contains clusters/datacenter/platform/postgres-operator.yaml 'path: platform/data/cloudnative-pg/operator'
assert_contains clusters/datacenter/platform/postgres-operator.yaml 'namespace: database'
assert_contains clusters/datacenter/platform/postgres-operator.yaml 'ServerSideApply=true'
test -f platform/data/cloudnative-pg/operator/kustomization.yaml
test -f platform/data/cloudnative-pg/operator/operator-config-patch.yaml
assert_contains platform/data/cloudnative-pg/operator/kustomization.yaml 'https://raw.githubusercontent.com/cloudnative-pg/cloudnative-pg/release-1.25/releases/cnpg-1.25.4.yaml'
assert_contains platform/data/cloudnative-pg/operator/kustomization.yaml 'namespace: database'
assert_contains platform/data/cloudnative-pg/operator/kustomization.yaml 'operator-config-patch.yaml'
assert_contains platform/data/cloudnative-pg/operator/operator-config-patch.yaml 'name: cnpg-controller-manager-config'
assert_contains platform/data/cloudnative-pg/operator/operator-config-patch.yaml 'namespace: database'
assert_contains platform/data/cloudnative-pg/operator/operator-config-patch.yaml 'INHERITED_ANNOTATIONS: argocd.argoproj.io/sync-wave'

assert_contains clusters/datacenter/platform/kube-prometheus-stack.yaml '$values/platform/observability/kube-prometheus-stack/values.yaml'
assert_contains clusters/datacenter/platform/kube-prometheus-stack.yaml 'ServerSideApply=true'
test -f platform/observability/kube-prometheus-stack/values.yaml
test -f platform/observability/access/kustomization.yaml
test -f platform/observability/access/grafana-httproute.yaml
test -f platform/observability/access/prometheus-httproute.yaml
assert_contains platform/observability/kube-prometheus-stack/values.yaml 'crds:'
assert_contains platform/observability/kube-prometheus-stack/values.yaml 'enabled: false'
assert_contains clusters/datacenter/platform/kube-prometheus-stack.yaml 'path: platform/observability/access'
assert_contains platform/observability/access/kustomization.yaml 'namespace: observability'
assert_contains platform/observability/access/kustomization.yaml 'grafana-httproute.yaml'
assert_contains platform/observability/access/kustomization.yaml 'prometheus-httproute.yaml'
assert_contains platform/observability/access/grafana-httproute.yaml 'grafana.datacenter.lan'
assert_contains platform/observability/access/grafana-httproute.yaml 'kube-prometheus-stack-grafana'
assert_contains platform/observability/access/prometheus-httproute.yaml 'prometheus.datacenter.lan'
assert_contains platform/observability/access/prometheus-httproute.yaml 'kube-prometheus-stack-prometheus'

assert_contains clusters/datacenter/platform/prometheus-operator-crds.yaml 'chart: prometheus-operator-crds'
assert_contains clusters/datacenter/platform/prometheus-operator-crds.yaml 'targetRevision: 25.0.0'
assert_contains clusters/datacenter/platform/prometheus-operator-crds.yaml 'ServerSideApply=true'

assert_contains clusters/datacenter/platform/loki.yaml '$values/platform/observability/loki/values.yaml'
test -f platform/observability/loki/values.yaml
assert_contains platform/observability/loki/values.yaml 'useTestSchema: true'

assert_contains clusters/datacenter/platform/promtail.yaml '$values/platform/observability/promtail/values.yaml'
test -f platform/observability/promtail/values.yaml

assert_contains clusters/datacenter/platform/chaos-mesh.yaml '$values/platform/chaos/chaos-mesh/values.yaml'
assert_contains clusters/datacenter/platform/chaos-mesh.yaml 'targetRevision: 2.7.3'
assert_contains clusters/datacenter/platform/chaos-mesh.yaml 'cert-manager.io/v1'
assert_contains clusters/datacenter/platform/chaos-mesh.yaml 'ServerSideApply=true'
assert_contains clusters/datacenter/platform/chaos-mesh.yaml 'ignoreDifferences:'
assert_contains clusters/datacenter/platform/chaos-mesh.yaml '/spec/template/metadata/annotations/rollme'
assert_contains clusters/datacenter/platform/chaos-mesh.yaml 'chaos-mesh-mutation'
assert_contains clusters/datacenter/platform/chaos-mesh.yaml 'chaos-mesh-validation'
assert_contains clusters/datacenter/platform/chaos-mesh.yaml 'kind: Secret'
assert_contains clusters/datacenter/platform/chaos-mesh.yaml 'name: chaos-mesh-chaosd-client-certs'
assert_contains clusters/datacenter/platform/chaos-mesh.yaml 'namespace: chaos-mesh'
assert_contains clusters/datacenter/platform/chaos-mesh.yaml 'chaos-mesh-validation-auth'
assert_contains clusters/datacenter/platform/chaos-mesh.yaml '.webhooks[]?.clientConfig.caBundle'
assert_contains clusters/datacenter/platform/chaos-mesh.yaml '.webhooks[]?.clientConfig.service.port'
assert_contains clusters/datacenter/platform/chaos-mesh.yaml '.webhooks[]?.failurePolicy'
assert_contains clusters/datacenter/platform/chaos-mesh.yaml '.webhooks[]?.reinvocationPolicy'
assert_contains clusters/datacenter/platform/chaos-mesh.yaml '.webhooks[]?.rules[]?.scope'
test -f platform/chaos/chaos-mesh/values.yaml
assert_contains platform/chaos/chaos-mesh/values.yaml 'mtls:'
assert_contains platform/chaos/chaos-mesh/values.yaml 'enabled: false'
assert_contains platform/chaos/chaos-mesh/values.yaml 'certManager:'
assert_contains platform/chaos/chaos-mesh/values.yaml 'enabled: true'

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
assert_contains clusters/datacenter/platform/metallb.yaml 'argocd.argoproj.io/sync-wave: "1"'
assert_contains clusters/datacenter/platform/metallb-config.yaml 'argocd.argoproj.io/sync-wave: "2"'
assert_contains clusters/datacenter/platform/gateway-shared.yaml 'argocd.argoproj.io/sync-wave: "3"'
assert_contains clusters/datacenter/platform/cert-manager.yaml 'argocd.argoproj.io/sync-wave: "1"'
assert_contains clusters/datacenter/platform/postgres-operator.yaml 'argocd.argoproj.io/sync-wave: "1"'
assert_contains clusters/datacenter/platform/chaos-mesh.yaml 'argocd.argoproj.io/sync-wave: "1"'
assert_contains clusters/datacenter/platform/internal-tls.yaml 'argocd.argoproj.io/sync-wave: "2"'
assert_contains clusters/datacenter/platform/postgres-cluster.yaml 'argocd.argoproj.io/sync-wave: "2"'
assert_contains clusters/datacenter/platform/prometheus-operator-crds.yaml 'argocd.argoproj.io/sync-wave: "1"'
assert_contains clusters/datacenter/platform/kube-prometheus-stack.yaml 'argocd.argoproj.io/sync-wave: "2"'
assert_contains clusters/datacenter/platform/loki.yaml 'argocd.argoproj.io/sync-wave: "2"'
assert_contains clusters/datacenter/platform/promtail.yaml 'argocd.argoproj.io/sync-wave: "3"'

kubectl kustomize clusters/datacenter >/dev/null
kubectl kustomize clusters/datacenter/platform >/dev/null
kubectl kustomize platform/observability/access >/dev/null
kubectl kustomize platform/network/metallb/config >/dev/null
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
