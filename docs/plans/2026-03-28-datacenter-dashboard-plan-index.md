# Datacenter Dashboard Plan Index

This project is split into three plans so infrastructure, platform services, and application work can be implemented and verified independently.

## Plan 1

`docs/plans/2026-03-28-cluster-bootstrap-and-gitops-foundation.md`

Scope:

- multi-host Proxmox VM provisioning
- `k3s` bootstrap
- Argo CD bootstrap
- one-command cluster bring-up and verification

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
