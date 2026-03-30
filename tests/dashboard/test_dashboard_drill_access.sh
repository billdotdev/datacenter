#!/usr/bin/env bash
set -euo pipefail

test -f clusters/datacenter/dashboard-chaos-access.yaml

grep -q 'kind: Role' clusters/datacenter/dashboard-chaos-access.yaml
grep -q 'kind: RoleBinding' clusters/datacenter/dashboard-chaos-access.yaml
grep -q 'namespace: chaos-mesh' clusters/datacenter/dashboard-chaos-access.yaml
grep -q 'podchaos' clusters/datacenter/dashboard-chaos-access.yaml
grep -q 'dashboard-chaos-access.yaml' clusters/datacenter/kustomization.yaml
grep -q 'drills' apps/dashboard/README.md
grep -q 'disruptive actions' apps/dashboard/README.md
grep -q 'PodChaos' docs/runbooks/local-access.md
kubectl kustomize clusters/datacenter >/dev/null
