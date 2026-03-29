#!/usr/bin/env bash
set -euo pipefail

test -f apps/dashboard/k8s/serviceaccount.yaml
test -f apps/dashboard/k8s/clusterrole.yaml
test -f apps/dashboard/k8s/clusterrolebinding.yaml

grep -q 'kind: ServiceAccount' apps/dashboard/k8s/serviceaccount.yaml
grep -q 'name: dashboard' apps/dashboard/k8s/serviceaccount.yaml
grep -q 'resources:' apps/dashboard/k8s/clusterrole.yaml
grep -q 'nodes' apps/dashboard/k8s/clusterrole.yaml
grep -q 'argoproj.io' apps/dashboard/k8s/clusterrole.yaml
grep -q 'applications' apps/dashboard/k8s/clusterrole.yaml
grep -q 'serviceAccountName: dashboard' apps/dashboard/k8s/deployment.yaml
grep -q 'clusterrolebinding.yaml' apps/dashboard/k8s/kustomization.yaml
grep -q 'serviceaccount.yaml' apps/dashboard/k8s/kustomization.yaml
kubectl kustomize apps/dashboard/k8s >/dev/null
