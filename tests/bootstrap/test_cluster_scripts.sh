#!/usr/bin/env bash
set -euo pipefail

test -x bootstrap/scripts/cluster-up.sh
test -x bootstrap/scripts/cluster-verify.sh
test -x bootstrap/scripts/dashboard-registry-secret.sh
grep -q '^cluster-up:' Makefile
grep -q '^cluster-verify:' Makefile
grep -q '^dashboard-registry-secret:' Makefile
grep -q 'infra/proxmox/terraform.tfvars' bootstrap/scripts/cluster-up.sh
grep -q 'LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8 ANSIBLE_CONFIG=bootstrap/ansible/ansible.cfg ansible-playbook' bootstrap/scripts/cluster-up.sh
grep -q 'ssh-keygen -R "$CP1_IP"' bootstrap/scripts/cluster-up.sh
grep -q 'ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -i "$SSH_PRIVATE_KEY_PATH" "$SSH_USER@$CP1_IP" '"'sudo cat /etc/rancher/k3s/k3s.yaml'"' >"$KUBECONFIG"' bootstrap/scripts/cluster-up.sh
grep -q 'kubectl apply --server-side --force-conflicts -k platform/gitops/argocd/bootstrap' bootstrap/scripts/cluster-up.sh
grep -q 'argocd.argoproj.io/secret-type: repository' bootstrap/scripts/cluster-up.sh
grep -q 'https://github.com/billdotdev/datacenter.git' bootstrap/scripts/cluster-up.sh
grep -q 'GITHUB_FINE_GRAINED_PAT' bootstrap/scripts/cluster-up.sh
grep -q 'gateway.gateway.networking.k8s.io/shared-gateway' bootstrap/scripts/cluster-verify.sh
grep -q 'certificate.cert-manager.io/datacenter-ingress-tls' bootstrap/scripts/cluster-verify.sh
grep -q 'cluster.postgresql.cnpg.io/datacenter-postgres' bootstrap/scripts/cluster-verify.sh
grep -q 'jsonpath=' bootstrap/scripts/cluster-verify.sh
grep -q 'GHCR_USERNAME' bootstrap/scripts/dashboard-registry-secret.sh
grep -q 'GHCR_PULL_TOKEN' bootstrap/scripts/dashboard-registry-secret.sh
grep -q 'kubectl create namespace dashboard' bootstrap/scripts/dashboard-registry-secret.sh
grep -q 'kubectl create secret docker-registry regcred' bootstrap/scripts/dashboard-registry-secret.sh
