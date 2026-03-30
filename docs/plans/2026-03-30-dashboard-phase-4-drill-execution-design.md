# Dashboard Phase 4 Drill Execution Design

## Goal

Ship the first controlled write-path slice inside the dashboard:

- drill catalog with one seeded scenario
- manual drill execution for authenticated operators
- PostgreSQL-backed run history
- audit logging for allowed and denied execution attempts
- global disruptive-action gate

This slice must keep the browser outside the Kubernetes trust boundary and must not include scheduler support, generic target selection, or multiple drill kinds.

## Scope

Included:

- one seeded drill definition: `pod-delete-dashboard`
- backend-only drill execution using Chaos Mesh `PodChaos`
- PostgreSQL-backed drill definitions, runs, audit events, and app config
- app-enforced role checks for `operator` and `admin`
- admin-controlled global `disruptive_actions_enabled` flag
- dedicated drills page with execution controls and recent run history
- tightly scoped Kubernetes RBAC for creating and reading Chaos Mesh `PodChaos`

Excluded:

- scheduler support
- arbitrary YAML submission
- user-provided namespace or selector input
- non-dashboard target workloads
- traffic spike drills
- latency or error injection drills
- node cordon or drain workflows
- realtime status streaming

## Chosen Approach

Use an app-owned drill catalog backed by PostgreSQL and execute the first drill by creating a Chaos Mesh `PodChaos` resource.

Why:

- safer than direct pod deletion from app code
- aligns with the Chaos Mesh platform surface already installed
- preserves a clean extension path for later traffic and latency drills
- keeps scenario definitions explicit and auditable

Alternatives rejected:

- hardcoded execution path with no catalog table: faster now, but throws away the data shape needed for later phases
- generic multi-CRD executor: too much RBAC and trust-surface expansion for the first write path

## Architecture

### Backend Boundary

The dashboard backend remains the only write-capable control point.

The browser calls server functions only. The app server:

- authenticates the user through existing Better Auth sessions
- authorizes execution by existing app role model
- reads app config and drill definitions from PostgreSQL
- validates the fixed target allowlist for the selected drill
- creates a namespaced Chaos Mesh `PodChaos`
- records run state and audit events in PostgreSQL

The browser never submits raw Kubernetes manifests and never talks directly to the Kubernetes API.

### First Drill Shape

Phase 4 v1 ships one drill only:

- key: `pod-delete-dashboard`
- kind: `pod_delete`
- target namespace: `dashboard`
- target selector: dashboard workload pods only

The first slice proves the full control path end-to-end without touching platform components or broadening blast radius beyond the dashboard app itself.

### Execution Model

Execution is request/response plus polling:

1. user opens the drills page
2. app loads catalog, global safety state, and recent runs
3. operator or admin clicks execute on the single seeded drill
4. app inserts a run row and creates a `PodChaos` object
5. app updates run status based on creation outcome
6. drills page polls for recent run changes and current safety state
7. backend refreshes recent `running` rows by reading current `PodChaos` status and marks terminal runs `succeeded` or `failed`

This slice does not add WebSockets or SSE. Realtime drill progress belongs to phase 5.

## Data Model

### `drill_definitions`

Seed one row for `pod-delete-dashboard`.

Fields:

- `id`
- `key`
- `name`
- `kind`
- `enabled`
- `requiresDisruptiveActions`
- `targetNamespace`
- `targetSelector`
- `blastRadiusSummary`
- `chaosTemplate`
- `createdAt`
- `updatedAt`

Notes:

- `key` is stable and app-owned
- `targetSelector` is stored, not user-provided
- `chaosTemplate` stores the fixed pod-delete template payload the backend will materialize into a `PodChaos`

### `drill_runs`

Store one row per execution attempt.

Fields:

- `id`
- `drillDefinitionId`
- `requestedByUserId`
- `status`
- `targetSummary`
- `chaosNamespace`
- `chaosName`
- `requestedAt`
- `startedAt`
- `finishedAt`
- `errorMessage`

Initial statuses:

- `pending`
- `running`
- `succeeded`
- `failed`

### `audit_log`

Append audit events for both denied and allowed attempts.

Fields:

- `id`
- `eventType`
- `actorUserId`
- `subjectType`
- `subjectId`
- `payload`
- `createdAt`

Initial event types:

- `drill.execution.denied`
- `drill.execution.requested`
- `drill.execution.created`
- `drill.execution.completed`
- `drill.execution.failed`
- `safety.disruptive_actions.updated`

### `app_config`

Store global app safety settings.

Initial key:

- `disruptive_actions_enabled`

Default:

- `false`

## Auth And Access

- `viewer`: can read drill catalog and run history, cannot execute
- `operator`: can execute approved drills when disruptive actions are enabled
- `admin`: can execute approved drills and toggle disruptive actions

No new role types are needed in this slice.

## Safety Model

All execution paths fail closed.

Rules:

- deny when session is missing
- deny when role is not `operator` or `admin`
- deny when `disruptive_actions_enabled` is `false`
- deny when drill definition is missing or disabled
- deny when the stored target namespace or selector falls outside the fixed allowlist
- deny any attempt to pass user-controlled Kubernetes target data

Execution safeguards:

- backend creates Chaos Mesh objects only in `chaos-mesh`
- resource names are generated by the app
- labels and annotations tie each object to run id, user id, and drill key
- UI shows blast-radius summary before execution
- execution requires explicit user confirmation

## Kubernetes Access Model

Keep the existing dashboard service account and expand it minimally for the first write path.

Required access:

- create, get, list, watch on `podchaos.chaos-mesh.org`

No broader Chaos Mesh permissions should be added in this slice.

Use a namespace-scoped `Role` and `RoleBinding` in `chaos-mesh`, not a cluster-wide grant, because `PodChaos` is namespaced.

The app should create `PodChaos` in `chaos-mesh`, while target selection remains fixed to dashboard pods in namespace `dashboard`.

## API Design

### `readDrillCatalog`

Read-only server function returning:

- seeded drill cards
- global disruptive-actions flag
- recent run history

All authenticated roles may call this.

Before returning, this function should reconcile recent `running` rows against current `PodChaos` status and emit terminal audit events when a run moves to `succeeded` or `failed`.

### `executeDrill`

Mutation server function taking:

- `drillKey`

No target or manifest input is accepted from the browser in v1.

Flow:

1. load session
2. require `operator` or `admin`
3. load global safety flag
4. load drill definition by key
5. validate stored namespace and selector against fixed allowlist
6. insert `drill_runs` row as `pending`
7. append audit event for requested execution
8. create `PodChaos`
9. update run row to `running` or `failed`
10. append audit event for created or failed outcome

### `setDisruptiveActionsEnabled`

Admin-only mutation server function taking:

- `enabled`

Flow:

1. load session
2. require `admin`
3. update `app_config`
4. append audit event

## UI Behavior

### Drills Route

Add a dedicated `/drills` route for authenticated users.

Show:

- page-level safety state
- one card for `pod-delete-dashboard`
- blast-radius summary
- allowed target summary
- execute button
- recent run table

Execution button behavior:

- disabled for `viewer`
- disabled when disruptive actions are off
- enabled only for `operator` and `admin` when safety flag is on

### Admin Surface

Extend the existing admin route with a minimal safety toggle:

- current disruptive-actions state
- toggle control for admins only
- compact explanatory text warning that drill execution is globally blocked when off

No broader admin management surface is needed in this slice.

### Failure Handling

The drills page should:

- keep last successful catalog and run list visible during polling
- show a compact inline error when execute fails
- show denied-state messaging clearly for viewers and for disabled safety mode

## Error Model

Normalize backend errors into app-level categories:

- unauthenticated
- unauthorized
- disruptive actions disabled
- drill disabled
- drill misconfigured
- Chaos Mesh API failure
- database persistence failure

The UI should present compact, operator-readable messages and keep prior run history visible if refresh fails.

## Acceptance Checks

Phase 4 first slice is complete when:

- authenticated viewers can read the drills page but cannot execute
- authenticated operators and admins can execute the seeded drill only when disruptive actions are enabled
- the backend creates a `PodChaos` object with fixed target scope for dashboard pods only
- each execution attempt produces run-history and audit-log records
- admins can toggle disruptive actions on and off from the app
- the dashboard service account has only the additional Chaos Mesh permissions required for `PodChaos`

## Follow-On Work

Recommended next order after this slice:

1. add `traffic spike` drill
2. add `latency/error inject` drill
3. add `node cordon/drain` last
4. add phase 5 realtime views for active and completed drills
5. add phase 6 scheduler and broader safety controls
