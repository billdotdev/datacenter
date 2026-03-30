# Dashboard Phase 4 Multi-Target Drill Design

## Goal

Complete the remaining Phase 4 drill scope by extending the dashboard from one fixed target drill to an app-owned allowlisted target catalog with multiple drill kinds:

- pod delete
- traffic spike
- latency or error injection
- node cordon and drain

This design keeps Kubernetes targeting server-side, allows operators to choose only from code-defined targets, and preserves a small browser trust surface.

## Scope

Included:

- code-defined allowlist of approved drill targets
- operator target selection by `targetKey`, never raw Kubernetes input
- service/workload targets for `dashboard`, `istiod`, `datacenter-postgres`, and `loki`
- exact-node allowlist for node drills
- additional drill definitions for traffic spike, latency/error injection, and node cordon/drain
- audit and run-history coverage for selected targets
- narrow RBAC expansion for only the resources required by enabled drill kinds

Excluded:

- admin-managed targets in the UI
- arbitrary namespace, selector, service, or node input
- realtime streaming
- scheduler support
- dashboard HA implementation work

## Current Baseline

Already implemented:

- one seeded `pod-delete-dashboard` drill
- global disruptive-actions gate
- run history
- audit records
- Chaos Mesh-backed execution path

Phase 4 is not complete because the roadmap also calls for:

- traffic spike generation
- latency or error injection
- node cordon and drain

## Chosen Approach

Use two app-owned catalogs:

1. `drill_definition`
2. `drill_target`

The browser submits `drillKey` and `targetKey`. The backend resolves both from PostgreSQL, validates compatibility, materializes the exact Kubernetes action, and records the resolved target in run and audit records.

Why:

- preserves operator choice without expanding trust boundary
- keeps targets reviewable in code and seed migrations
- scales cleanly across workload and node drills
- avoids a combinatorial explosion of one-drill-per-target rows

Alternatives rejected:

- one drill row per target pair: simple now, poor maintainability
- admin-managed targets: broader safety surface and extra UI
- raw namespace or selector input: unacceptable for this control path

## Data Model

### `drill_definition`

Extend current drill definitions so each row describes a drill kind and compatible target type.

Fields added:

- `targetType`
- `template`

Values:

- `targetType`: `workload` or `node`
- `template`: app-owned execution template payload for the drill kind

Initial definitions:

- `pod-delete`
- `traffic-spike`
- `network-latency`
- `network-error`
- `node-cordon-drain`

Notes:

- keep `key` stable and human-readable
- remove target-specific naming from drill keys
- use target rows for selected workload or node

### `drill_target`

New allowlist table for selectable targets.

Fields:

- `id`
- `key`
- `name`
- `kind`
- `namespace`
- `serviceName`
- `selector`
- `nodeName`
- `blastRadiusSummary`
- `enabled`
- `createdAt`
- `updatedAt`

Rules:

- `kind` is `workload` or `node`
- workload targets store `namespace`, `serviceName`, and `selector`
- node targets store exact `nodeName`
- no free-form data comes from the browser

Initial workload targets:

- `dashboard`
- `istiod`
- `datacenter-postgres`
- `loki`

Initial node targets:

- one exact worker node, seeded from code once the node name is confirmed

### `drill_run`

Extend run records to capture the resolved target.

Fields added:

- `drillTargetId`
- `drillKey`
- `targetKey`

Keep:

- `targetSummary`
- `status`
- `chaosNamespace`
- `chaosName`
- timestamps
- `errorMessage`

### `audit_log`

Keep current model, but payloads must include:

- `drillKey`
- `targetKey`
- `targetSummary`

for requested, denied, created, completed, and failed events.

## Target Model

### Workload Targets

Represent a specific approved service/workload.

Stored data:

- namespace
- service name
- exact label selector
- blast-radius summary

Selected workload targets for this phase:

- `dashboard/dashboard`
- `istio-system/istiod`
- `database/datacenter-postgres`
- `observability/loki`

Implementation must begin by verifying the live selectors for these workloads and then seeding only the verified selector values into the allowlist migration.

### Node Targets

Represent an exact node name only.

Rules:

- no label-based node selection
- no random node choice at runtime
- one exact allowlisted worker node in this phase

## Drill Kinds

### Pod Delete

- target type: `workload`
- executor: Chaos Mesh `PodChaos`
- effect: delete one matching pod

### Traffic Spike

- target type: `workload`
- executor: app-created Kubernetes `Job`
- effect: fixed load-generator image sends HTTP traffic to the selected service

Why use a Job instead of a Chaos Mesh CRD:

- traffic generation is a workload action, not a fault injection primitive
- easier to reason about rate, duration, and cleanup
- narrower and more explicit than trying to overload Chaos Mesh for load generation

### Network Latency

- target type: `workload`
- executor: Chaos Mesh network chaos CRD
- effect: inject fixed latency against the selected workload

### Network Error

- target type: `workload`
- executor: Chaos Mesh network chaos CRD
- effect: inject fixed packet loss or request failure mode against the selected workload

### Node Cordon And Drain

- target type: `node`
- executor: backend Kubernetes client using core APIs
- effect: cordon exact node, evict evictable pods, then record completion or failure

Safety note:

- this is the highest-risk drill in Phase 4
- it must stay exact-node only
- it requires its own narrow RBAC grants

## Execution Model

`executeDrill` takes:

- `drillKey`
- `targetKey`

Flow:

1. load session
2. require `operator` or `admin`
3. load disruptive-actions flag
4. load drill definition by `drillKey`
5. load target by `targetKey`
6. verify drill and target are enabled
7. verify `drill.targetType` matches `target.kind`
8. validate target against app-owned allowlist rules
9. insert run row as `pending`
10. append `drill.execution.requested`
11. execute drill through the matching executor
12. update run row to `running`, `succeeded`, or `failed`
13. append created/completed/failed audit events

Browser restrictions:

- no raw manifest input
- no namespace or selector input
- no node input

## UI Behavior

### Drills Route

Each drill card shows:

- drill name
- blast-radius summary
- target selector dropdown
- target-specific blast-radius text
- execute button

Behavior:

- only compatible targets appear for a drill
- viewers can read but not execute
- confirmation text includes both drill and target
- recent runs show both drill and target

### Admin Surface

Keep the global disruptive-actions toggle on the dashboard UI.

No target management UI is added in this phase.

## Error Model

Add normalized errors for:

- invalid target
- incompatible target type
- target disabled
- traffic job failure
- network chaos creation failure
- node cordon failure
- node drain failure

The UI should keep prior catalog and run history visible on refresh failures.

## Kubernetes Access Model

Workload drills require:

- existing `PodChaos` access
- exact Chaos Mesh CRDs for chosen network fault resources
- create/get/list/watch/delete on the load-generator `Job`
- target-namespace read access for selected workload namespaces

Node drill requires:

- `nodes` get/list/watch/patch
- `pods` get/list/watch in relevant namespaces
- `pods/eviction` create

RBAC rules should be split by responsibility so node-drill rights can be reviewed separately from workload-drill rights.

## Dashboard HA Note

The dashboard recovery delay is a real issue, but it is not part of drill-scope completion.

Treat it as separate hardening work after Phase 4:

- increase dashboard replicas to at least 2
- add pod anti-affinity or topology spread
- add readiness tuning and a PodDisruptionBudget
- avoid single-pod downtime during drill tests

This should be planned as deployment hardening, not mixed into the drill execution change set.

## Acceptance Checks

Phase 4 is complete when:

- operators can choose only from allowlisted targets in the app
- pod delete works for approved workload targets
- traffic spike works for approved workload targets
- latency or error injection works for approved workload targets
- node cordon/drain works for one exact approved node
- all execution attempts record drill, target, run, and audit data
- disruptive-actions gating applies to every drill kind
- RBAC remains narrowed to the exact resources required by enabled drills

## Implementation Prerequisite

Before seed data is finalized:

- verify the live selectors for `istiod`, `datacenter-postgres`, and `loki`
- confirm the exact node name for the first node target seed

The implementation plan should make this the first task and must not seed guessed selectors or guessed node names.
