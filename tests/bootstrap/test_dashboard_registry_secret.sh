#!/usr/bin/env bash
set -euo pipefail

env_file="$(mktemp)"
fake_bin="$(mktemp -d)"
kubectl_log="$(mktemp)"

cleanup() {
  rm -f "$env_file" "$kubectl_log"
  rm -rf "$fake_bin"
}

trap cleanup EXIT

cat <<EOF >"$env_file"
KUBECONFIG_PATH=/tmp/datacenter.kubeconfig
GHCR_USERNAME=billdotdev
GHCR_PULL_TOKEN=ghp_example_pull_token
EOF

cat <<EOF >"$fake_bin/kubectl"
#!/usr/bin/env bash
echo "\$*" >>"$kubectl_log"
if [[ "\$1" == "apply" ]]; then
  cat >/dev/null
fi
exit 0
EOF
chmod +x "$fake_bin/kubectl"

PATH="$fake_bin:$PATH" bash bootstrap/scripts/dashboard-registry-secret.sh "$env_file"

grep -q 'create namespace dashboard --dry-run=client -o yaml' "$kubectl_log"
grep -q 'create secret docker-registry regcred --namespace dashboard --docker-server ghcr.io --docker-username billdotdev --docker-password ghp_example_pull_token --dry-run=client -o yaml' "$kubectl_log"
