# Dashboard Phase 3 Read APIs Design

## Goal

Ship the first read-only cluster data slice inside the dashboard:

- cluster summary
- node list
- Argo CD application list

This slice must keep the browser outside the Kubernetes trust boundary and must not include any write paths, drills, or direct browser-to-cluster access.

## Scope

Included:

- backend-only Kubernetes reads using `@kubernetes/client-node`
- read-only dashboard service account and RBAC
- server-side data access for nodes and Argo CD applications
- TanStack Start server functions for initial load and refresh
- homepage replacement of placeholder shell cards with live data
- polling refresh every 20 seconds

Excluded:

- pod/workload detail pages
- drill execution
- realtime websockets/SSE
- Grafana embeds
- audit logging for reads

## Chosen Approach

Use `@kubernetes/client-node`, not `kubectl` shell-outs.

Why:

- stronger app boundary
- typed Kubernetes access
- cleaner error handling
- easier to extend into later cluster/drill phases

## Architecture

### Backend Boundary

The dashboard backend remains the only Kubernetes client.

The browser calls app server functions only. The app server:

- authenticates the user through existing Better Auth sessions
- authorizes by existing app role model
- reads cluster state with a pod-mounted Kubernetes service account
- returns normalized JSON for the UI

### Data Sources

Initial reads:

- core `Node` objects
- Argo CD `Application` custom resources in namespace `argocd`

Cluster summary is derived, not separately stored.

### Summary Shape

Initial summary fields:

- cluster name
- total node count
- ready node count
- not-ready node count
- Argo application count
- synced application count
- healthy application count
- degraded or out-of-sync application count
- last refreshed timestamp

### Node Shape

Per-node fields:

- name
- ready status
- roles
- kubelet version
- internal IP
- age

### Argo Application Shape

Per-application fields:

- name
- namespace
- sync status
- health status
- target revision

## Auth And Access

This slice is read-only, but still stays behind app auth.

- `viewer`, `operator`, and `admin` can read these APIs
- anonymous users cannot access the dashboard or these reads

No new role distinctions are needed in this slice.

## Kubernetes Access Model

Add a dedicated `ServiceAccount` for the dashboard workload in namespace `dashboard`.

Bind the minimum RBAC needed:

- `get`, `list`, `watch` on `nodes`
- `get`, `list`, `watch` on `applications.argoproj.io`

No broader permissions in this slice.

## UI Behavior

The homepage becomes the first live operations page.

Initial load:

- route loader reads cluster snapshot server-side

Refresh:

- client polls every 20 seconds
- loading state should not blank the page between refreshes
- stale data should remain visible while refresh is in flight

Failure handling:

- show the last good snapshot if refresh fails
- surface one compact error banner with retry guidance

## Error Model

Backend errors should be normalized into a small app-level error shape.

Expected failure classes:

- Kubernetes client misconfiguration
- RBAC forbidden
- Argo CRD unavailable
- transient API timeout

The UI should show partial degradation clearly:

- if nodes load and Argo fails, still show node data
- if Argo loads and nodes fail, still show Argo data

## Acceptance Checks

Phase 3 first slice is complete when:

- dashboard pod can read nodes and Argo applications in-cluster
- homepage shows live node counts and Argo app states
- polling updates the page without reload
- anonymous users still redirect to login
- authenticated users can load the page repeatedly without direct browser Kubernetes access

## Follow-On Work

After this slice:

1. add workload and namespace views
2. add pod/workload drill-downs
3. add audit logging for sensitive reads if needed
4. move to drill execution APIs
