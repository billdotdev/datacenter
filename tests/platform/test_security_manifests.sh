#!/usr/bin/env bash
set -euo pipefail

test -f platform/security/ingress-nginx/values.yaml
test -f platform/security/cert-manager/values.yaml
test -f platform/security/internal-tls/kustomization.yaml
test -f platform/security/internal-tls/root-selfsigned-issuer.yaml
test -f platform/security/internal-tls/root-ca-certificate.yaml
test -f platform/security/internal-tls/cluster-issuer.yaml

kubectl kustomize platform/security/internal-tls >/dev/null

grep -q '^controller:$' platform/security/ingress-nginx/values.yaml
grep -q 'replicaCount: 2' platform/security/ingress-nginx/values.yaml
grep -q 'serviceMonitor:' platform/security/ingress-nginx/values.yaml
grep -q 'type: LoadBalancer' platform/security/ingress-nginx/values.yaml
grep -q 'admissionWebhooks:' platform/security/ingress-nginx/values.yaml
grep -q '^defaultBackend:$' platform/security/ingress-nginx/values.yaml

grep -q '^crds:$' platform/security/cert-manager/values.yaml
grep -q 'enabled: true' platform/security/cert-manager/values.yaml
grep -q '^prometheus:$' platform/security/cert-manager/values.yaml
grep -q 'timeoutSeconds: 10' platform/security/cert-manager/values.yaml

grep -A3 'issuerRef:' platform/security/internal-tls/root-ca-certificate.yaml | grep -q 'name: datacenter-selfsigned-bootstrap'
grep -A3 'issuerRef:' platform/security/internal-tls/root-ca-certificate.yaml | grep -q 'kind: ClusterIssuer'
grep -q 'duration: 87600h' platform/security/internal-tls/root-ca-certificate.yaml
grep -q 'renewBefore: 720h' platform/security/internal-tls/root-ca-certificate.yaml
grep -q 'secretName: datacenter-root-ca' platform/security/internal-tls/cluster-issuer.yaml
