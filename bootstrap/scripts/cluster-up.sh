#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${1:-bootstrap/config/datacenter.env}"

bash bootstrap/scripts/validate-env.sh "$ENV_FILE"

set -a
source "$ENV_FILE"
set +a

SSH_PUBLIC_KEY_PATH="${SSH_PRIVATE_KEY_PATH}.pub"

if [[ ! -f "$SSH_PUBLIC_KEY_PATH" ]]; then
  echo "missing ssh public key: $SSH_PUBLIC_KEY_PATH" >&2
  exit 1
fi

terraform -chdir=infra/proxmox init
terraform -chdir=infra/proxmox apply -auto-approve -parallelism=1 \
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

ANSIBLE_CONFIG=bootstrap/ansible/ansible.cfg ansible-playbook bootstrap/ansible/playbooks/base.yml
ANSIBLE_CONFIG=bootstrap/ansible/ansible.cfg ansible-playbook bootstrap/ansible/playbooks/k3s.yml

export KUBECONFIG="$KUBECONFIG_PATH"
mkdir -p "$(dirname "$KUBECONFIG")"
scp -i "$SSH_PRIVATE_KEY_PATH" "$SSH_USER@$CP1_IP:/etc/rancher/k3s/k3s.yaml" "$KUBECONFIG"
sed -i.bak "s/127.0.0.1/$CP1_IP/g" "$KUBECONFIG"

kubectl apply -k platform/gitops/argocd/bootstrap
kubectl apply -f platform/gitops/argocd/root-project.yaml
kubectl apply -f platform/gitops/argocd/root-application.yaml

bash bootstrap/scripts/cluster-verify.sh "$ENV_FILE"
