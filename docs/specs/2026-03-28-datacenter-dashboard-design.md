# Datacenter Dashboard Lab Design

## Goal

Build a reproducible, local-only Kubernetes lab that demonstrates enterprise-style operations on constrained hardware. The system should provision a 3-node cluster across two laptops, deploy a custom operations dashboard through GitOps, and let authenticated users observe and trigger realistic failure drills while seeing live cluster impact.

## Constraints

- Hardware is limited to two laptops for the first version
- Both laptops will run Proxmox
- All Kubernetes nodes will run as Ubuntu Server 24.04 LTS VMs
- The cluster should be local-network only in v1
- Authentication must be self-contained in the app
- The app must use real roles: `admin`, `operator`, `viewer`
- Reproducibility matters more than bare-metal realism in v1
- A working visual demo is more important than maximizing Kubernetes complexity in v1

## Recommended Approach

Use `k3s` for the first version, with the repo structured so the cluster can later be rebuilt on Talos or `kubeadm` without changing the GitOps and application model.

## Architecture Overview

### Physical Layout

- Host A: `pve-1` on laptop 1 at `10.100.0.100`
- Host B: `pve-2` on laptop 2 at `10.100.0.101`
- Node `cp-1` (`cp` = control plane): Ubuntu Server 24.04 LTS VM on `pve-1` at `10.100.0.111`
- Node `cp-2`: Ubuntu Server 24.04 LTS VM on `pve-1` at `10.100.0.112`
- Node `cp-3`: Ubuntu Server 24.04 LTS VM on `pve-2` at `10.100.0.113`

All three Kubernetes nodes are both control-plane and worker nodes.

### Availability Model

This layout provides a quorum-based 3-node control plane, but it is not fully resilient to physical host loss in both directions:

- if Host B fails, `cp-1` and `cp-2` can still maintain quorum
- if Host A fails, two of the three control-plane nodes are lost and the control plane loses quorum

The design should therefore be described as:

- highly available at the control-plane level within the limits of two physical hosts
- not resilient to total loss of the Proxmox host
- intentionally designed for later expansion to a third failure domain

## Provisioning and Reproducibility

### Day 0 Manual Setup

Manual setup is acceptable for the substrate:

- install Proxmox on `pve-1`
- install Proxmox on `pve-2`
- configure Proxmox networking and storage on both hosts
- prepare API access needed for automation on both hosts

### Automated Rebuild Target

From the prepared host baseline, a single command from the workstation should:

1. Provision `cp-1` and `cp-2` on `pve-1`
2. Provision `cp-3` on `pve-2`
3. Apply base bootstrap configuration to all VM nodes
4. Install `k3s` across all three nodes
5. Install Argo CD
6. Trigger initial GitOps sync

After that point, cluster software should be reconciled from Git by Argo CD.

## GitOps Architecture

GitOps should start at the earliest practical point, but not attempt to own the first bootstrap step.

### Tool Choice

Use Argo CD for v1.

The repo should keep the directory naming generic enough that the GitOps tool could later change without restructuring everything.

### Repository Layout

Recommended top-level structure:

- `bootstrap/`
- `infra/proxmox/`
- `clusters/datacenter/`
- `platform/gitops/`
- `platform/observability/`
- `platform/security/`
- `platform/data/`
- `platform/chaos/`
- `apps/dashboard/`
- `docs/`

Responsibilities:

- `bootstrap/`: workstation-driven scripts and orchestration for initial cluster creation
- `infra/proxmox/`: Proxmox VM definitions and related automation
- `clusters/datacenter/`: cluster-specific composition and environment wiring
- `platform/gitops/`: Argo CD installation and root applications
- `platform/observability/`: Prometheus, Grafana, Loki, dashboards, alerting
- `platform/security/`: ingress access controls, cert-manager, service accounts, RBAC-related platform manifests
- `platform/data/`: PostgreSQL and supporting data services
- `platform/chaos/`: chaos tooling and scenario helpers
- `apps/dashboard/`: the application source, deployment, and app-specific manifests

## Platform Components

The first platform release should include:

- Argo CD
- ingress controller
- cert-manager for internal TLS
- PostgreSQL
- Prometheus
- Grafana
- Loki
- chaos tooling such as Chaos Mesh or LitmusChaos

Initial principles:

- local-network only access in v1
- internal TLS is still worth doing
- Grafana is embedded read-only inside the custom app
- disruptive actions must only be performed through the app backend

## Application Design

### Stack

- frontend and backend: TypeScript
- web framework: TanStack Start
- database: PostgreSQL
- Kubernetes access: `@kubernetes/client-node`

### Backend Boundary

The dashboard must not call the Kubernetes API directly. The app backend is the control boundary.

Backend responsibilities:

- authentication
- authorization
- session management
- user and role administration
- simulation execution
- scheduler execution
- audit logging
- Kubernetes API access
- exposing app APIs for cluster views and drill operations

The backend should run with a tightly scoped Kubernetes service account and only the permissions needed for the supported scenarios.

## Authentication and Authorization

Authentication is self-contained inside the application.

V1 auth model:

- email/password login
- secure password hashing
- server-managed sessions
- role-based authorization in the application layer

V1 roles:

- `viewer`: can observe dashboards, cluster state, and audit history
- `operator`: can run approved simulations when disruptive actions are enabled
- `admin`: can manage users, roles, schedules, feature flags, and globally disable disruptive actions

## Data Model

All application data should be stored in PostgreSQL.

Initial persisted entities:

- users
- password hashes
- roles
- sessions
- feature flags
- simulation definitions
- simulation schedules
- simulation runs
- audit logs
- app configuration relevant to safety and scheduling

Kubernetes remains the system being operated, but not the system of record for application state.

## Realtime Behavior

The dashboard should be realtime.

Custom dashboard views should update through backend-driven realtime events, preferably WebSockets in v1.

Realtime surfaces:

- node health
- pod health
- active drills
- drill outcomes
- topology changes
- audit log stream
- disruptive-action enabled or disabled state

Grafana panels can refresh on their own interval and do not need to share the same event channel.

## Simulation and Chaos Model

V1 should support both manual and scheduled drills.

### Manual Drills

Operators and admins can trigger simulations directly from the dashboard when disruptive actions are enabled.

### Scheduled Drills

The backend includes a scheduler capable of launching controlled random drills.

### Safety Model

- disruptive actions can be globally disabled by admins
- all actions must be audited
- all supported scenarios must go through permission checks
- scenario definitions should carry enough metadata to validate allowed targets and blast radius

### Initial Scenario Set

The first scenario set should include:

- pod failure
- node disruption such as cordon/drain and recovery-oriented workflows
- traffic spike generation
- latency or error injection

## Observability Model

The custom app is the operator experience, while Grafana is the charting backend.

Use embedded Grafana panels or dashboards for read-only visualization inside the custom app.

The app should provide custom cluster-centric views that Grafana alone does not model well:

- topology overview
- drill controls
- drill history
- live incident feed
- role-aware controls
- safety toggle visibility

## Delivery and Validation

Validation should be part of the design from the beginning.

The system should support verification of:

- cluster bootstrap success
- GitOps sync success
- platform component health
- user login
- role enforcement
- realtime state updates
- manual drill execution
- scheduled drill execution
- observable recovery behavior
- rebuild flow from prepared hosts

## Documentation Deliverables

The project should ship with:

- architecture diagram
- bootstrap guide
- operations runbook
- drill catalog
- local access instructions
- limitations and HA caveats
- future third-failure-domain expansion notes
