#!/usr/bin/env bash
set -euo pipefail

test -f Makefile
test -f bootstrap/config/datacenter.example.env
test -f bootstrap/scripts/validate-env.sh

grep -q '^PVE1_API_URL=' bootstrap/config/datacenter.example.env
grep -q '^PVE2_API_URL=' bootstrap/config/datacenter.example.env
grep -q '^K3S_INSTALL_CHANNEL=' bootstrap/config/datacenter.example.env
grep -q '^SSH_USER=' bootstrap/config/datacenter.example.env
grep -q 'bootstrap-validate:' Makefile

run_validate() {
  local env_file="$1"
  local output_file="$2"

  if bash bootstrap/scripts/validate-env.sh "$env_file" >"$output_file" 2>&1; then
    return 0
  fi

  return 1
}

assert_validate_fails() {
  local env_file="$1"
  local output_file="$2"
  local expected_message="$3"

  if run_validate "$env_file" "$output_file"; then
    echo "validate-env.sh unexpectedly accepted $env_file" >&2
    exit 1
  fi

  grep -q "$expected_message" "$output_file"
}

missing_kube_env="$(mktemp)"
valid_home_env="$(mktemp)"
command_substitution_env="$(mktemp)"
invalid_line_env="$(mktemp)"
invalid_name_env="$(mktemp)"
missing_output="$(mktemp)"
passing_output="$(mktemp)"
command_substitution_output="$(mktemp)"
invalid_line_output="$(mktemp)"
invalid_name_output="$(mktemp)"
side_effect_marker="$(mktemp)"

trap 'rm -f "$missing_kube_env" "$valid_home_env" "$command_substitution_env" "$invalid_line_env" "$invalid_name_env" "$missing_output" "$passing_output" "$command_substitution_output" "$invalid_line_output" "$invalid_name_output" "$side_effect_marker"' EXIT

cat <<'EOF' >"$missing_kube_env"
PVE1_API_URL=https://10.100.0.100:8006/api2/json
PVE1_API_TOKEN_ID=terraform@pve!codex
PVE1_API_TOKEN_SECRET=codex-datacenter-token
PVE1_NODE=pve-1
PVE1_STORAGE=local-zfs
PVE1_BRIDGE=vmbr0
PVE1_TEMPLATE_VM_ID=9000
PVE2_API_URL=https://10.100.0.101:8006/api2/json
PVE2_API_TOKEN_ID=terraform@pve!codex
PVE2_API_TOKEN_SECRET=codex-datacenter-token
PVE2_NODE=pve-2
PVE2_STORAGE=local-zfs
PVE2_BRIDGE=vmbr0
PVE2_TEMPLATE_VM_ID=9000
CLUSTER_NAME=datacenter
K3S_INSTALL_CHANNEL=stable
K3S_CLUSTER_TOKEN=datacenter-lab-bootstrap-token
CP1_IP=10.100.0.111
CP2_IP=10.100.0.112
CP3_IP=10.100.0.113
SSH_USER=ubuntu
SSH_PRIVATE_KEY_PATH=/tmp/id_ed25519
EOF

cat <<'EOF' >"$valid_home_env"
PVE1_API_URL=https://10.100.0.100:8006/api2/json
PVE1_API_TOKEN_ID=terraform@pve!codex
PVE1_API_TOKEN_SECRET=codex-datacenter-token
PVE1_NODE=pve-1
PVE1_STORAGE=local-zfs
PVE1_BRIDGE=vmbr0
PVE1_TEMPLATE_VM_ID=9000
PVE2_API_URL=https://10.100.0.101:8006/api2/json
PVE2_API_TOKEN_ID=terraform@pve!codex
PVE2_API_TOKEN_SECRET=codex-datacenter-token
PVE2_NODE=pve-2
PVE2_STORAGE=local-zfs
PVE2_BRIDGE=vmbr0
PVE2_TEMPLATE_VM_ID=9000
CLUSTER_NAME=datacenter
K3S_INSTALL_CHANNEL=stable
K3S_CLUSTER_TOKEN=datacenter-lab-bootstrap-token
KUBECONFIG_PATH=$HOME/.kube/datacenter.kubeconfig
CP1_IP=10.100.0.111
CP2_IP=10.100.0.112
CP3_IP=10.100.0.113
SSH_USER=ubuntu
SSH_PRIVATE_KEY_PATH=$HOME/.ssh/id_ed25519
EOF

cat <<EOF >"$command_substitution_env"
PVE1_API_URL=https://10.100.0.100:8006/api2/json
PVE1_API_TOKEN_ID=terraform@pve!codex
PVE1_API_TOKEN_SECRET=codex-datacenter-token
PVE1_NODE=pve-1
PVE1_STORAGE=local-zfs
PVE1_BRIDGE=vmbr0
PVE1_TEMPLATE_VM_ID=9000
PVE2_API_URL=https://10.100.0.101:8006/api2/json
PVE2_API_TOKEN_ID=terraform@pve!codex
PVE2_API_TOKEN_SECRET=codex-datacenter-token
PVE2_NODE=pve-2
PVE2_STORAGE=local-zfs
PVE2_BRIDGE=vmbr0
PVE2_TEMPLATE_VM_ID=9000
CLUSTER_NAME=datacenter
K3S_INSTALL_CHANNEL=stable
K3S_CLUSTER_TOKEN=datacenter-lab-bootstrap-token
KUBECONFIG_PATH=/tmp/datacenter.kubeconfig
CP1_IP=10.100.0.111
CP2_IP=10.100.0.112
CP3_IP=10.100.0.113
SSH_USER=ubuntu
SSH_PRIVATE_KEY_PATH=/tmp/id_ed25519
UNRELATED=\$(touch "$side_effect_marker")literal-value
EOF

cat <<'EOF' >"$invalid_line_env"
PVE1_API_URL=https://10.100.0.100:8006/api2/json
NOT_A_VALID_LINE
EOF

cat <<'EOF' >"$invalid_name_env"
PVE1_API_URL=https://10.100.0.100:8006/api2/json
INVALID-NAME=value
EOF

rm -f "$side_effect_marker"

if env KUBECONFIG_PATH=/tmp/inherited.kubeconfig bash bootstrap/scripts/validate-env.sh "$missing_kube_env" >"$missing_output" 2>&1; then
  echo "validate-env.sh unexpectedly accepted env without KUBECONFIG_PATH from file" >&2
  exit 1
fi

grep -q 'missing required variable: KUBECONFIG_PATH' "$missing_output"

if run_validate "$command_substitution_env" "$command_substitution_output"; then
  echo "validate-env.sh unexpectedly accepted command substitution syntax" >&2
  exit 1
fi

grep -q 'command substitution' "$command_substitution_output"
test ! -e "$side_effect_marker"

run_validate "$valid_home_env" "$passing_output"
grep -q 'bootstrap environment validated' "$passing_output"

assert_validate_fails "$invalid_line_env" "$invalid_line_output" 'invalid env line: NOT_A_VALID_LINE'
assert_validate_fails "$invalid_name_env" "$invalid_name_output" 'invalid env variable name: INVALID-NAME'
