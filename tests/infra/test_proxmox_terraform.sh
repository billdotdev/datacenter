#!/usr/bin/env bash
set -euo pipefail

terraform -chdir=infra/proxmox fmt -check

grep -q 'alias     = "pve1"' infra/proxmox/providers.tf
grep -q 'alias     = "pve2"' infra/proxmox/providers.tf
grep -q 'provider  = proxmox.pve1' infra/proxmox/main.tf
grep -q 'provider  = proxmox.pve2' infra/proxmox/main.tf
grep -q 'pve1_api_url' infra/proxmox/variables.tf
grep -q 'pve2_api_url' infra/proxmox/variables.tf
grep -q 'proxmox_host = "pve2"' infra/proxmox/terraform.tfvars.example
grep -q 'interface    = "scsi0"' infra/proxmox/main.tf
if grep -q 'interface    = "virtio0"' infra/proxmox/main.tf; then
  echo 'root disk must stay on scsi0 so cloned cloud image storage is actually resized' >&2
  exit 1
fi

if ! grep -q 'for name, vm in var.control_plane_vms' infra/proxmox/outputs.tf; then
  echo "outputs.tf must derive control_plane_ips from var.control_plane_vms" >&2
  exit 1
fi
if grep -q 'ipv4_addresses' infra/proxmox/outputs.tf; then
  echo "outputs.tf must return declared IPs from var.control_plane_vms, not provider-computed guest IPs" >&2
  exit 1
fi

run_terraform_with_provider_hint() {
  local log_file

  log_file="$(mktemp)"
  if terraform -chdir=infra/proxmox "$@" >"$log_file" 2>&1; then
    cat "$log_file"
    rm -f "$log_file"
    return 0
  fi

  if grep -Eq 'Failed to query available provider packages|failed to request discovery document|could not connect to registry.terraform.io|no such host|Failed to install provider' "$log_file"; then
    cat "$log_file" >&2
    echo >&2
    echo "Terraform could not install the Proxmox provider. Re-run this test with network access so 'terraform init -backend=false' can download bpg/proxmox." >&2
    rm -f "$log_file"
    exit 1
  fi

  cat "$log_file" >&2
  rm -f "$log_file"
  exit 1
}

run_terraform_with_provider_hint init -backend=false
run_terraform_with_provider_hint validate
