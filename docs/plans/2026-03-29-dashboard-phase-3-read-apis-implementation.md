# Dashboard Phase 3 Read APIs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the first live read-only cluster data slice to the dashboard using `@kubernetes/client-node`, exposing cluster summary, nodes, and Argo CD applications through the app backend and rendering them on the homepage with polling.

**Architecture:** Keep Kubernetes access inside the TanStack Start server boundary. Add a small cluster-read module that loads Kubernetes config, fetches nodes plus Argo CD `Application` resources, normalizes them into app-owned DTOs, and exposes a single server function for the homepage. Bind the dashboard workload to a tightly scoped read-only service account and poll the backend every 20 seconds from the authenticated homepage.

**Tech Stack:** TanStack Start, TanStack Query, Better Auth, TypeScript, Vitest, `@kubernetes/client-node`, Kubernetes RBAC, kustomize

---

### Task 1: Add Cluster Read Models And Summary Derivation

**Files:**
- Modify: `apps/dashboard/package.json`
- Modify: `apps/dashboard/pnpm-lock.yaml`
- Create: `apps/dashboard/src/lib/cluster/models.ts`
- Create: `apps/dashboard/src/lib/cluster/derive-cluster-snapshot.ts`
- Create: `apps/dashboard/src/lib/cluster/derive-cluster-snapshot.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// apps/dashboard/src/lib/cluster/derive-cluster-snapshot.test.ts
import { describe, expect, it } from 'vitest'

import {
  deriveClusterSnapshot,
  type ArgoApplicationView,
  type NodeView,
} from './derive-cluster-snapshot'

describe('deriveClusterSnapshot', () => {
  it('derives summary counts from nodes and Argo applications', () => {
    const nodes: NodeView[] = [
      {
        age: '2h',
        internalIP: '10.100.0.111',
        kubeletVersion: 'v1.34.5+k3s1',
        name: 'cp-1',
        ready: true,
        roles: ['control-plane'],
      },
      {
        age: '2h',
        internalIP: '10.100.0.112',
        kubeletVersion: 'v1.34.5+k3s1',
        name: 'cp-2',
        ready: false,
        roles: ['control-plane'],
      },
    ]

    const applications: ArgoApplicationView[] = [
      {
        healthStatus: 'Healthy',
        name: 'dashboard',
        namespace: 'argocd',
        syncStatus: 'Synced',
        targetRevision: 'main',
      },
      {
        healthStatus: 'Progressing',
        name: 'chaos-mesh',
        namespace: 'argocd',
        syncStatus: 'OutOfSync',
        targetRevision: 'main',
      },
    ]

    expect(
      deriveClusterSnapshot({
        applications,
        clusterName: 'datacenter',
        nodes,
        refreshedAt: '2026-03-29T21:00:00.000Z',
      }),
    ).toEqual({
      applications,
      nodes,
      summary: {
        applicationCount: 2,
        clusterName: 'datacenter',
        degradedApplicationCount: 1,
        healthyApplicationCount: 1,
        lastRefreshedAt: '2026-03-29T21:00:00.000Z',
        notReadyNodeCount: 1,
        readyNodeCount: 1,
        syncedApplicationCount: 1,
        totalNodeCount: 2,
      },
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/lib/cluster/derive-cluster-snapshot.test.ts`
Expected: FAIL because `models.ts` and `derive-cluster-snapshot.ts` do not exist yet.

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/dashboard/src/lib/cluster/models.ts
export type NodeView = {
  age: string
  internalIP: string | null
  kubeletVersion: string
  name: string
  ready: boolean
  roles: string[]
}

export type ArgoApplicationView = {
  healthStatus: string
  name: string
  namespace: string
  syncStatus: string
  targetRevision: string
}

export type ClusterSummaryView = {
  applicationCount: number
  clusterName: string
  degradedApplicationCount: number
  healthyApplicationCount: number
  lastRefreshedAt: string
  notReadyNodeCount: number
  readyNodeCount: number
  syncedApplicationCount: number
  totalNodeCount: number
}

export type ClusterSnapshotView = {
  applications: ArgoApplicationView[]
  nodes: NodeView[]
  summary: ClusterSummaryView
}
```

```ts
// apps/dashboard/src/lib/cluster/derive-cluster-snapshot.ts
import type {
  ArgoApplicationView,
  ClusterSnapshotView,
  NodeView,
} from './models'

export type { ArgoApplicationView, NodeView } from './models'

type DeriveClusterSnapshotInput = {
  applications: ArgoApplicationView[]
  clusterName: string
  nodes: NodeView[]
  refreshedAt: string
}

export function deriveClusterSnapshot({
  applications,
  clusterName,
  nodes,
  refreshedAt,
}: DeriveClusterSnapshotInput): ClusterSnapshotView {
  const readyNodeCount = nodes.filter((node) => node.ready).length
  const syncedApplicationCount = applications.filter(
    (application) => application.syncStatus === 'Synced',
  ).length
  const healthyApplicationCount = applications.filter(
    (application) => application.healthStatus === 'Healthy',
  ).length

  return {
    applications,
    nodes,
    summary: {
      applicationCount: applications.length,
      clusterName,
      degradedApplicationCount:
        applications.length - healthyApplicationCount,
      healthyApplicationCount,
      lastRefreshedAt: refreshedAt,
      notReadyNodeCount: nodes.length - readyNodeCount,
      readyNodeCount,
      syncedApplicationCount,
      totalNodeCount: nodes.length,
    },
  }
}
```

```json
// apps/dashboard/package.json
{
  "dependencies": {
    "@kubernetes/client-node": "^1.3.0"
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- src/lib/cluster/derive-cluster-snapshot.test.ts`
Expected: PASS with `1 passed`.

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/package.json apps/dashboard/pnpm-lock.yaml apps/dashboard/src/lib/cluster/models.ts apps/dashboard/src/lib/cluster/derive-cluster-snapshot.ts apps/dashboard/src/lib/cluster/derive-cluster-snapshot.test.ts
git commit -m "feat: add dashboard cluster snapshot models"
```

### Task 2: Add Client-Node Readers And Server Function

**Files:**
- Create: `apps/dashboard/src/lib/cluster/kube-client.ts`
- Create: `apps/dashboard/src/lib/cluster/read-cluster-snapshot.ts`
- Create: `apps/dashboard/src/lib/cluster/read-cluster-snapshot.test.ts`
- Modify: `apps/dashboard/src/lib/session.ts`

- [ ] **Step 1: Write the failing test**

```ts
// apps/dashboard/src/lib/cluster/read-cluster-snapshot.test.ts
import { describe, expect, it } from 'vitest'

import { readClusterSnapshotFromSources } from './read-cluster-snapshot'

describe('readClusterSnapshotFromSources', () => {
  it('normalizes nodes and Argo applications from Kubernetes responses', async () => {
    const snapshot = await readClusterSnapshotFromSources({
      clusterName: 'datacenter',
      listApplications: async () => [
        {
          metadata: { name: 'dashboard', namespace: 'argocd' },
          spec: { source: { targetRevision: 'main' } },
          status: { health: { status: 'Healthy' }, sync: { status: 'Synced' } },
        },
      ],
      listNodes: async () => [
        {
          metadata: {
            creationTimestamp: '2026-03-29T19:00:00.000Z',
            labels: {
              'node-role.kubernetes.io/control-plane': 'true',
            },
            name: 'cp-1',
          },
          status: {
            addresses: [{ address: '10.100.0.111', type: 'InternalIP' }],
            conditions: [{ status: 'True', type: 'Ready' }],
            nodeInfo: { kubeletVersion: 'v1.34.5+k3s1' },
          },
        },
      ],
      now: () => new Date('2026-03-29T21:00:00.000Z'),
    })

    expect(snapshot.summary).toMatchObject({
      applicationCount: 1,
      clusterName: 'datacenter',
      healthyApplicationCount: 1,
      readyNodeCount: 1,
      totalNodeCount: 1,
    })

    expect(snapshot.nodes).toEqual([
      {
        age: '2h',
        internalIP: '10.100.0.111',
        kubeletVersion: 'v1.34.5+k3s1',
        name: 'cp-1',
        ready: true,
        roles: ['control-plane'],
      },
    ])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/lib/cluster/read-cluster-snapshot.test.ts`
Expected: FAIL because `read-cluster-snapshot.ts` does not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/dashboard/src/lib/cluster/kube-client.ts
import {
  CoreV1Api,
  CustomObjectsApi,
  KubeConfig,
} from '@kubernetes/client-node'

export function createKubeClients() {
  const kubeConfig = new KubeConfig()
  kubeConfig.loadFromDefault()

  return {
    coreApi: kubeConfig.makeApiClient(CoreV1Api),
    customObjectsApi: kubeConfig.makeApiClient(CustomObjectsApi),
  }
}
```

```ts
// apps/dashboard/src/lib/cluster/read-cluster-snapshot.ts
import { deriveClusterSnapshot } from './derive-cluster-snapshot'
import { createKubeClients } from './kube-client'

type NodeLike = {
  metadata?: {
    creationTimestamp?: string
    labels?: Record<string, string>
    name?: string
  }
  status?: {
    addresses?: Array<{ address?: string; type?: string }>
    conditions?: Array<{ status?: string; type?: string }>
    nodeInfo?: { kubeletVersion?: string }
  }
}

type ApplicationLike = {
  metadata?: {
    name?: string
    namespace?: string
  }
  spec?: {
    source?: {
      targetRevision?: string
    }
  }
  status?: {
    health?: { status?: string }
    sync?: { status?: string }
  }
}

type ReadClusterSnapshotInput = {
  clusterName: string
  listApplications: () => Promise<ApplicationLike[]>
  listNodes: () => Promise<NodeLike[]>
  now?: () => Date
}

function formatAge(from: Date, to: Date) {
  const hours = Math.max(1, Math.floor((to.getTime() - from.getTime()) / 3600000))
  return `${hours}h`
}

export async function readClusterSnapshotFromSources({
  clusterName,
  listApplications,
  listNodes,
  now = () => new Date(),
}: ReadClusterSnapshotInput) {
  const [nodes, applications] = await Promise.all([
    listNodes(),
    listApplications(),
  ])

  const currentTime = now()

  return deriveClusterSnapshot({
    applications: applications.map((application) => ({
      healthStatus: application.status?.health?.status ?? 'Unknown',
      name: application.metadata?.name ?? 'unknown',
      namespace: application.metadata?.namespace ?? 'argocd',
      syncStatus: application.status?.sync?.status ?? 'Unknown',
      targetRevision: application.spec?.source?.targetRevision ?? 'unknown',
    })),
    clusterName,
    nodes: nodes.map((node) => ({
      age: node.metadata?.creationTimestamp
        ? formatAge(new Date(node.metadata.creationTimestamp), currentTime)
        : 'unknown',
      internalIP:
        node.status?.addresses?.find((address) => address.type === 'InternalIP')
          ?.address ?? null,
      kubeletVersion: node.status?.nodeInfo?.kubeletVersion ?? 'unknown',
      name: node.metadata?.name ?? 'unknown',
      ready:
        node.status?.conditions?.some(
          (condition) =>
            condition.type === 'Ready' && condition.status === 'True',
        ) ?? false,
      roles: Object.keys(node.metadata?.labels ?? {})
        .filter((label) => label.startsWith('node-role.kubernetes.io/'))
        .map((label) => label.replace('node-role.kubernetes.io/', '')),
    })),
    refreshedAt: currentTime.toISOString(),
  })
}

export async function readClusterSnapshot() {
  const { coreApi, customObjectsApi } = createKubeClients()

  return readClusterSnapshotFromSources({
    clusterName: process.env.CLUSTER_NAME ?? 'datacenter',
    listApplications: async () => {
      const response = await customObjectsApi.listNamespacedCustomObject(
        'argoproj.io',
        'v1alpha1',
        'argocd',
        'applications',
      )

      return ((response as { items?: ApplicationLike[] }).items ??
        []) as ApplicationLike[]
    },
    listNodes: async () => {
      const response = await coreApi.listNode()
      return response.items
    },
  })
}
```

```ts
// apps/dashboard/src/lib/session.ts
import { readClusterSnapshot } from '#/lib/cluster/read-cluster-snapshot'

export const readDashboardHome = createServerFn({ method: 'GET' }).handler(
  async () => {
    const request = getRequest()
    const snapshot = await getAuthSnapshot(request)

    if (!snapshot.session) {
      throw new Error('Unauthenticated')
    }

    const cluster = await readClusterSnapshot()

    return {
      cluster,
      session: snapshot.session,
    }
  },
)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- src/lib/cluster/read-cluster-snapshot.test.ts`
Expected: PASS with `1 passed`.

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/src/lib/cluster/kube-client.ts apps/dashboard/src/lib/cluster/read-cluster-snapshot.ts apps/dashboard/src/lib/cluster/read-cluster-snapshot.test.ts apps/dashboard/src/lib/session.ts
git commit -m "feat: add dashboard cluster read service"
```

### Task 3: Replace Homepage Shell With Live Polled Data

**Files:**
- Create: `apps/dashboard/src/components/cluster-overview.tsx`
- Create: `apps/dashboard/src/components/cluster-overview.test.tsx`
- Modify: `apps/dashboard/src/routes/index.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// apps/dashboard/src/components/cluster-overview.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ClusterOverview } from './cluster-overview'

describe('ClusterOverview', () => {
  it('renders summary, nodes, and Argo applications', () => {
    render(
      <ClusterOverview
        cluster={{
          applications: [
            {
              healthStatus: 'Healthy',
              name: 'dashboard',
              namespace: 'argocd',
              syncStatus: 'Synced',
              targetRevision: 'main',
            },
          ],
          nodes: [
            {
              age: '2h',
              internalIP: '10.100.0.111',
              kubeletVersion: 'v1.34.5+k3s1',
              name: 'cp-1',
              ready: true,
              roles: ['control-plane'],
            },
          ],
          summary: {
            applicationCount: 1,
            clusterName: 'datacenter',
            degradedApplicationCount: 0,
            healthyApplicationCount: 1,
            lastRefreshedAt: '2026-03-29T21:00:00.000Z',
            notReadyNodeCount: 0,
            readyNodeCount: 1,
            syncedApplicationCount: 1,
            totalNodeCount: 1,
          },
        }}
        error={null}
        isRefreshing={false}
      />,
    )

    expect(screen.getByText('Cluster Summary')).toBeInTheDocument()
    expect(screen.getByText('cp-1')).toBeInTheDocument()
    expect(screen.getByText('dashboard')).toBeInTheDocument()
    expect(screen.getByText('Ready Nodes')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/components/cluster-overview.test.tsx`
Expected: FAIL because `cluster-overview.tsx` does not exist.

- [ ] **Step 3: Write minimal implementation**

```tsx
// apps/dashboard/src/components/cluster-overview.tsx
import type { ClusterSnapshotView } from '#/lib/cluster/models'

type ClusterOverviewProps = {
  cluster: ClusterSnapshotView
  error: string | null
  isRefreshing: boolean
}

export function ClusterOverview({
  cluster,
  error,
  isRefreshing,
}: ClusterOverviewProps) {
  return (
    <main className="page-wrap px-4 pb-10 pt-14">
      <section className="island-shell rounded-[2rem] px-6 py-8 sm:px-10 sm:py-10">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="island-kicker mb-2">Cluster Summary</p>
            <h1 className="display-title text-4xl font-bold text-[var(--sea-ink)]">
              {cluster.summary.clusterName}
            </h1>
          </div>
          <p className="text-sm text-[var(--sea-ink-soft)]">
            {isRefreshing ? 'Refreshing...' : `Updated ${cluster.summary.lastRefreshedAt}`}
          </p>
        </div>

        {error ? (
          <p className="mt-4 rounded-xl border border-[rgba(180,57,57,0.22)] bg-[rgba(180,57,57,0.08)] px-4 py-3 text-sm text-[rgb(139,42,42)]">
            {error}
          </p>
        ) : null}

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Ready Nodes', cluster.summary.readyNodeCount],
            ['Not Ready', cluster.summary.notReadyNodeCount],
            ['Healthy Apps', cluster.summary.healthyApplicationCount],
            ['Out Of Sync / Degraded', cluster.summary.degradedApplicationCount],
          ].map(([label, value]) => (
            <article
              key={label}
              className="rounded-2xl border border-[rgba(23,58,64,0.12)] bg-white/70 p-5"
            >
              <p className="island-kicker mb-2">{label}</p>
              <p className="m-0 text-3xl font-semibold text-[var(--sea-ink)]">
                {value}
              </p>
            </article>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <article className="rounded-2xl border border-[rgba(23,58,64,0.12)] bg-white/70 p-5">
            <h2 className="mb-4 text-lg font-semibold text-[var(--sea-ink)]">Nodes</h2>
            <div className="space-y-3">
              {cluster.nodes.map((node) => (
                <div key={node.name} className="rounded-xl border border-[rgba(23,58,64,0.08)] px-4 py-3">
                  <div className="flex items-center justify-between">
                    <p className="m-0 font-semibold text-[var(--sea-ink)]">{node.name}</p>
                    <span className="text-sm text-[var(--sea-ink-soft)]">
                      {node.ready ? 'Ready' : 'Not Ready'}
                    </span>
                  </div>
                  <p className="m-0 mt-1 text-sm text-[var(--sea-ink-soft)]">
                    {node.internalIP ?? 'No IP'} · {node.kubeletVersion} · {node.roles.join(', ')}
                  </p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-2xl border border-[rgba(23,58,64,0.12)] bg-white/70 p-5">
            <h2 className="mb-4 text-lg font-semibold text-[var(--sea-ink)]">Argo Applications</h2>
            <div className="space-y-3">
              {cluster.applications.map((application) => (
                <div key={application.name} className="rounded-xl border border-[rgba(23,58,64,0.08)] px-4 py-3">
                  <div className="flex items-center justify-between">
                    <p className="m-0 font-semibold text-[var(--sea-ink)]">
                      {application.name}
                    </p>
                    <span className="text-sm text-[var(--sea-ink-soft)]">
                      {application.syncStatus} / {application.healthStatus}
                    </span>
                  </div>
                  <p className="m-0 mt-1 text-sm text-[var(--sea-ink-soft)]">
                    {application.namespace} · {application.targetRevision}
                  </p>
                </div>
              ))}
            </div>
          </article>
        </section>
      </section>
    </main>
  )
}
```

```tsx
// apps/dashboard/src/routes/index.tsx
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'

import { ClusterOverview } from '#/components/cluster-overview'
import { readAuthPage, readDashboardHome } from '#/lib/session'

export const Route = createFileRoute('/')({
  loader: async () => {
    const authPage = await readAuthPage({
      data: { pathname: '/' },
    })

    if (!authPage.decision.allow) {
      throw redirect({ to: authPage.decision.redirectTo })
    }

    return readDashboardHome()
  },
  component: DashboardHome,
})

function DashboardHome() {
  const initialData = Route.useLoaderData()

  const query = useQuery({
    initialData,
    queryFn: () => readDashboardHome(),
    queryKey: ['dashboard-home'],
    refetchInterval: 20000,
  })

  return (
    <ClusterOverview
      cluster={query.data.cluster}
      error={query.error instanceof Error ? query.error.message : null}
      isRefreshing={query.isFetching}
    />
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- src/components/cluster-overview.test.tsx`
Expected: PASS with `1 passed`.

Run: `pnpm build`
Expected: PASS with Vite client and SSR builds succeeding.

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/src/components/cluster-overview.tsx apps/dashboard/src/components/cluster-overview.test.tsx apps/dashboard/src/routes/index.tsx
git commit -m "feat: render live dashboard cluster overview"
```

### Task 4: Add Dashboard Service Account And Read-Only RBAC

**Files:**
- Create: `apps/dashboard/k8s/serviceaccount.yaml`
- Create: `apps/dashboard/k8s/clusterrole.yaml`
- Create: `apps/dashboard/k8s/clusterrolebinding.yaml`
- Modify: `apps/dashboard/k8s/deployment.yaml`
- Modify: `apps/dashboard/k8s/kustomization.yaml`
- Create: `tests/dashboard/test_dashboard_cluster_reads.sh`
- Modify: `tests/bootstrap/test_cluster_scripts.sh`

- [ ] **Step 1: Write the failing test**

```bash
#!/usr/bin/env bash
set -euo pipefail

test -f apps/dashboard/k8s/serviceaccount.yaml
test -f apps/dashboard/k8s/clusterrole.yaml
test -f apps/dashboard/k8s/clusterrolebinding.yaml

grep -q 'kind: ServiceAccount' apps/dashboard/k8s/serviceaccount.yaml
grep -q 'name: dashboard' apps/dashboard/k8s/serviceaccount.yaml
grep -q 'resources:' apps/dashboard/k8s/clusterrole.yaml
grep -q 'nodes' apps/dashboard/k8s/clusterrole.yaml
grep -q 'argoproj.io' apps/dashboard/k8s/clusterrole.yaml
grep -q 'applications' apps/dashboard/k8s/clusterrole.yaml
grep -q 'serviceAccountName: dashboard' apps/dashboard/k8s/deployment.yaml
grep -q 'clusterrolebinding.yaml' apps/dashboard/k8s/kustomization.yaml
grep -q 'serviceaccount.yaml' apps/dashboard/k8s/kustomization.yaml
kubectl kustomize apps/dashboard/k8s >/dev/null
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bash tests/dashboard/test_dashboard_cluster_reads.sh`
Expected: FAIL because the RBAC manifests do not exist yet.

- [ ] **Step 3: Write minimal implementation**

```yaml
# apps/dashboard/k8s/serviceaccount.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: dashboard
```

```yaml
# apps/dashboard/k8s/clusterrole.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: dashboard-read-cluster
rules:
  - apiGroups: [""]
    resources: ["nodes"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["argoproj.io"]
    resources: ["applications"]
    verbs: ["get", "list", "watch"]
```

```yaml
# apps/dashboard/k8s/clusterrolebinding.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: dashboard-read-cluster
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: dashboard-read-cluster
subjects:
  - kind: ServiceAccount
    name: dashboard
    namespace: dashboard
```

```yaml
# apps/dashboard/k8s/deployment.yaml
spec:
  template:
    spec:
      serviceAccountName: dashboard
```

```yaml
# apps/dashboard/k8s/kustomization.yaml
resources:
  - namespace.yaml
  - serviceaccount.yaml
  - clusterrole.yaml
  - clusterrolebinding.yaml
  - deployment.yaml
  - service.yaml
  - httproute.yaml
```

```bash
# tests/dashboard/test_dashboard_cluster_reads.sh
#!/usr/bin/env bash
set -euo pipefail

test -f apps/dashboard/k8s/serviceaccount.yaml
test -f apps/dashboard/k8s/clusterrole.yaml
test -f apps/dashboard/k8s/clusterrolebinding.yaml

grep -q 'kind: ServiceAccount' apps/dashboard/k8s/serviceaccount.yaml
grep -q 'name: dashboard' apps/dashboard/k8s/serviceaccount.yaml
grep -q 'nodes' apps/dashboard/k8s/clusterrole.yaml
grep -q 'applications' apps/dashboard/k8s/clusterrole.yaml
grep -q 'serviceAccountName: dashboard' apps/dashboard/k8s/deployment.yaml
grep -q 'serviceaccount.yaml' apps/dashboard/k8s/kustomization.yaml
grep -q 'clusterrole.yaml' apps/dashboard/k8s/kustomization.yaml
grep -q 'clusterrolebinding.yaml' apps/dashboard/k8s/kustomization.yaml
kubectl kustomize apps/dashboard/k8s >/dev/null
```

```bash
# tests/bootstrap/test_cluster_scripts.sh
grep -q 'serviceAccountName: dashboard' apps/dashboard/k8s/deployment.yaml
grep -q 'argoproj.io' apps/dashboard/k8s/clusterrole.yaml
grep -q 'applications' apps/dashboard/k8s/clusterrole.yaml
grep -q 'nodes' apps/dashboard/k8s/clusterrole.yaml
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bash tests/dashboard/test_dashboard_cluster_reads.sh`
Expected: PASS with no output.

Run: `bash tests/bootstrap/test_cluster_scripts.sh`
Expected: PASS with no output.

Run: `kubectl kustomize apps/dashboard/k8s >/dev/null && kubectl kustomize clusters/datacenter >/dev/null`
Expected: PASS with exit code `0`.

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/k8s/serviceaccount.yaml apps/dashboard/k8s/clusterrole.yaml apps/dashboard/k8s/clusterrolebinding.yaml apps/dashboard/k8s/deployment.yaml apps/dashboard/k8s/kustomization.yaml tests/dashboard/test_dashboard_cluster_reads.sh tests/bootstrap/test_cluster_scripts.sh
git commit -m "feat: add dashboard cluster read rbac"
```

### Task 5: Verify Live Slice And Update Runbook

**Files:**
- Modify: `apps/dashboard/README.md`
- Modify: `docs/runbooks/local-access.md`

- [ ] **Step 1: Write the failing verification check**

```bash
rg -n 'client-node|nodes|Argo' apps/dashboard/README.md docs/runbooks/local-access.md
```

Expected: no complete Phase 3 read API instructions yet.

- [ ] **Step 2: Write minimal documentation**

```md
<!-- apps/dashboard/README.md -->
## Phase 3 Read APIs

The homepage now reads cluster state through the app backend using `@kubernetes/client-node`.

Current live slice:

- cluster summary
- node list
- Argo CD application list

Refresh behavior:

- initial SSR load
- client polling every 20 seconds
```

```md
<!-- docs/runbooks/local-access.md -->
## Dashboard Cluster Reads

After syncing the latest image, verify:

```bash
kubectl -n dashboard rollout status deployment/dashboard
curl -ksS --resolve dashboard.datacenter.lan:443:10.100.0.240 https://dashboard.datacenter.lan/health
```

Open `https://dashboard.datacenter.lan/` and confirm:

- node counts are populated
- node list renders
- Argo applications render
- refresh updates without a full page reload
```

- [ ] **Step 3: Run verification**

Run: `pnpm build`
Expected: PASS.

Run: `bash tests/dashboard/test_dashboard_cluster_reads.sh`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/dashboard/README.md docs/runbooks/local-access.md
git commit -m "docs: document dashboard phase 3 read apis"
```

## Final Verification

Run all of the following after Task 5:

```bash
pnpm test -- src/lib/cluster/derive-cluster-snapshot.test.ts
pnpm test -- src/lib/cluster/read-cluster-snapshot.test.ts
pnpm test -- src/components/cluster-overview.test.tsx
pnpm build
bash tests/dashboard/test_dashboard_cluster_reads.sh
bash tests/bootstrap/test_cluster_scripts.sh
kubectl kustomize apps/dashboard/k8s >/dev/null
kubectl kustomize clusters/datacenter >/dev/null
```

Expected:

- all Vitest checks pass
- build passes
- shell tests pass
- both kustomize renders pass
