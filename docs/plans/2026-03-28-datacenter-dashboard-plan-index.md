# Datacenter Dashboard Plan Index

This project is split into three plans so infrastructure, platform services, and application work can be implemented and verified independently.

Current status:

- Plan 1 implementation exists in repo and the cluster is live
- Plan 2 implementation exists in repo and is live in the current cluster, with minor operational cleanup remaining
- Plan 3 is now the next executable implementation target and should become a detailed implementation plan

## Plan 1

`docs/plans/2026-03-28-cluster-bootstrap-and-gitops-foundation.md`

Scope:

- multi-host Proxmox VM provisioning
- `k3s` bootstrap
- Argo CD bootstrap
- one-command cluster bring-up and verification

Status:

- implemented in repo
- see status note at the top of the plan file for checkbox caveat

## Plan 2

`docs/plans/2026-03-28-platform-services.md`

Scope:

- ingress
- internal TLS
- PostgreSQL
- Prometheus
- Grafana
- Loki
- chaos tooling

Status:

- implemented in repo
- live in the current cluster
- remaining work is operational cleanup, not first-pass implementation

## Plan 3

`docs/plans/2026-03-28-dashboard-application.md`

Scope:

- TanStack Start app
- auth and roles
- realtime updates
- drill execution APIs
- scheduler
- audit log
- embedded Grafana

Status:

- next executable implementation target
- convert this roadmap into a full implementation plan against the live platform baseline
