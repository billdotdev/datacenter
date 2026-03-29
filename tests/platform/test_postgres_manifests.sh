#!/usr/bin/env bash
set -euo pipefail

assert_contains() {
  local file=$1
  local expected=$2

  grep -Fq "$expected" "$file"
}

test -f platform/data/cloudnative-pg/operator/kustomization.yaml
test -f platform/data/cloudnative-pg/operator/operator-config-patch.yaml
test -f platform/data/postgres/kustomization.yaml
test -f platform/data/postgres/cluster.yaml
test -f platform/data/postgres/backup-schedule.yaml

assert_contains platform/data/cloudnative-pg/operator/kustomization.yaml 'https://raw.githubusercontent.com/cloudnative-pg/cloudnative-pg/release-1.25/releases/cnpg-1.25.4.yaml'
assert_contains platform/data/cloudnative-pg/operator/kustomization.yaml 'namespace: database'
assert_contains platform/data/cloudnative-pg/operator/kustomization.yaml 'operator-config-patch.yaml'
assert_contains platform/data/cloudnative-pg/operator/operator-config-patch.yaml 'name: cnpg-controller-manager-config'
assert_contains platform/data/cloudnative-pg/operator/operator-config-patch.yaml 'namespace: database'
assert_contains platform/data/cloudnative-pg/operator/operator-config-patch.yaml 'INHERITED_ANNOTATIONS: argocd.argoproj.io/sync-wave'

assert_contains platform/data/postgres/kustomization.yaml 'cluster.yaml'
assert_contains platform/data/postgres/kustomization.yaml 'backup-schedule.yaml'

assert_contains platform/data/postgres/cluster.yaml 'kind: Cluster'
assert_contains platform/data/postgres/cluster.yaml 'name: datacenter-postgres'
assert_contains platform/data/postgres/cluster.yaml 'namespace: database'
assert_contains platform/data/postgres/cluster.yaml 'instances: 3'
assert_contains platform/data/postgres/cluster.yaml 'enablePodAntiAffinity: true'
assert_contains platform/data/postgres/cluster.yaml 'topologyKey: kubernetes.io/hostname'
assert_contains platform/data/postgres/cluster.yaml 'podAntiAffinityType: required'
assert_contains platform/data/postgres/cluster.yaml 'size: 20Gi'
assert_contains platform/data/postgres/cluster.yaml 'storageClass: local-path'
assert_contains platform/data/postgres/cluster.yaml 'enablePodMonitor: true'
assert_contains platform/data/postgres/cluster.yaml 'database: datacenter'
assert_contains platform/data/postgres/cluster.yaml 'owner: datacenter'
assert_contains platform/data/postgres/cluster.yaml 'max_connections: "200"'
assert_contains platform/data/postgres/cluster.yaml 'shared_buffers: "256MB"'

assert_contains platform/data/postgres/backup-schedule.yaml 'kind: ScheduledBackup'
assert_contains platform/data/postgres/backup-schedule.yaml 'name: datacenter-postgres-daily'
assert_contains platform/data/postgres/backup-schedule.yaml 'namespace: database'
assert_contains platform/data/postgres/backup-schedule.yaml 'schedule: "0 0 3 * * *"'
assert_contains platform/data/postgres/backup-schedule.yaml 'backupOwnerReference: self'
assert_contains platform/data/postgres/backup-schedule.yaml 'name: datacenter-postgres'

kubectl kustomize platform/data/postgres >/dev/null
