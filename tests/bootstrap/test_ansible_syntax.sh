#!/usr/bin/env bash
set -euo pipefail

export LC_ALL=en_US.UTF-8
export LANG=en_US.UTF-8
export ANSIBLE_CONFIG=bootstrap/ansible/ansible.cfg

ansible_home="$(mktemp -d /tmp/datacenter-ansible-home.XXXXXX)"
ansible_tmp="$(mktemp -d /tmp/datacenter-ansible-tmp.XXXXXX)"
trap 'rm -rf "$ansible_home" "$ansible_tmp"' EXIT

export HOME="$ansible_home"
export ANSIBLE_LOCAL_TEMP="$ansible_tmp"

ansible-playbook -i bootstrap/ansible/inventory/datacenter.yml bootstrap/ansible/playbooks/base.yml --syntax-check
ansible-playbook -i bootstrap/ansible/inventory/datacenter.yml bootstrap/ansible/playbooks/k3s.yml --syntax-check
