#!/usr/bin/env bash
set -euo pipefail

test -f clusters/datacenter/dashboard-chaos-access.yaml

grep -q 'kind: Role' clusters/datacenter/dashboard-chaos-access.yaml
grep -q 'kind: RoleBinding' clusters/datacenter/dashboard-chaos-access.yaml
grep -q 'kind: ClusterRole' clusters/datacenter/dashboard-chaos-access.yaml
grep -q 'kind: ClusterRoleBinding' clusters/datacenter/dashboard-chaos-access.yaml
grep -q 'namespace: chaos-mesh' clusters/datacenter/dashboard-chaos-access.yaml
grep -q 'podchaos' clusters/datacenter/dashboard-chaos-access.yaml
grep -q 'networkchaos' clusters/datacenter/dashboard-chaos-access.yaml
grep -q 'namespace: dashboard' clusters/datacenter/dashboard-chaos-access.yaml
grep -q 'resources:' clusters/datacenter/dashboard-chaos-access.yaml
grep -q 'pods' clusters/datacenter/dashboard-chaos-access.yaml
grep -q 'pods/eviction' clusters/datacenter/dashboard-chaos-access.yaml
grep -q 'namespaces' clusters/datacenter/dashboard-chaos-access.yaml
grep -q 'nodes' clusters/datacenter/dashboard-chaos-access.yaml
grep -q 'jobs' clusters/datacenter/dashboard-chaos-access.yaml
grep -q 'chaos-mesh.org' clusters/datacenter/dashboard-chaos-access.yaml
grep -q 'dashboard-chaos-access.yaml' clusters/datacenter/kustomization.yaml
grep -q 'drills' apps/dashboard/README.md
grep -q 'disruptive actions' apps/dashboard/README.md
grep -q 'network-latency' apps/dashboard/README.md
grep -q 'node-cordon-drain' apps/dashboard/README.md
grep -q 'PodChaos' docs/runbooks/local-access.md
grep -q 'NetworkChaos' docs/runbooks/local-access.md
grep -q 'cp-3' docs/runbooks/local-access.md
kubectl kustomize clusters/datacenter >/dev/null
