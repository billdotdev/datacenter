# Dashboard Application Roadmap

**Goal:** Define the recommended sequence for the custom dashboard after the platform layer exists.

**Dependency Rule:** Use the current live Plan 2 platform baseline as the dependency floor for application work: ingress, internal TLS, PostgreSQL, and observability are present, but operator cleanup should stay ahead of deeper application phases.

## Status

- Plan 1: bootstrap and GitOps foundation exist in repo
- Plan 2: implemented in repo and live in the current cluster
- Plan 3: next executable implementation target; convert this roadmap into a full implementation plan

## Scope

- TanStack Start app
- email/password auth
- `admin`, `operator`, `viewer` roles
- PostgreSQL-backed state
- WebSocket-driven live updates
- drill execution APIs
- scheduler
- audit log
- embedded Grafana panels

## Recommended Sequence

### Phase 1: App Shell And Deployment

- create `apps/dashboard/` with the TanStack Start application
- add container build, Kubernetes manifests, and Argo CD application wiring
- add health endpoints and a smoke test page
- prove the app deploys through GitOps before adding auth or drill logic

## Phase 2: Auth, Sessions, And Roles

- add PostgreSQL schema and migration flow
- add user bootstrap path for the first admin
- implement password hashing, login, logout, and session persistence
- add middleware for `viewer`, `operator`, and `admin`
- ship basic admin-only user management

## Phase 3: Cluster Read APIs

- add backend-only Kubernetes client integration
- expose node, pod, namespace, and workload summary APIs
- keep the browser outside the Kubernetes trust boundary
- add audit logging for all control-plane reads that should be traceable

## Phase 4: Drill Catalog And Execution

- define the first scenario catalog:
  - pod failure
  - node cordon and drain
  - traffic spike generation
  - latency or error injection
- store scenario definitions in PostgreSQL with safety metadata
- require permission checks and global disruptive-action gating on every execution path
- add run history and operator-visible blast-radius summaries

## Phase 5: Realtime Views And Embedded Observability

- add WebSocket or SSE channel for live incident state
- surface topology overview, active drills, run timeline, and audit feed
- embed read-only Grafana panels for metrics and logs
- keep custom cluster-centric views in app code instead of trying to force everything through Grafana

## Phase 6: Scheduler And Safety Controls

- add scheduled drill support
- add admin-only feature flags and maintenance windows
- add audit coverage for schedule create, update, disable, and run events
- add kill switch for disruptive actions

## Acceptance Gates Before Full Plan

Convert this roadmap into a full implementation plan after these choices are confirmed against the live cluster:

- which internal hostname scheme Plan 2 uses
- how PostgreSQL credentials are provisioned into workloads
- which ingress auth/session cookie settings are needed for local TLS
- which chaos tool CRDs and RBAC surface are available for drill execution
- whether realtime uses WebSockets or SSE in the deployed environment

## Expected Deliverables

- application design doc update if architecture changes from the current spec
- full implementation plan with file-by-file tasks
- local access instructions for dashboard and Grafana embed flow
- drill catalog and operator runbook
