#!/usr/bin/env bash
set -euo pipefail

test -x bootstrap/scripts/cluster-up.sh
test -x bootstrap/scripts/cluster-verify.sh
grep -q '^cluster-up:' Makefile
grep -q '^cluster-verify:' Makefile
