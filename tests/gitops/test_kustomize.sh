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

assert_contains platform/gitops/argocd/bootstrap/kustomization.yaml 'namespace: argocd'
assert_contains platform/gitops/argocd/bootstrap/kustomization.yaml 'namespace.yaml'
assert_contains platform/gitops/argocd/bootstrap/kustomization.yaml 'https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml'
assert_contains platform/gitops/argocd/bootstrap/kustomization.yaml 'argocd-cm-application-health.yaml'
assert_contains platform/gitops/argocd/bootstrap/namespace.yaml 'kind: Namespace'
assert_contains platform/gitops/argocd/bootstrap/namespace.yaml 'name: argocd'
assert_contains platform/gitops/argocd/bootstrap/argocd-cm-application-health.yaml 'kind: ConfigMap'
assert_contains platform/gitops/argocd/bootstrap/argocd-cm-application-health.yaml 'name: argocd-cm'

kubectl kustomize clusters/datacenter >/dev/null
