#!/usr/bin/env bash
set -euo pipefail

assert_contains() {
  local file=$1
  local expected=$2

  grep -Fq "$expected" "$file"
}

assert_not_contains() {
  local file=$1
  local unexpected=$2

  ! grep -Fq "$unexpected" "$file"
}

assert_block_contains() {
  local file=$1
  local start=$2
  local stop=$3
  local expected=$4

  awk "/$start/,/$stop/ {print}" "$file" | grep -Fq "$expected"
}

test -f platform/security/istio/istiod-values.yaml
test -f platform/security/cert-manager/values.yaml
test -f platform/security/gateway-api/shared-gateway/kustomization.yaml
test -f platform/security/gateway-api/shared-gateway/gateway.yaml
test -f platform/security/internal-tls/kustomization.yaml
test -f platform/security/internal-tls/namespace.yaml
test -f platform/security/internal-tls/root-selfsigned-issuer.yaml
test -f platform/security/internal-tls/root-ca-certificate.yaml
test -f platform/security/internal-tls/cluster-issuer.yaml
test -f platform/security/internal-tls/ingress-certificate.yaml

kubectl kustomize platform/security/gateway-api/shared-gateway >/dev/null
kubectl kustomize platform/security/internal-tls >/dev/null

assert_contains platform/security/istio/istiod-values.yaml 'profile: minimal'
assert_contains platform/security/istio/istiod-values.yaml 'accessLogFile: /dev/stdout'
assert_contains platform/security/istio/istiod-values.yaml 'replicaCount: 2'

assert_contains platform/security/gateway-api/shared-gateway/kustomization.yaml 'gateway.yaml'
assert_not_contains platform/security/gateway-api/shared-gateway/kustomization.yaml 'namespace.yaml'
assert_contains platform/security/gateway-api/shared-gateway/gateway.yaml 'kind: Gateway'
assert_contains platform/security/gateway-api/shared-gateway/gateway.yaml 'name: shared-gateway'
assert_contains platform/security/gateway-api/shared-gateway/gateway.yaml 'namespace: istio-ingress'
assert_contains platform/security/gateway-api/shared-gateway/gateway.yaml 'gatewayClassName: istio'
assert_contains platform/security/gateway-api/shared-gateway/gateway.yaml 'name: http'
assert_contains platform/security/gateway-api/shared-gateway/gateway.yaml 'port: 80'
assert_contains platform/security/gateway-api/shared-gateway/gateway.yaml 'name: https'
assert_contains platform/security/gateway-api/shared-gateway/gateway.yaml 'port: 443'
assert_contains platform/security/gateway-api/shared-gateway/gateway.yaml 'certificateRefs:'
assert_contains platform/security/gateway-api/shared-gateway/gateway.yaml 'name: datacenter-ingress-tls'
assert_contains platform/security/gateway-api/shared-gateway/gateway.yaml 'from: All'

assert_contains platform/security/internal-tls/kustomization.yaml 'namespace.yaml'
assert_contains platform/security/internal-tls/namespace.yaml 'kind: Namespace'
assert_contains platform/security/internal-tls/namespace.yaml 'name: istio-ingress'

assert_contains platform/security/cert-manager/values.yaml 'crds:'
assert_contains platform/security/cert-manager/values.yaml 'prometheus:'
assert_contains platform/security/cert-manager/values.yaml 'timeoutSeconds: 10'
assert_block_contains platform/security/cert-manager/values.yaml '^crds:$' '^prometheus:$' 'enabled: true'
assert_block_contains platform/security/cert-manager/values.yaml '^prometheus:$' '^webhook:$' 'enabled: true'

grep -A2 'issuerRef:' platform/security/internal-tls/root-ca-certificate.yaml | grep -Fq 'name: datacenter-selfsigned-bootstrap'
grep -A2 'issuerRef:' platform/security/internal-tls/root-ca-certificate.yaml | grep -Fq 'kind: ClusterIssuer'
assert_contains platform/security/internal-tls/root-ca-certificate.yaml 'duration: 87600h'
assert_contains platform/security/internal-tls/root-ca-certificate.yaml 'renewBefore: 720h'
assert_contains platform/security/internal-tls/cluster-issuer.yaml 'secretName: datacenter-root-ca'

assert_contains platform/security/internal-tls/ingress-certificate.yaml 'kind: Certificate'
assert_contains platform/security/internal-tls/ingress-certificate.yaml 'name: datacenter-ingress-tls'
assert_contains platform/security/internal-tls/ingress-certificate.yaml 'namespace: istio-ingress'
assert_contains platform/security/internal-tls/ingress-certificate.yaml 'secretName: datacenter-ingress-tls'
assert_contains platform/security/internal-tls/ingress-certificate.yaml 'commonName: ingress.datacenter.lan'
assert_contains platform/security/internal-tls/ingress-certificate.yaml 'dnsNames:'
assert_contains platform/security/internal-tls/ingress-certificate.yaml 'ingress.datacenter.lan'
assert_contains platform/security/internal-tls/ingress-certificate.yaml '*.datacenter.lan'
grep -A2 'issuerRef:' platform/security/internal-tls/ingress-certificate.yaml | grep -Fq 'name: datacenter-ca'
grep -A2 'issuerRef:' platform/security/internal-tls/ingress-certificate.yaml | grep -Fq 'kind: ClusterIssuer'
