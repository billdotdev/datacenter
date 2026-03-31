#!/usr/bin/env bash
set -euo pipefail

assert_contains() {
  local file=$1
  local expected=$2

  grep -Fq "$expected" "$file"
}

test -f platform/gitops/argocd/bootstrap/kustomization.yaml
test -f platform/gitops/argocd/bootstrap/namespace.yaml
test -f platform/gitops/argocd/bootstrap/argocd-cm-application-health.yaml
test -f platform/gitops/argocd/bootstrap/argocd-cmd-params-cm-server-insecure.yaml
test -f platform/gitops/argocd/bootstrap/argocd-application-controller-resources.yaml
test -f platform/gitops/argocd/bootstrap/argocd-server-resources.yaml
test -f platform/gitops/argocd/bootstrap/argocd-server-httproute.yaml
test -f platform/gitops/argocd/bootstrap/argocd-dex-server-resources.yaml
test -f platform/gitops/argocd/bootstrap/argocd-redis-resources.yaml
test -f platform/gitops/argocd/bootstrap/argocd-repo-server-hardening.yaml
test -f platform/gitops/argocd/access/kustomization.yaml
test -f platform/gitops/argocd/access/argocd-cmd-params-cm-server-insecure.yaml
test -f platform/gitops/argocd/access/argocd-server-httproute.yaml

assert_contains platform/gitops/argocd/bootstrap/kustomization.yaml 'namespace: argocd'
assert_contains platform/gitops/argocd/bootstrap/kustomization.yaml 'namespace.yaml'
assert_contains platform/gitops/argocd/bootstrap/kustomization.yaml 'https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml'
assert_contains platform/gitops/argocd/bootstrap/kustomization.yaml 'argocd-cm-application-health.yaml'
assert_contains platform/gitops/argocd/bootstrap/kustomization.yaml 'argocd-cmd-params-cm-server-insecure.yaml'
assert_contains platform/gitops/argocd/bootstrap/kustomization.yaml 'argocd-application-controller-resources.yaml'
assert_contains platform/gitops/argocd/bootstrap/kustomization.yaml 'argocd-server-resources.yaml'
assert_contains platform/gitops/argocd/bootstrap/kustomization.yaml 'argocd-server-httproute.yaml'
assert_contains platform/gitops/argocd/bootstrap/kustomization.yaml 'argocd-dex-server-resources.yaml'
assert_contains platform/gitops/argocd/bootstrap/kustomization.yaml 'argocd-redis-resources.yaml'
assert_contains platform/gitops/argocd/bootstrap/kustomization.yaml 'argocd-repo-server-hardening.yaml'
assert_contains platform/gitops/argocd/bootstrap/namespace.yaml 'kind: Namespace'
assert_contains platform/gitops/argocd/bootstrap/namespace.yaml 'name: argocd'
assert_contains platform/gitops/argocd/bootstrap/argocd-cm-application-health.yaml 'kind: ConfigMap'
assert_contains platform/gitops/argocd/bootstrap/argocd-cm-application-health.yaml 'name: argocd-cm'
assert_contains platform/gitops/argocd/bootstrap/argocd-cmd-params-cm-server-insecure.yaml 'name: argocd-cmd-params-cm'
assert_contains platform/gitops/argocd/bootstrap/argocd-cmd-params-cm-server-insecure.yaml 'server.insecure: "true"'
assert_contains platform/gitops/argocd/bootstrap/argocd-application-controller-resources.yaml 'kind: StatefulSet'
assert_contains platform/gitops/argocd/bootstrap/argocd-application-controller-resources.yaml 'name: argocd-application-controller'
assert_contains platform/gitops/argocd/bootstrap/argocd-application-controller-resources.yaml 'memory: 512Mi'
assert_contains platform/gitops/argocd/bootstrap/argocd-server-resources.yaml 'name: argocd-server'
assert_contains platform/gitops/argocd/bootstrap/argocd-server-resources.yaml 'memory: 192Mi'
assert_contains platform/gitops/argocd/bootstrap/argocd-server-httproute.yaml 'kind: HTTPRoute'
assert_contains platform/gitops/argocd/bootstrap/argocd-server-httproute.yaml 'argocd.datacenter.lan'
assert_contains platform/gitops/argocd/bootstrap/argocd-server-httproute.yaml 'name: argocd-server'
assert_contains platform/gitops/argocd/bootstrap/argocd-server-httproute.yaml 'port: 80'
assert_contains platform/gitops/argocd/bootstrap/argocd-dex-server-resources.yaml 'name: argocd-dex-server'
assert_contains platform/gitops/argocd/bootstrap/argocd-dex-server-resources.yaml 'memory: 256Mi'
assert_contains platform/gitops/argocd/bootstrap/argocd-redis-resources.yaml 'name: argocd-redis'
assert_contains platform/gitops/argocd/bootstrap/argocd-redis-resources.yaml 'memory: 128Mi'
assert_contains platform/gitops/argocd/bootstrap/argocd-repo-server-hardening.yaml 'kind: Deployment'
assert_contains platform/gitops/argocd/bootstrap/argocd-repo-server-hardening.yaml 'name: argocd-repo-server'
assert_contains platform/gitops/argocd/bootstrap/argocd-repo-server-hardening.yaml 'replicas: 2'
assert_contains platform/gitops/argocd/bootstrap/argocd-repo-server-hardening.yaml 'ln -sf'
assert_contains platform/gitops/argocd/bootstrap/argocd-repo-server-hardening.yaml 'memory: 256Mi'
assert_contains platform/gitops/argocd/access/kustomization.yaml 'namespace: argocd'
assert_contains platform/gitops/argocd/access/kustomization.yaml 'argocd-cmd-params-cm-server-insecure.yaml'
assert_contains platform/gitops/argocd/access/kustomization.yaml 'argocd-server-httproute.yaml'
assert_contains platform/gitops/argocd/access/argocd-cmd-params-cm-server-insecure.yaml 'server.insecure: "true"'
assert_contains platform/gitops/argocd/access/argocd-server-httproute.yaml 'argocd.datacenter.lan'

kubectl kustomize clusters/datacenter >/dev/null
