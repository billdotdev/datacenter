# Cluster Bootstrap And GitOps Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provision three Ubuntu VMs across two Proxmox hosts, bootstrap a reproducible 3-node `k3s` cluster, install Argo CD, and hand off cluster state management to GitOps.

**Architecture:** Use Terraform against both Proxmox APIs for VM creation, Ansible for VM bootstrap and `k3s` installation, and a repo-local Argo CD bootstrap manifest for the first sync. All three Kubernetes nodes are Ubuntu Server VMs so provisioning, rebuilds, and replacement follow one path.

**Tech Stack:** Terraform, Proxmox API, Ansible, Bash, `k3s`, Argo CD, Kustomize, YAML

**Status Note (2026-03-29):** The repo implementation for this plan is present and the current bootstrap, docs, GitOps, and Terraform validation scripts pass. The checkbox list below was not maintained during implementation and should not be treated as the execution source of truth.

---

### Task 1: Create The Bootstrap Configuration Layer

**Files:**

- Create: `Makefile`
- Create: `bootstrap/config/datacenter.example.env`
- Create: `bootstrap/scripts/validate-env.sh`
- Test: `tests/bootstrap/test_validate_env.sh`

- [ ] **Step 1: Write the failing test**

```bash
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bash tests/bootstrap/test_validate_env.sh`
Expected: FAIL with `No such file or directory` or `test -f` failure because the bootstrap files do not exist yet.

- [ ] **Step 3: Write minimal implementation**

```makefile
SHELL := /bin/bash

.PHONY: bootstrap-validate
bootstrap-validate:
	bash bootstrap/scripts/validate-env.sh

.PHONY: cluster-up
cluster-up:
	bash bootstrap/scripts/cluster-up.sh

.PHONY: cluster-verify
cluster-verify:
	bash bootstrap/scripts/cluster-verify.sh
```

```bash
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
KUBECONFIG_PATH=$HOME/.kube/datacenter.yaml

CP1_IP=10.100.0.111
CP2_IP=10.100.0.112
CP3_IP=10.100.0.113
SSH_USER=ubuntu
SSH_PRIVATE_KEY_PATH=$HOME/.ssh/id_ed25519
```

```bash
#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${1:-bootstrap/config/datacenter.env}"

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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bash tests/bootstrap/test_validate_env.sh`
Expected: PASS with no output.

- [ ] **Step 5: Commit**

```bash
git add Makefile bootstrap/config/datacenter.example.env bootstrap/scripts/validate-env.sh tests/bootstrap/test_validate_env.sh
git commit -m "chore: add bootstrap configuration validation"
```

### Task 2: Add Terraform For The Multi-Host Proxmox Control-Plane VMs

**Files:**

- Create: `infra/proxmox/providers.tf`
- Create: `infra/proxmox/variables.tf`
- Create: `infra/proxmox/main.tf`
- Create: `infra/proxmox/outputs.tf`
- Create: `infra/proxmox/terraform.tfvars.example`
- Test: `tests/infra/test_proxmox_terraform.sh`

- [ ] **Step 1: Write the failing test**

```bash
#!/usr/bin/env bash
set -euo pipefail

terraform -chdir=infra/proxmox init -backend=false
terraform -chdir=infra/proxmox fmt -check
terraform -chdir=infra/proxmox validate
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bash tests/infra/test_proxmox_terraform.sh`
Expected: FAIL because `infra/proxmox` and its Terraform files do not exist yet.

- [ ] **Step 3: Write minimal implementation**

```hcl
terraform {
  required_version = ">= 1.6.0"

  required_providers {
    proxmox = {
      source  = "bpg/proxmox"
      version = "~> 0.77"
    }
  }
}

provider "proxmox" {
  alias     = "pve1"
  endpoint  = var.pve1_api_url
  api_token = "${var.pve1_api_token_id}=${var.pve1_api_token_secret}"
  insecure  = true
}

provider "proxmox" {
  alias     = "pve2"
  endpoint  = var.pve2_api_url
  api_token = "${var.pve2_api_token_id}=${var.pve2_api_token_secret}"
  insecure  = true
}
```

```hcl
variable "pve1_api_url" { type = string }
variable "pve1_api_token_id" { type = string }
variable "pve1_api_token_secret" {
  type      = string
  sensitive = true
}
variable "pve1_node" { type = string }
variable "pve1_storage" { type = string }
variable "pve1_bridge" { type = string }
variable "pve1_template_vm_id" { type = number }

variable "pve2_api_url" { type = string }
variable "pve2_api_token_id" { type = string }
variable "pve2_api_token_secret" {
  type      = string
  sensitive = true
}
variable "pve2_node" { type = string }
variable "pve2_storage" { type = string }
variable "pve2_bridge" { type = string }
variable "pve2_template_vm_id" { type = number }

variable "ssh_public_key" { type = string }

variable "control_plane_vms" {
  type = map(object({
    vm_id        = number
    ip           = string
    cores        = number
    memory       = number
    disk_gb      = number
    proxmox_host = string
  }))
}
```

```hcl
locals {
  pve1_control_plane_vms = {
    for name, vm in var.control_plane_vms : name => vm if vm.proxmox_host == "pve1"
  }

  pve2_control_plane_vms = {
    for name, vm in var.control_plane_vms : name => vm if vm.proxmox_host == "pve2"
  }
}

resource "proxmox_virtual_environment_vm" "control_plane_pve1" {
  provider  = proxmox.pve1
  for_each  = local.pve1_control_plane_vms
  node_name = var.pve1_node
  vm_id     = each.value.vm_id
  name      = each.key

  clone {
    vm_id   = var.pve1_template_vm_id
    retries = 3
  }

  cpu {
    cores = each.value.cores
    type  = "x86-64-v2-AES"
  }

  memory {
    dedicated = each.value.memory
  }

  serial_device {
    device = "socket"
  }

  initialization {
    datastore_id = var.pve1_storage

    ip_config {
      ipv4 {
        address = "${each.value.ip}/24"
        gateway = "10.100.0.1"
      }
    }

    user_account {
      username = "ubuntu"
      keys     = [trimspace(var.ssh_public_key)]
    }
  }

  network_device {
    bridge = var.pve1_bridge
  }

  disk {
    datastore_id = var.pve1_storage
    interface    = "virtio0"
    size         = each.value.disk_gb
  }
}

resource "proxmox_virtual_environment_vm" "control_plane_pve2" {
  provider  = proxmox.pve2
  for_each  = local.pve2_control_plane_vms
  node_name = var.pve2_node
  vm_id     = each.value.vm_id
  name      = each.key

  clone {
    vm_id   = var.pve2_template_vm_id
    retries = 3
  }

  cpu {
    cores = each.value.cores
    type  = "x86-64-v2-AES"
  }

  memory {
    dedicated = each.value.memory
  }

  serial_device {
    device = "socket"
  }

  initialization {
    datastore_id = var.pve2_storage

    ip_config {
      ipv4 {
        address = "${each.value.ip}/24"
        gateway = "10.100.0.1"
      }
    }

    user_account {
      username = "ubuntu"
      keys     = [trimspace(var.ssh_public_key)]
    }
  }

  network_device {
    bridge = var.pve2_bridge
  }

  disk {
    datastore_id = var.pve2_storage
    interface    = "virtio0"
    size         = each.value.disk_gb
  }
}
```

```hcl
output "control_plane_ips" {
  value = {
    for name, vm in var.control_plane_vms : name => vm.ip
  }
}
```

```hcl
pve1_api_url          = "https://10.100.0.100:8006/api2/json"
pve1_api_token_id     = "terraform@pve!codex"
pve1_api_token_secret = "codex-datacenter-token"
pve1_node             = "pve-1"
pve1_storage          = "local-zfs"
pve1_bridge           = "vmbr0"
pve1_template_vm_id   = 9000

pve2_api_url          = "https://10.100.0.101:8006/api2/json"
pve2_api_token_id     = "terraform@pve!codex"
pve2_api_token_secret = "codex-datacenter-token"
pve2_node             = "pve-2"
pve2_storage          = "local-zfs"
pve2_bridge           = "vmbr0"
pve2_template_vm_id   = 9000

ssh_public_key = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIBootstrapDatacenterKey codex@datacenter"

control_plane_vms = {
  cp-1 = {
    vm_id        = 201
    ip           = "10.100.0.111"
    cores        = 2
    memory       = 4096
    disk_gb      = 40
    proxmox_host = "pve1"
  }
  cp-2 = {
    vm_id        = 202
    ip           = "10.100.0.112"
    cores        = 2
    memory       = 4096
    disk_gb      = 40
    proxmox_host = "pve1"
  }
  cp-3 = {
    vm_id        = 301
    ip           = "10.100.0.113"
    cores        = 2
    memory       = 4096
    disk_gb      = 40
    proxmox_host = "pve2"
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bash tests/infra/test_proxmox_terraform.sh`
Expected: PASS with Terraform reporting `Success! The configuration is valid.`

- [ ] **Step 5: Commit**

```bash
git add infra/proxmox/providers.tf infra/proxmox/variables.tf infra/proxmox/main.tf infra/proxmox/outputs.tf infra/proxmox/terraform.tfvars.example tests/infra/test_proxmox_terraform.sh
git commit -m "feat: add proxmox vm provisioning"
```

### Task 3: Add Ansible For Base Host Setup And k3s Installation

**Files:**

- Create: `bootstrap/ansible/ansible.cfg`
- Create: `bootstrap/ansible/inventory/datacenter.yml`
- Create: `bootstrap/ansible/group_vars/all.yml`
- Create: `bootstrap/ansible/playbooks/base.yml`
- Create: `bootstrap/ansible/playbooks/k3s.yml`
- Test: `tests/bootstrap/test_ansible_syntax.sh`

- [ ] **Step 1: Write the failing test**

```bash
#!/usr/bin/env bash
set -euo pipefail

ansible-playbook -i bootstrap/ansible/inventory/datacenter.yml bootstrap/ansible/playbooks/base.yml --syntax-check
ansible-playbook -i bootstrap/ansible/inventory/datacenter.yml bootstrap/ansible/playbooks/k3s.yml --syntax-check
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bash tests/bootstrap/test_ansible_syntax.sh`
Expected: FAIL because the Ansible inventory and playbooks do not exist yet.

- [ ] **Step 3: Write minimal implementation**

```ini
[defaults]
inventory = inventory/datacenter.yml
host_key_checking = False
interpreter_python = auto_silent
retry_files_enabled = False
stdout_callback = yaml
```

```yaml
all:
  vars:
    ansible_user: ubuntu
    ansible_ssh_private_key_file: "{{ lookup('env', 'SSH_PRIVATE_KEY_PATH') }}"
    k3s_token: "{{ lookup('env', 'K3S_CLUSTER_TOKEN') }}"
    k3s_server_url: "https://10.100.0.111:6443"
  children:
    control_plane:
      hosts:
        cp-1:
          ansible_host: 10.100.0.111
        cp-2:
          ansible_host: 10.100.0.112
        cp-3:
          ansible_host: 10.100.0.113
```

```yaml
k3s_install_channel: stable
k3s_disable_components:
  - traefik
  - servicelb
common_packages:
  - curl
  - jq
  - qemu-guest-agent
```

```yaml
- name: Prepare all cluster nodes
  hosts: control_plane
  become: true
  tasks:
    - name: Disable swap immediately
      ansible.builtin.command: swapoff -a
      changed_when: false

    - name: Disable swap in fstab
      ansible.builtin.replace:
        path: /etc/fstab
        regexp: '^(.*\sswap\s+sw\s+.*)$'
        replace: '# \1'

    - name: Install base packages
      ansible.builtin.apt:
        name: "{{ common_packages }}"
        state: present
        update_cache: true
```

```yaml
- name: Install k3s on first control-plane node
  hosts: cp-1
  become: true
  tasks:
    - name: Install k3s server
      ansible.builtin.shell: |
        curl -sfL https://get.k3s.io | \
          INSTALL_K3S_CHANNEL={{ k3s_install_channel }} \
          INSTALL_K3S_EXEC="server --cluster-init --disable traefik --disable servicelb" \
          sh -
      args:
        creates: /usr/local/bin/k3s

- name: Join the remaining control-plane nodes
  hosts:
    - cp-2
    - cp-3
  become: true
  tasks:
    - name: Install k3s server and join cluster
      ansible.builtin.shell: |
        curl -sfL https://get.k3s.io | \
          K3S_URL={{ k3s_server_url }} \
          K3S_TOKEN={{ k3s_token }} \
          INSTALL_K3S_CHANNEL={{ k3s_install_channel }} \
          INSTALL_K3S_EXEC="server --disable traefik --disable servicelb" \
          sh -
      args:
        creates: /usr/local/bin/k3s
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bash tests/bootstrap/test_ansible_syntax.sh`
Expected: PASS with both syntax checks returning `playbook: ...`.

- [ ] **Step 5: Commit**

```bash
git add bootstrap/ansible/ansible.cfg bootstrap/ansible/inventory/datacenter.yml bootstrap/ansible/group_vars/all.yml bootstrap/ansible/playbooks/base.yml bootstrap/ansible/playbooks/k3s.yml tests/bootstrap/test_ansible_syntax.sh
git commit -m "feat: add ansible bootstrap for k3s nodes"
```

### Task 4: Add Argo CD Bootstrap Manifests

**Files:**

- Create: `platform/gitops/argocd/bootstrap/namespace.yaml`
- Create: `platform/gitops/argocd/bootstrap/kustomization.yaml`
- Create: `platform/gitops/argocd/root-project.yaml`
- Create: `platform/gitops/argocd/root-application.yaml`
- Create: `clusters/datacenter/kustomization.yaml`
- Test: `tests/gitops/test_kustomize.sh`

- [ ] **Step 1: Write the failing test**

```bash
#!/usr/bin/env bash
set -euo pipefail

kubectl kustomize platform/gitops/argocd/bootstrap >/dev/null
kubectl kustomize clusters/datacenter >/dev/null
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bash tests/gitops/test_kustomize.sh`
Expected: FAIL because the Kustomize directories and manifests do not exist yet.

- [ ] **Step 3: Write minimal implementation**

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: argocd
```

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: argocd
resources:
  - namespace.yaml
  - https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: datacenter
  namespace: argocd
spec:
  sourceRepos:
    - "*"
  destinations:
    - namespace: "*"
      server: https://kubernetes.default.svc
  clusterResourceWhitelist:
    - group: "*"
      kind: "*"
```

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: datacenter-root
  namespace: argocd
spec:
  project: datacenter
  source:
    repoURL: https://github.com/bill/datacenter.git
    targetRevision: main
    path: clusters/datacenter
  destination:
    server: https://kubernetes.default.svc
    namespace: argocd
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../platform/gitops/argocd/root-project.yaml
  - ../../platform/gitops/argocd/root-application.yaml
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bash tests/gitops/test_kustomize.sh`
Expected: PASS with both `kubectl kustomize` commands exiting successfully.

- [ ] **Step 5: Commit**

```bash
git add platform/gitops/argocd/bootstrap/namespace.yaml platform/gitops/argocd/bootstrap/kustomization.yaml platform/gitops/argocd/root-project.yaml platform/gitops/argocd/root-application.yaml clusters/datacenter/kustomization.yaml tests/gitops/test_kustomize.sh
git commit -m "feat: add argocd bootstrap manifests"
```

### Task 5: Add The One-Command Bring-Up And Verification Flow

**Files:**

- Create: `bootstrap/scripts/cluster-up.sh`
- Create: `bootstrap/scripts/cluster-verify.sh`
- Modify: `Makefile`
- Test: `tests/bootstrap/test_cluster_scripts.sh`

- [ ] **Step 1: Write the failing test**

```bash
#!/usr/bin/env bash
set -euo pipefail

test -x bootstrap/scripts/cluster-up.sh
test -x bootstrap/scripts/cluster-verify.sh
grep -q '^cluster-up:' Makefile
grep -q '^cluster-verify:' Makefile
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bash tests/bootstrap/test_cluster_scripts.sh`
Expected: FAIL because the cluster orchestration scripts do not exist yet.

- [ ] **Step 3: Write minimal implementation**

```bash
#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${1:-bootstrap/config/datacenter.env}"

bash bootstrap/scripts/validate-env.sh "$ENV_FILE"

set -a
source "$ENV_FILE"
set +a

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
  -var="ssh_public_key=$(cat "$SSH_PRIVATE_KEY_PATH.pub")"

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
```

```bash
#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${1:-bootstrap/config/datacenter.env}"

set -a
source "$ENV_FILE"
set +a

export KUBECONFIG="$KUBECONFIG_PATH"

kubectl get nodes
kubectl wait --for=condition=Ready nodes --all --timeout=180s
kubectl wait --for=condition=Available deployment/argocd-server -n argocd --timeout=180s
kubectl get applications -n argocd

echo "cluster verification passed"
```

```makefile
.PHONY: cluster-up
cluster-up:
	bash bootstrap/scripts/cluster-up.sh

.PHONY: cluster-verify
cluster-verify:
	bash bootstrap/scripts/cluster-verify.sh
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bash tests/bootstrap/test_cluster_scripts.sh`
Expected: PASS with no output.

- [ ] **Step 5: Commit**

```bash
git add Makefile bootstrap/scripts/cluster-up.sh bootstrap/scripts/cluster-verify.sh tests/bootstrap/test_cluster_scripts.sh
git commit -m "feat: add cluster bring-up orchestration"
```

### Task 6: Add The Bootstrap Runbook

**Files:**

- Create: `docs/runbooks/cluster-bootstrap.md`
- Test: `tests/docs/test_cluster_bootstrap_doc.sh`

- [ ] **Step 1: Write the failing test**

```bash
#!/usr/bin/env bash
set -euo pipefail

test -f docs/runbooks/cluster-bootstrap.md
grep -q 'make cluster-up' docs/runbooks/cluster-bootstrap.md
grep -q 'make cluster-verify' docs/runbooks/cluster-bootstrap.md
grep -q 'Prepared hosts' docs/runbooks/cluster-bootstrap.md
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bash tests/docs/test_cluster_bootstrap_doc.sh`
Expected: FAIL because the bootstrap runbook does not exist yet.

- [ ] **Step 3: Write minimal implementation**

````markdown
# Cluster Bootstrap

## Prepared hosts

- Proxmox is installed on `pve-1` and reachable at `10.100.0.100`
- Proxmox is installed on `pve-2` and reachable at `10.100.0.101`
- an Ubuntu cloud-init template exists on both Proxmox hosts
- `bootstrap/config/datacenter.env` exists

## Bring the cluster up

```bash
cp bootstrap/config/datacenter.example.env bootstrap/config/datacenter.env
make bootstrap-validate
make cluster-up
```
````

## Verify the cluster

```bash
make cluster-verify
kubectl get nodes
kubectl get applications -n argocd
```

````

- [ ] **Step 4: Run test to verify it passes**

Run: `bash tests/docs/test_cluster_bootstrap_doc.sh`
Expected: PASS with no output.

- [ ] **Step 5: Commit**

```bash
git add docs/runbooks/cluster-bootstrap.md tests/docs/test_cluster_bootstrap_doc.sh
git commit -m "docs: add cluster bootstrap runbook"
````
