# Cluster Bootstrap

## Prepared hosts

- Proxmox is installed on `pve-1` and reachable at `10.100.0.100`
- Proxmox is installed on `pve-2` and reachable at `10.100.0.101`
- an Ubuntu cloud-init template exists on both Proxmox hosts
- `PVE1_TEMPLATE_VM_ID` and `PVE2_TEMPLATE_VM_ID` match template VMs that exist on those exact nodes
- `PVE1_STORAGE` and `PVE2_STORAGE` match storage IDs that exist on those exact nodes
- the Terraform API token has clone ACLs on the template VM paths; see `docs/proxmox/network-configuration.md`
- `bootstrap/config/datacenter.env` exists
- `GITHUB_REPO_USERNAME` and `GITHUB_FINE_GRAINED_PAT` are set for Argo CD repo access before making the repo private

## Bring the cluster up

```bash
cp bootstrap/config/datacenter.example.env bootstrap/config/datacenter.env
cp infra/proxmox/terraform.tfvars.example infra/proxmox/terraform.tfvars
make bootstrap-validate
make cluster-up
```

For a private GitHub repo, create a fine-grained PAT with `Contents: Read` and `Metadata: Read`, then set it in `bootstrap/config/datacenter.env`. `make cluster-up` applies an Argo CD repository Secret for `https://github.com/billdotdev/datacenter.git` from those env values.

## Verify the cluster

```bash
make cluster-verify
kubectl get nodes
kubectl get applications -n argocd
```
