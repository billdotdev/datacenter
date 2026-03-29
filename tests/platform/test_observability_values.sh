#!/usr/bin/env bash
set -euo pipefail

assert_contains() {
  local file=$1
  local expected=$2

  grep -Fq "$expected" "$file"
}

test -f platform/observability/kube-prometheus-stack/values.yaml
test -f platform/observability/loki/values.yaml
test -f platform/observability/promtail/values.yaml

assert_contains platform/observability/kube-prometheus-stack/values.yaml 'crds:'
assert_contains platform/observability/kube-prometheus-stack/values.yaml 'enabled: false'
assert_contains platform/observability/kube-prometheus-stack/values.yaml 'grafana:'
assert_contains platform/observability/kube-prometheus-stack/values.yaml 'resources:'
assert_contains platform/observability/kube-prometheus-stack/values.yaml 'memory: 128Mi'
assert_contains platform/observability/kube-prometheus-stack/values.yaml 'memory: 256Mi'
assert_contains platform/observability/kube-prometheus-stack/values.yaml 'retention: 7d'
assert_contains platform/observability/kube-prometheus-stack/values.yaml 'storageClassName: local-path'
assert_contains platform/observability/kube-prometheus-stack/values.yaml 'adminPassword: changeme-before-prod'
assert_contains platform/observability/kube-prometheus-stack/values.yaml 'walCompression: true'
assert_contains platform/observability/kube-prometheus-stack/values.yaml 'memory: 768Mi'
assert_contains platform/observability/kube-prometheus-stack/values.yaml 'memory: 1Gi'
assert_contains platform/observability/kube-prometheus-stack/values.yaml 'kube-state-metrics:'
assert_contains platform/observability/kube-prometheus-stack/values.yaml 'memory: 64Mi'
assert_contains platform/observability/kube-prometheus-stack/values.yaml 'prometheusOperator:'
assert_contains platform/observability/kube-prometheus-stack/values.yaml 'prometheus-node-exporter:'
assert_contains platform/observability/loki/values.yaml 'useTestSchema: true'
assert_contains platform/observability/loki/values.yaml 'retention_period: 168h'
assert_contains platform/observability/loki/values.yaml 'delete_request_store: filesystem'
assert_contains platform/observability/loki/values.yaml 'replication_factor: 1'
assert_contains platform/observability/loki/values.yaml 'deploymentMode: SingleBinary'
assert_contains platform/observability/loki/values.yaml 'singleBinary:'
assert_contains platform/observability/loki/values.yaml 'memory: 256Mi'
assert_contains platform/observability/loki/values.yaml 'memory: 512Mi'
assert_contains platform/observability/loki/values.yaml 'gateway:'
assert_contains platform/observability/loki/values.yaml 'enabled: true'
assert_contains platform/observability/loki/values.yaml 'serviceMonitor:'
assert_contains platform/observability/loki/values.yaml 'chunksCache:'
assert_contains platform/observability/loki/values.yaml 'allocatedMemory: 256'
assert_contains platform/observability/loki/values.yaml 'resultsCache:'
assert_contains platform/observability/loki/values.yaml 'allocatedMemory: 128'
assert_contains platform/observability/promtail/values.yaml 'loki-gateway.observability.svc.cluster.local'
assert_contains platform/observability/promtail/values.yaml 'pipelineStages:'
assert_contains platform/observability/promtail/values.yaml 'enabled: true'
