# Datacenter Dashboard Plan Index

This project is split into three plans so infrastructure, platform services, and application work can be implemented and verified independently.

Current status:

- Plan 1 implementation exists in repo and current validation scripts pass
- Plan 2 is the next executable implementation target
- Plan 3 is scoped as a roadmap and should become a detailed implementation plan after Plan 2 lands

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

- newly defined
- next plan to execute

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

- roadmap only for now
- convert into a full implementation plan after Plan 2 decisions settle
