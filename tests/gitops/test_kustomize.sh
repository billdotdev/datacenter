#!/usr/bin/env bash
set -euo pipefail

kubectl kustomize platform/gitops/argocd/bootstrap >/dev/null
kubectl kustomize --load-restrictor=LoadRestrictionsNone clusters/datacenter >/dev/null
