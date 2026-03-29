#!/usr/bin/env bash
set -euo pipefail

test -x bootstrap/scripts/cluster-up.sh
test -x bootstrap/scripts/cluster-verify.sh
grep -q '^cluster-up:' Makefile
grep -q '^cluster-verify:' Makefile
grep -q 'infra/proxmox/terraform.tfvars' bootstrap/scripts/cluster-up.sh
grep -q 'LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8 ANSIBLE_CONFIG=bootstrap/ansible/ansible.cfg ansible-playbook' bootstrap/scripts/cluster-up.sh
grep -q 'ssh-keygen -R "$CP1_IP"' bootstrap/scripts/cluster-up.sh
grep -q 'ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -i "$SSH_PRIVATE_KEY_PATH" "$SSH_USER@$CP1_IP" '"'sudo cat /etc/rancher/k3s/k3s.yaml'"' >"$KUBECONFIG"' bootstrap/scripts/cluster-up.sh
grep -q 'kubectl apply --server-side --force-conflicts -k platform/gitops/argocd/bootstrap' bootstrap/scripts/cluster-up.sh
