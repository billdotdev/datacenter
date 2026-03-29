#!/usr/bin/env bash
set -euo pipefail

test -f platform/chaos/chaos-mesh/values.yaml
test -f platform/chaos/chaos-mesh/README.md

grep -q 'create: false' platform/chaos/chaos-mesh/values.yaml
grep -q 'socketPath: /run/k3s/containerd/containerd.sock' platform/chaos/chaos-mesh/values.yaml
grep -q 'mtls:' platform/chaos/chaos-mesh/values.yaml
grep -q 'enabled: false' platform/chaos/chaos-mesh/values.yaml
grep -q 'certManager:' platform/chaos/chaos-mesh/values.yaml
grep -q 'enabled: true' platform/chaos/chaos-mesh/values.yaml
grep -q 'manual-only' platform/chaos/chaos-mesh/README.md
