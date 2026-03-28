#!/usr/bin/env bash
set -euo pipefail

test -f docs/runbooks/cluster-bootstrap.md
grep -q 'make cluster-up' docs/runbooks/cluster-bootstrap.md
grep -q 'make cluster-verify' docs/runbooks/cluster-bootstrap.md
grep -q 'Prepared hosts' docs/runbooks/cluster-bootstrap.md
