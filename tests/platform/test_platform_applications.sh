#!/usr/bin/env bash
set -euo pipefail

test -f clusters/datacenter/platform/kustomization.yaml
test -f clusters/datacenter/platform/ingress-nginx.yaml
test -f clusters/datacenter/platform/cert-manager.yaml
test -f clusters/datacenter/platform/internal-tls.yaml
test -f clusters/datacenter/platform/postgres-operator.yaml
test -f clusters/datacenter/platform/postgres-cluster.yaml
test -f clusters/datacenter/platform/kube-prometheus-stack.yaml
test -f clusters/datacenter/platform/loki.yaml
test -f clusters/datacenter/platform/promtail.yaml
test -f clusters/datacenter/platform/chaos-mesh.yaml

kubectl kustomize clusters/datacenter >/dev/null
kubectl kustomize clusters/datacenter/platform >/dev/null
