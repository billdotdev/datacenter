#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${1:-bootstrap/config/datacenter.env}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "missing env file: $ENV_FILE" >&2
  exit 1
fi

required_vars=(
  PVE1_API_URL
  PVE1_API_TOKEN_ID
  PVE1_API_TOKEN_SECRET
  PVE1_NODE
  PVE1_STORAGE
  PVE1_BRIDGE
  PVE1_TEMPLATE_VM_ID
  PVE2_API_URL
  PVE2_API_TOKEN_ID
  PVE2_API_TOKEN_SECRET
  PVE2_NODE
  PVE2_STORAGE
  PVE2_BRIDGE
  PVE2_TEMPLATE_VM_ID
  CLUSTER_NAME
  K3S_INSTALL_CHANNEL
  K3S_CLUSTER_TOKEN
  KUBECONFIG_PATH
  CP1_IP
  CP2_IP
  CP3_IP
  SSH_USER
  SSH_PRIVATE_KEY_PATH
)

parse_env_file() {
  local env_file="$1"
  local line=""
  local key=""
  local value=""

  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%$'\r'}"

    if [[ "$line" =~ ^[[:space:]]*$ ]]; then
      continue
    fi

    if [[ "$line" =~ ^[[:space:]]*# ]]; then
      continue
    fi

    if [[ "$line" != *=* ]]; then
      echo "invalid env line: $line" >&2
      exit 1
    fi

    key="${line%%=*}"
    value="${line#*=}"

    if [[ ! "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
      echo "invalid env variable name: $key" >&2
      exit 1
    fi

    if [[ "$value" == *'$('* || "$value" == *'`'* ]]; then
      echo "invalid env value for $key: command substitution is not allowed" >&2
      exit 1
    fi

    printf -v "PARSED_ENV_${key}" '%s' "$value"
  done < "$env_file"
}

for name in "${required_vars[@]}"; do
  unset "PARSED_ENV_${name}"
done

parse_env_file "$ENV_FILE"

for name in "${required_vars[@]}"; do
  parsed_name="PARSED_ENV_${name}"

  if [[ -z "${!parsed_name:-}" ]]; then
    echo "missing required variable: $name" >&2
    exit 1
  fi
done

echo "bootstrap environment validated"
