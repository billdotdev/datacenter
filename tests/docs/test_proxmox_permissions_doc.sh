#!/usr/bin/env bash
set -euo pipefail

test -f docs/proxmox/network-configuration.md
grep -q 'VM.Clone' docs/proxmox/network-configuration.md
grep -q 'SDN.Use' docs/proxmox/network-configuration.md
grep -q 'pveum role add TerraformProv' docs/proxmox/network-configuration.md
grep -q '/vms/9000' docs/proxmox/network-configuration.md
grep -q '/sdn/zones/localnetwork/vmbr0' docs/proxmox/network-configuration.md
