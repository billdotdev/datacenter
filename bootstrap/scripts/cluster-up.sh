#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${1:-bootstrap/config/datacenter.env}"
TFVARS_FILE="${TFVARS_FILE:-infra/proxmox/terraform.tfvars}"

bash bootstrap/scripts/validate-env.sh "$ENV_FILE"

if [[ ! -f "$TFVARS_FILE" ]]; then
  echo "missing terraform vars file: $TFVARS_FILE" >&2
  echo "create it from infra/proxmox/terraform.tfvars.example and set control_plane_vms" >&2
  exit 1
fi

set -a
source "$ENV_FILE"
set +a

check_proxmox_template() {
  local api_url="$1"
  local token_id="$2"
  local token_secret="$3"
  local node_name="$4"
  local template_vm_id="$5"
  local response_body=""
  local response_code=""
  local reason=""
  local bootdisk=""

  response_body="$(mktemp)"

  response_code="$(
    curl -k -sS -o "$response_body" -w '%{http_code}' \
      -H "Authorization: PVEAPIToken=${token_id}=${token_secret}" \
      "${api_url}/nodes/${node_name}/qemu/${template_vm_id}/config"
  )"

  if [[ "$response_code" == "200" ]]; then
    bootdisk="$(sed -n 's/.*"bootdisk":"\([^"]*\)".*/\1/p' "$response_body" | head -n 1)"
    if [[ -n "$bootdisk" ]] && ! grep -q "\"${bootdisk}\":" "$response_body"; then
      rm -f "$response_body"
      echo "template VM ${template_vm_id} on node ${node_name} is malformed: missing boot disk device ${bootdisk}" >&2
      echo "rebuild the template so its configured bootdisk actually exists before re-running cluster bootstrap" >&2
      exit 1
    fi

    rm -f "$response_body"
    return 0
  fi

  reason="$(sed -n "s/.*'errors':'\\([^']*\\)'.*/\\1/p; s/.*\"errors\":\"\\([^\"]*\\)\".*/\\1/p" "$response_body" | head -n 1)"
  rm -f "$response_body"

  if [[ -z "$reason" ]]; then
    reason="HTTP ${response_code}"
  fi

  echo "missing or inaccessible template VM ${template_vm_id} on node ${node_name}: ${reason}" >&2
  echo "set PVE1_TEMPLATE_VM_ID/PVE2_TEMPLATE_VM_ID to template IDs that exist on each target node" >&2
  exit 1
}

check_proxmox_storage() {
  local api_url="$1"
  local token_id="$2"
  local token_secret="$3"
  local node_name="$4"
  local storage_id="$5"
  local response_body=""
  local response_code=""
  local reason=""

  response_body="$(mktemp)"

  response_code="$(
    curl -k -sS -o "$response_body" -w '%{http_code}' \
      -H "Authorization: PVEAPIToken=${token_id}=${token_secret}" \
      "${api_url}/nodes/${node_name}/storage/${storage_id}/status"
  )"

  if [[ "$response_code" == "200" ]]; then
    rm -f "$response_body"
    return 0
  fi

  reason="$(sed -n "s/.*'errors':'\\([^']*\\)'.*/\\1/p; s/.*\"errors\":\"\\([^\"]*\\)\".*/\\1/p" "$response_body" | head -n 1)"
  rm -f "$response_body"

  if [[ -z "$reason" ]]; then
    reason="HTTP ${response_code}"
  fi

  echo "missing or inaccessible storage ${storage_id} on node ${node_name}: ${reason}" >&2
  echo "set PVE1_STORAGE/PVE2_STORAGE to storage IDs that exist on each target node" >&2
  exit 1
}

SSH_PUBLIC_KEY_PATH="${SSH_PRIVATE_KEY_PATH}.pub"

if [[ ! -f "$SSH_PUBLIC_KEY_PATH" ]]; then
  echo "missing ssh public key: $SSH_PUBLIC_KEY_PATH" >&2
  exit 1
fi

check_proxmox_template "$PVE1_API_URL" "$PVE1_API_TOKEN_ID" "$PVE1_API_TOKEN_SECRET" "$PVE1_NODE" "$PVE1_TEMPLATE_VM_ID"
check_proxmox_template "$PVE2_API_URL" "$PVE2_API_TOKEN_ID" "$PVE2_API_TOKEN_SECRET" "$PVE2_NODE" "$PVE2_TEMPLATE_VM_ID"
check_proxmox_storage "$PVE1_API_URL" "$PVE1_API_TOKEN_ID" "$PVE1_API_TOKEN_SECRET" "$PVE1_NODE" "$PVE1_STORAGE"
check_proxmox_storage "$PVE2_API_URL" "$PVE2_API_TOKEN_ID" "$PVE2_API_TOKEN_SECRET" "$PVE2_NODE" "$PVE2_STORAGE"

terraform -chdir=infra/proxmox init
terraform -chdir=infra/proxmox apply -auto-approve \
  -var="pve1_api_url=$PVE1_API_URL" \
  -var="pve1_api_token_id=$PVE1_API_TOKEN_ID" \
  -var="pve1_api_token_secret=$PVE1_API_TOKEN_SECRET" \
  -var="pve1_node=$PVE1_NODE" \
  -var="pve1_storage=$PVE1_STORAGE" \
  -var="pve1_bridge=$PVE1_BRIDGE" \
  -var="pve1_template_vm_id=$PVE1_TEMPLATE_VM_ID" \
  -var="pve2_api_url=$PVE2_API_URL" \
  -var="pve2_api_token_id=$PVE2_API_TOKEN_ID" \
  -var="pve2_api_token_secret=$PVE2_API_TOKEN_SECRET" \
  -var="pve2_node=$PVE2_NODE" \
  -var="pve2_storage=$PVE2_STORAGE" \
  -var="pve2_bridge=$PVE2_BRIDGE" \
  -var="pve2_template_vm_id=$PVE2_TEMPLATE_VM_ID" \
  -var="ssh_public_key=$(<"$SSH_PUBLIC_KEY_PATH")"

LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8 ANSIBLE_CONFIG=bootstrap/ansible/ansible.cfg ansible-playbook bootstrap/ansible/playbooks/base.yml
LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8 ANSIBLE_CONFIG=bootstrap/ansible/ansible.cfg ansible-playbook bootstrap/ansible/playbooks/k3s.yml

export KUBECONFIG="$KUBECONFIG_PATH"
mkdir -p "$(dirname "$KUBECONFIG")"
ssh-keygen -R "$CP1_IP" >/dev/null 2>&1 || true
ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -i "$SSH_PRIVATE_KEY_PATH" "$SSH_USER@$CP1_IP" 'sudo cat /etc/rancher/k3s/k3s.yaml' >"$KUBECONFIG"
sed -i.bak "s/127.0.0.1/$CP1_IP/g" "$KUBECONFIG"

kubectl apply --server-side --force-conflicts -k platform/gitops/argocd/bootstrap
kubectl apply -f platform/gitops/argocd/root-project.yaml
kubectl apply -f platform/gitops/argocd/root-application.yaml

bash bootstrap/scripts/cluster-verify.sh "$ENV_FILE"
