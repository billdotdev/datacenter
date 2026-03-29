#!/usr/bin/env bash
set -euo pipefail

test -f platform/security/ingress-nginx/values.yaml
test -f platform/security/cert-manager/values.yaml
test -f platform/security/internal-tls/kustomization.yaml
test -f platform/security/internal-tls/root-selfsigned-issuer.yaml
test -f platform/security/internal-tls/root-ca-certificate.yaml
test -f platform/security/internal-tls/cluster-issuer.yaml

kubectl kustomize platform/security/internal-tls >/dev/null
grep -q 'controller' platform/security/ingress-nginx/values.yaml
grep -q 'installCRDs: true' platform/security/cert-manager/values.yaml
