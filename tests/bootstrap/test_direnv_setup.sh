#!/usr/bin/env bash
set -euo pipefail

test -f .envrc
grep -q 'source_env bootstrap/config/datacenter.env' .envrc
grep -q 'export KUBECONFIG="$KUBECONFIG_PATH"' .envrc
grep -q 'direnv allow' README.md
grep -q 'direnv allow' docs/runbooks/cluster-bootstrap.md
