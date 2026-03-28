# Datacenter

Datacenter is a reproducible local infrastructure lab: it provisions a 3-node `k3s` cluster across two Proxmox hosts, bootstraps the nodes from a workstation, and hands cluster state to Argo CD-managed GitOps. It is the foundation for a later operations dashboard and failure-drill environment described in the design docs.

This repo includes:

- Terraform for Proxmox VM provisioning
- Ansible for node bootstrap and `k3s`
- Argo CD bootstrap and root app manifests
- bootstrap scripts, tests, and runbooks

## Bootstrap

```bash
cp bootstrap/config/datacenter.example.env bootstrap/config/datacenter.env
make bootstrap-validate
make cluster-up
make cluster-verify
```

## Prereqs

- prepared `pve-1` and `pve-2` Proxmox hosts
- Ubuntu cloud-init template on both hosts
- Terraform, Ansible, `kubectl`, SSH, `scp`

## Repo map

- `bootstrap/`
- `infra/proxmox/`
- `platform/gitops/`
- `clusters/datacenter/`
- `docs/`
- `tests/`

## Docs

- `docs/runbooks/cluster-bootstrap.md`
- `docs/specs/2026-03-28-datacenter-dashboard-design.md`
- `docs/proxmox/hardware-overview.md`
- `docs/proxmox/network-configuration.md`
