# Cluster Bootstrap

## Prepared hosts

- Proxmox is installed on `pve-1` and reachable at `10.100.1.100`
- Proxmox is installed on `pve-2` and reachable at `10.100.1.101`
- an Ubuntu cloud-init template exists on both Proxmox hosts
- `bootstrap/config/datacenter.env` exists

## Bring the cluster up

```bash
cp bootstrap/config/datacenter.example.env bootstrap/config/datacenter.env
make bootstrap-validate
make cluster-up
```

## Verify the cluster

```bash
make cluster-verify
kubectl get nodes
kubectl get applications -n argocd
```
