#!/usr/bin/env bash
set -euo pipefail

env_file="$(mktemp)"
private_key="$(mktemp)"
output_file="$(mktemp)"
fake_bin="$(mktemp -d)"
terraform_log="$(mktemp)"
curl_log="$(mktemp)"
missing_tfvars="$(mktemp)"

cleanup() {
  rm -f "$env_file" "$private_key" "${private_key}.pub" "$output_file" "$terraform_log" "$curl_log" "$missing_tfvars"
  rm -rf "$fake_bin"
}

trap cleanup EXIT

rm -f "$missing_tfvars"

cat <<EOF >"$env_file"
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
SSH_PRIVATE_KEY_PATH=$private_key
EOF

cat <<'EOF' >"${private_key}.pub"
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAITestKey codex@datacenter
EOF

cat <<EOF >"$fake_bin/terraform"
#!/usr/bin/env bash
echo "\$*" >>"$terraform_log"
exit 99
EOF
chmod +x "$fake_bin/terraform"

cat <<EOF >"$fake_bin/curl"
#!/usr/bin/env bash
output_file=""
url=""
while [[ \$# -gt 0 ]]; do
  case "\$1" in
    -o)
      output_file="\$2"
      shift 2
      ;;
    *)
      url="\$1"
      shift
      ;;
  esac
done
echo "\$url" >>"$curl_log"
printf '{}' >"\$output_file"
printf '200'
EOF
chmod +x "$fake_bin/curl"

if PATH="$fake_bin:$PATH" TFVARS_FILE="$missing_tfvars" bash bootstrap/scripts/cluster-up.sh "$env_file" >"$output_file" 2>&1; then
  echo "cluster-up.sh unexpectedly succeeded without the required TFVARS_FILE" >&2
  exit 1
fi

grep -q "$missing_tfvars" "$output_file"

if [[ -s "$terraform_log" ]]; then
  echo "cluster-up.sh should fail before invoking terraform when terraform.tfvars is missing" >&2
  exit 1
fi
