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

grep -q '^stdout_callback = ansible.builtin.default$' bootstrap/ansible/ansible.cfg
grep -q '^result_format = yaml$' bootstrap/ansible/ansible.cfg
grep -q 'wait_for_connection:' bootstrap/ansible/playbooks/base.yml
grep -q 'wait_for_connection:' bootstrap/ansible/playbooks/k3s.yml
grep -q 'K3S_TOKEN={{ k3s_token }}' bootstrap/ansible/playbooks/k3s.yml
token_count="$(grep -c 'K3S_TOKEN={{ k3s_token }}' bootstrap/ansible/playbooks/k3s.yml)"
test "$token_count" -eq 2

inventory_host_output="$(mktemp)"
trap 'rm -rf "$ansible_home" "$ansible_tmp" "$inventory_host_output"' EXIT

ansible-inventory -i bootstrap/ansible/inventory/datacenter.yml --host cp-3 >"$inventory_host_output"
grep -q '"common_packages"' "$inventory_host_output"
grep -q '"k3s_install_channel"' "$inventory_host_output"

ansible-playbook -i bootstrap/ansible/inventory/datacenter.yml bootstrap/ansible/playbooks/base.yml --syntax-check
ansible-playbook -i bootstrap/ansible/inventory/datacenter.yml bootstrap/ansible/playbooks/k3s.yml --syntax-check
