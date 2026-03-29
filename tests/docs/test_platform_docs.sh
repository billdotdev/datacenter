#!/usr/bin/env bash
set -euo pipefail

test -f docs/runbooks/platform-services.md
test -f docs/runbooks/local-access.md

grep -q 'make cluster-verify' docs/runbooks/platform-services.md
grep -q 'kube-prometheus-stack' docs/runbooks/platform-services.md
grep -q 'port-forward svc/argocd-server 8080:443' docs/runbooks/local-access.md
grep -q 'port-forward svc/kube-prometheus-stack-grafana 3000:80' docs/runbooks/local-access.md
grep -q 'docs/runbooks/local-access.md' README.md
grep -q 'docs/runbooks/platform-services.md' README.md
