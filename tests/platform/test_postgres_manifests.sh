#!/usr/bin/env bash
set -euo pipefail

assert_contains() {
  local file=$1
  local expected=$2

  grep -Fq "$expected" "$file"
}

test -f platform/data/cloudnative-pg/values.yaml
test -f platform/data/postgres/kustomization.yaml
test -f platform/data/postgres/cluster.yaml
test -f platform/data/postgres/backup-schedule.yaml

assert_contains platform/data/cloudnative-pg/values.yaml 'INHERITED_ANNOTATIONS: argocd.argoproj.io/sync-wave'
assert_contains platform/data/cloudnative-pg/values.yaml 'podMonitorEnabled: true'
assert_contains platform/data/cloudnative-pg/values.yaml 'create: true'

assert_contains platform/data/postgres/kustomization.yaml 'cluster.yaml'
assert_contains platform/data/postgres/kustomization.yaml 'backup-schedule.yaml'

assert_contains platform/data/postgres/cluster.yaml 'kind: Cluster'
assert_contains platform/data/postgres/cluster.yaml 'name: datacenter-postgres'
assert_contains platform/data/postgres/cluster.yaml 'namespace: database'
assert_contains platform/data/postgres/cluster.yaml 'instances: 3'
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
