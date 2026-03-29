#!/usr/bin/env bash
set -euo pipefail

test -f platform/security/cert-manager/values.yaml
test -f platform/security/internal-tls/kustomization.yaml
test -f platform/security/internal-tls/root-selfsigned-issuer.yaml
test -f platform/security/internal-tls/root-ca-certificate.yaml
test -f platform/security/internal-tls/cluster-issuer.yaml

kubectl kustomize platform/security/internal-tls >/dev/null

grep -q '^crds:$' platform/security/cert-manager/values.yaml
grep -q '^prometheus:$' platform/security/cert-manager/values.yaml
grep -q 'timeoutSeconds: 10' platform/security/cert-manager/values.yaml
awk '/^crds:$/,/^prometheus:$/ {print}' platform/security/cert-manager/values.yaml | grep -q '^  enabled: true$'
awk '/^prometheus:$/,/^webhook:$/ {print}' platform/security/cert-manager/values.yaml | grep -q '^  enabled: true$'

grep -A3 'issuerRef:' platform/security/internal-tls/root-ca-certificate.yaml | grep -q 'name: datacenter-selfsigned-bootstrap'
grep -A3 'issuerRef:' platform/security/internal-tls/root-ca-certificate.yaml | grep -q 'kind: ClusterIssuer'
grep -q 'duration: 87600h' platform/security/internal-tls/root-ca-certificate.yaml
grep -q 'renewBefore: 720h' platform/security/internal-tls/root-ca-certificate.yaml
grep -q 'secretName: datacenter-root-ca' platform/security/internal-tls/cluster-issuer.yaml
