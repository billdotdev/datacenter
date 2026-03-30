# Dashboard Phase 4 Multi-Target Drill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete Phase 4 by adding allowlisted selectable targets, traffic spike, latency/error injection, and exact-node cordon/drain to the dashboard drill system.

**Architecture:** Keep the browser outside the Kubernetes trust boundary. Persist drill definitions and allowlisted targets in PostgreSQL, accept only `drillKey` and `targetKey` from the browser, and execute each drill through a dedicated backend executor: Chaos Mesh for pod/network faults, a Kubernetes `Job` for load generation, and direct Kubernetes node APIs for cordon/drain.

**Tech Stack:** TanStack Start, React Query, Better Auth, Drizzle ORM, PostgreSQL, TypeScript, Vitest, Kubernetes client, Chaos Mesh CRDs, kustomize

---

## File Map

- Modify: `apps/dashboard/src/db/schema.ts`
  adds `drill_target` and extends `drill_run`
- Create: `apps/dashboard/drizzle/0002_dashboard_phase4_multi_target.sql`
  migrates schema and seeds new drills/targets
- Modify: `apps/dashboard/drizzle/meta/_journal.json`
  registers migration
- Create: `apps/dashboard/src/lib/drills/targets.ts`
  typed target helpers
- Modify: `apps/dashboard/src/lib/drills/models.ts`
  expands drill kinds, target kinds, DTOs
- Modify: `apps/dashboard/src/lib/drills/policy.ts`
  validates allowlisted workload/node targets
- Modify: `apps/dashboard/src/lib/drills/policy.test.ts`
  targeted policy coverage
- Modify: `apps/dashboard/src/lib/drills/chaos-client.ts`
  supports pod and network chaos manifests
- Modify: `apps/dashboard/src/lib/drills/chaos-client.test.ts`
  manifest coverage
- Create: `apps/dashboard/src/lib/drills/load-job-client.ts`
  creates/reads load-generator jobs
- Create: `apps/dashboard/src/lib/drills/load-job-client.test.ts`
  job manifest coverage
- Create: `apps/dashboard/src/lib/drills/node-client.ts`
  cordon/drain helpers
- Create: `apps/dashboard/src/lib/drills/node-client.test.ts`
  node helper coverage
- Modify: `apps/dashboard/src/lib/drills/service.ts`
  catalog read, execution dispatch, run reconciliation
- Modify: `apps/dashboard/src/lib/drills/service.test.ts`
  targeted service coverage
- Modify: `apps/dashboard/src/lib/drills/server.ts`
  accepts `targetKey`
- Modify: `apps/dashboard/src/components/drill-catalog.tsx`
  adds compatible target selection per drill
- Modify: `apps/dashboard/src/components/drill-catalog.test.tsx`
  UI coverage for selector + submit path
- Modify: `apps/dashboard/src/routes/drills.tsx`
  mutation payload and local selected target state
- Modify: `clusters/datacenter/dashboard-chaos-access.yaml`
  precise RBAC for extra CRDs, jobs, node APIs
- Modify: `clusters/datacenter/kustomization.yaml`
  include any extra RBAC manifests if split
- Create: `tests/dashboard/test_dashboard_phase4_targets.sh`
  repo-level schema/seed/RBAC assertions
- Modify: `apps/dashboard/README.md`
  updated drill matrix
- Modify: `docs/runbooks/local-access.md`
  updated live verification steps

### Task 1: Verify Live Selectors And Exact Node Target

**Files:**
- Modify: `docs/plans/2026-03-30-dashboard-phase-4-multi-target-design.md`
- Modify later in Task 2: `apps/dashboard/drizzle/0002_dashboard_phase4_multi_target.sql`

- [ ] **Step 1: Capture live labels for approved workload targets**

Run these exact commands against the live cluster and copy the label keys/values that actually select the intended pods:

```bash
kubectl -n dashboard get pods --show-labels
kubectl -n istio-system get pods --show-labels
kubectl -n database get pods --show-labels
kubectl -n observability get pods --show-labels
kubectl get nodes -o name
```

Expected:

- one verified selector for `dashboard`
- one verified selector for `istiod`
- one verified selector for `datacenter-postgres`
- one verified selector for `loki`
- one exact worker node name for the node target

- [ ] **Step 2: Record the verified values in the design doc**

Update the implementation prerequisite section so it no longer says “verify later” and instead records the exact selectors and node name you will seed.

The edited section must contain:

- one exact selector line for `dashboard`
- one exact selector line for `istiod`
- one exact selector line for `datacenter-postgres`
- one exact selector line for `loki`
- one exact node name line for the node drill target

- [ ] **Step 3: Commit the verified target notes**

```bash
git add docs/plans/2026-03-30-dashboard-phase-4-multi-target-design.md
git commit -m "docs: record dashboard phase 4 verified drill targets"
```

### Task 2: Add Allowlisted Targets And Generic Drill Metadata

**Files:**
- Modify: `apps/dashboard/src/db/schema.ts`
- Create: `apps/dashboard/drizzle/0002_dashboard_phase4_multi_target.sql`
- Modify: `apps/dashboard/drizzle/meta/_journal.json`
- Create: `tests/dashboard/test_dashboard_phase4_targets.sh`

- [ ] **Step 1: Write the failing repo-level test**

```bash
#!/usr/bin/env bash
set -euo pipefail

test -f apps/dashboard/src/db/schema.ts
test -f apps/dashboard/drizzle/0002_dashboard_phase4_multi_target.sql

grep -q 'drillTarget' apps/dashboard/src/db/schema.ts
grep -q 'drillTargetId' apps/dashboard/src/db/schema.ts
grep -q 'targetType' apps/dashboard/src/db/schema.ts
grep -q 'traffic-spike' apps/dashboard/drizzle/0002_dashboard_phase4_multi_target.sql
grep -q 'network-latency' apps/dashboard/drizzle/0002_dashboard_phase4_multi_target.sql
grep -q 'network-error' apps/dashboard/drizzle/0002_dashboard_phase4_multi_target.sql
grep -q 'node-cordon-drain' apps/dashboard/drizzle/0002_dashboard_phase4_multi_target.sql
grep -q 'dashboard' apps/dashboard/drizzle/0002_dashboard_phase4_multi_target.sql
grep -q 'istiod' apps/dashboard/drizzle/0002_dashboard_phase4_multi_target.sql
grep -q 'datacenter-postgres' apps/dashboard/drizzle/0002_dashboard_phase4_multi_target.sql
grep -q 'loki' apps/dashboard/drizzle/0002_dashboard_phase4_multi_target.sql
grep -q '"tag": "0002_dashboard_phase4_multi_target"' apps/dashboard/drizzle/meta/_journal.json
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bash tests/dashboard/test_dashboard_phase4_targets.sh`

Expected: FAIL because the new schema and migration do not exist yet.

- [ ] **Step 3: Write minimal schema and migration**

```ts
// apps/dashboard/src/db/schema.ts
export const drillTarget = pgTable(
  "drill_target",
  {
    id: text("id").primaryKey(),
    key: text("key").notNull().unique(),
    name: text("name").notNull(),
    kind: text("kind", { enum: ["workload", "node"] }).notNull(),
    namespace: text("namespace"),
    serviceName: text("service_name"),
    selector: jsonb("selector"),
    nodeName: text("node_name"),
    blastRadiusSummary: text("blast_radius_summary").notNull(),
    enabled: boolean("enabled").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("drill_target_key_idx").on(table.key)],
);

export const drillRun = pgTable(
  "drill_run",
  {
    id: text("id").primaryKey(),
    drillDefinitionId: text("drill_definition_id")
      .notNull()
      .references(() => drillDefinition.id, { onDelete: "restrict" }),
    drillTargetId: text("drill_target_id")
      .notNull()
      .references(() => drillTarget.id, { onDelete: "restrict" }),
    requestedByUserId: text("requested_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    drillKey: text("drill_key").notNull(),
    targetKey: text("target_key").notNull(),
    status: text("status").notNull(),
    targetSummary: text("target_summary").notNull(),
    chaosNamespace: text("chaos_namespace"),
    chaosName: text("chaos_name"),
    requestedAt: timestamp("requested_at").defaultNow().notNull(),
    startedAt: timestamp("started_at"),
    finishedAt: timestamp("finished_at"),
    errorMessage: text("error_message"),
  },
  (table) => [
    index("drill_run_definition_idx").on(table.drillDefinitionId),
    index("drill_run_target_idx").on(table.drillTargetId),
    index("drill_run_requested_by_idx").on(table.requestedByUserId),
    index("drill_run_status_idx").on(table.status),
  ],
);
```

```sql
-- apps/dashboard/drizzle/0002_dashboard_phase4_multi_target.sql
CREATE TABLE "drill_target" (
  "id" text PRIMARY KEY NOT NULL,
  "key" text NOT NULL,
  "name" text NOT NULL,
  "kind" text NOT NULL,
  "namespace" text,
  "service_name" text,
  "selector" jsonb,
  "node_name" text,
  "blast_radius_summary" text NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "drill_target_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "drill_definition"
  ADD COLUMN "target_type" text NOT NULL DEFAULT 'workload',
  ADD COLUMN "template" jsonb NOT NULL DEFAULT '{}'::jsonb;
--> statement-breakpoint
ALTER TABLE "drill_run"
  ADD COLUMN "drill_target_id" text,
  ADD COLUMN "drill_key" text,
  ADD COLUMN "target_key" text;
--> statement-breakpoint
UPDATE "drill_definition"
SET "key" = 'pod-delete',
    "name" = 'Delete One Pod',
    "target_type" = 'workload',
    "template" = '{"executor":"podChaos","action":"pod-kill","mode":"one"}'::jsonb;
--> statement-breakpoint
INSERT INTO "drill_definition" ("id","key","name","kind","enabled","requires_disruptive_actions","target_namespace","target_selector","blast_radius_summary","target_type","template","chaos_template")
VALUES
  ('drill-traffic-spike','traffic-spike','Traffic Spike','traffic_spike',true,true,'','','Fixed HTTP load against one approved service.','workload','{"executor":"loadJob","durationSeconds":60,"requestsPerSecond":25}'::jsonb,'{}'::jsonb),
  ('drill-network-latency','network-latency','Inject Network Latency','network_latency',true,true,'','','Inject fixed latency against one approved workload.','workload','{"executor":"networkChaos","action":"delay","latency":"120ms","correlation":"100"}'::jsonb,'{}'::jsonb),
  ('drill-network-error','network-error','Inject Network Error','network-error',true,true,'','','Inject fixed packet loss against one approved workload.','workload','{"executor":"networkChaos","action":"loss","loss":"12","correlation":"100"}'::jsonb,'{}'::jsonb),
  ('drill-node-cordon-drain','node-cordon-drain','Cordon And Drain Node','node_cordon_drain',true,true,'','','Cordon and drain one exact approved node.','node','{"executor":"nodeDrain","deleteEmptyDirData":false,"ignoreDaemonSets":true}'::jsonb,'{}'::jsonb);
--> statement-breakpoint
INSERT INTO "drill_target" ("id","key","name","kind","namespace","service_name","selector","node_name","blast_radius_summary","enabled")
VALUES
  ('target-dashboard','dashboard','Dashboard','workload','dashboard','dashboard','{"app.kubernetes.io/name":"dashboard"}'::jsonb,NULL,'Affects the dashboard service only.',true);
--> statement-breakpoint
-- Add three more workload rows for `istiod`, `datacenter-postgres`, and `loki`
-- using the exact selector JSONB captured in Task 1, then add one node row
-- with `key`, `name`, and `node_name` all set to the exact node name from Task 1.
--> statement-breakpoint
UPDATE "drill_run"
SET "drill_target_id" = 'target-dashboard',
    "drill_key" = 'pod-delete',
    "target_key" = 'dashboard'
WHERE "drill_key" IS NULL;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bash tests/dashboard/test_dashboard_phase4_targets.sh`

Expected: PASS with no output.

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/src/db/schema.ts apps/dashboard/drizzle/0002_dashboard_phase4_multi_target.sql apps/dashboard/drizzle/meta/_journal.json tests/dashboard/test_dashboard_phase4_targets.sh
git commit -m "feat: add dashboard multi-target drill schema"
```

### Task 3: Expand Models And Policy For Workload And Node Targets

**Files:**
- Create: `apps/dashboard/src/lib/drills/targets.ts`
- Modify: `apps/dashboard/src/lib/drills/models.ts`
- Modify: `apps/dashboard/src/lib/drills/policy.ts`
- Modify: `apps/dashboard/src/lib/drills/policy.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";

import { canExecuteDrill, isAllowedNodeTarget, isAllowedWorkloadTarget } from "./policy";
import type { DrillDefinitionRecord, DrillTargetRecord } from "./models";

const workloadTarget: DrillTargetRecord = {
  blastRadiusSummary: "Affects the dashboard service only.",
  enabled: true,
  id: "target-dashboard",
  key: "dashboard",
  kind: "workload",
  name: "Dashboard",
  namespace: "dashboard",
  nodeName: null,
  selector: { "app.kubernetes.io/name": "dashboard" },
  serviceName: "dashboard",
};

const nodeTarget: DrillTargetRecord = {
  blastRadiusSummary: "Affects one exact worker node.",
  enabled: true,
  id: "target-node-1",
  key: "worker-01",
  kind: "node",
  name: "worker-01",
  namespace: null,
  nodeName: "worker-01",
  selector: null,
  serviceName: null,
};

const workloadDrill: DrillDefinitionRecord = {
  blastRadiusSummary: "Delete one pod.",
  enabled: true,
  id: "drill-pod-delete",
  key: "pod-delete",
  kind: "pod_delete",
  name: "Delete One Pod",
  requiresDisruptiveActions: true,
  targetType: "workload",
  template: { action: "pod-kill", executor: "podChaos", mode: "one" },
};

describe("policy", () => {
  it("allows verified workload targets only", () => {
    expect(isAllowedWorkloadTarget(workloadTarget)).toBe(true);
    expect(
      isAllowedWorkloadTarget({
        ...workloadTarget,
        namespace: "default",
      }),
    ).toBe(false);
  });

  it("allows exact node targets only", () => {
    expect(isAllowedNodeTarget(nodeTarget)).toBe(true);
    expect(isAllowedNodeTarget({ ...nodeTarget, nodeName: "random" })).toBe(false);
  });

  it("denies incompatible target type", () => {
    expect(
      canExecuteDrill({
        disruptiveActionsEnabled: true,
        drill: workloadDrill,
        role: "operator",
        target: nodeTarget,
      }),
    ).toEqual({
      allow: false,
      reason: "invalid-target",
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/lib/drills/policy.test.ts`

Expected: FAIL because the new types and target validation do not exist yet.

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/dashboard/src/lib/drills/models.ts
export type DrillKind =
  | "pod_delete"
  | "traffic_spike"
  | "network_latency"
  | "network_error"
  | "node_cordon_drain";

export type DrillTargetKind = "workload" | "node";

export type DrillDefinitionRecord = {
  blastRadiusSummary: string;
  enabled: boolean;
  id: string;
  key: string;
  kind: DrillKind;
  name: string;
  requiresDisruptiveActions: boolean;
  targetType: DrillTargetKind;
  template: Record<string, unknown>;
};

export type DrillTargetRecord = {
  blastRadiusSummary: string;
  enabled: boolean;
  id: string;
  key: string;
  kind: DrillTargetKind;
  name: string;
  namespace: string | null;
  nodeName: string | null;
  selector: Record<string, string> | null;
  serviceName: string | null;
};
```

```ts
// apps/dashboard/src/lib/drills/policy.ts
export function isAllowedWorkloadTarget(target: DrillTargetRecord) {
  if (
    target.kind !== "workload" ||
    !target.namespace ||
    !target.serviceName ||
    !target.selector
  ) {
    return false;
  }

  return Object.keys(target.selector).length > 0;
}

export function isAllowedNodeTarget(target: DrillTargetRecord) {
  return target.kind === "node" && !!target.nodeName && target.key === target.nodeName;
}

export function canExecuteDrill(input: {
  disruptiveActionsEnabled: boolean;
  drill: DrillDefinitionRecord;
  role: AppRole;
  target: DrillTargetRecord;
}) {
  if (input.role !== "admin" && input.role !== "operator") {
    return { allow: false as const, reason: "forbidden" as const };
  }

  if (!input.drill.enabled || !input.target.enabled) {
    return { allow: false as const, reason: "drill-disabled" as const };
  }

  if (input.drill.requiresDisruptiveActions && !input.disruptiveActionsEnabled) {
    return { allow: false as const, reason: "disruptive-actions-disabled" as const };
  }

  if (
    input.drill.targetType !== input.target.kind ||
    (input.target.kind === "workload" && !isAllowedWorkloadTarget(input.target)) ||
    (input.target.kind === "node" && !isAllowedNodeTarget(input.target))
  ) {
    return { allow: false as const, reason: "invalid-target" as const };
  }

  return { allow: true as const };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- src/lib/drills/policy.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/src/lib/drills/models.ts apps/dashboard/src/lib/drills/policy.ts apps/dashboard/src/lib/drills/policy.test.ts apps/dashboard/src/lib/drills/targets.ts
git commit -m "feat: add dashboard drill target policy"
```

### Task 4: Add Chaos Mesh, Load Job, And Node Executors

**Files:**
- Modify: `apps/dashboard/src/lib/drills/chaos-client.ts`
- Modify: `apps/dashboard/src/lib/drills/chaos-client.test.ts`
- Create: `apps/dashboard/src/lib/drills/load-job-client.ts`
- Create: `apps/dashboard/src/lib/drills/load-job-client.test.ts`
- Create: `apps/dashboard/src/lib/drills/node-client.ts`
- Create: `apps/dashboard/src/lib/drills/node-client.test.ts`

- [ ] **Step 1: Write the failing executor tests**

```ts
import { describe, expect, it } from "vitest";

import { buildChaosManifest } from "./chaos-client";
import { buildLoadJobManifest } from "./load-job-client";

describe("buildChaosManifest", () => {
  it("builds pod chaos for pod delete", () => {
    expect(
      buildChaosManifest({
        drill: { key: "pod-delete", kind: "pod_delete", template: { executor: "podChaos", action: "pod-kill", mode: "one" } } as never,
        runId: "run-1",
        target: { key: "dashboard", kind: "workload", namespace: "dashboard", selector: { "app.kubernetes.io/name": "dashboard" } } as never,
        requestedByUserId: "user-1",
      }),
    ).toMatchObject({ kind: "PodChaos" });
  });

  it("builds network chaos for latency", () => {
    expect(
      buildChaosManifest({
        drill: { key: "network-latency", kind: "network_latency", template: { executor: "networkChaos", action: "delay", latency: "120ms", correlation: "100" } } as never,
        runId: "run-1",
        target: { key: "loki", kind: "workload", namespace: "observability", selector: { app: "loki" } } as never,
        requestedByUserId: "user-1",
      }),
    ).toMatchObject({ kind: "NetworkChaos" });
  });
});

describe("buildLoadJobManifest", () => {
  it("builds a load-generator job for the selected service", () => {
    expect(
      buildLoadJobManifest({
        drill: { key: "traffic-spike", template: { durationSeconds: 60, requestsPerSecond: 25 } } as never,
        runId: "run-1",
        target: { key: "dashboard", namespace: "dashboard", serviceName: "dashboard" } as never,
      }),
    ).toMatchObject({
      kind: "Job",
      metadata: { namespace: "chaos-mesh" },
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
pnpm test -- src/lib/drills/chaos-client.test.ts src/lib/drills/load-job-client.test.ts src/lib/drills/node-client.test.ts
```

Expected: FAIL because the generic builders do not exist yet.

- [ ] **Step 3: Write minimal executor implementation**

```ts
// apps/dashboard/src/lib/drills/chaos-client.ts
export function buildChaosManifest(input: {
  drill: DrillDefinitionRecord;
  requestedByUserId: string;
  runId: string;
  target: DrillTargetRecord;
}) {
  if (input.drill.kind === "pod_delete") {
    return {
      apiVersion: "chaos-mesh.org/v1alpha1",
      kind: "PodChaos",
      metadata: {
        annotations: {
          "dashboard.datacenter/run-id": input.runId,
          "dashboard.datacenter/target-key": input.target.key,
          "dashboard.datacenter/user-id": input.requestedByUserId,
        },
        labels: {
          "dashboard.datacenter/drill-key": input.drill.key,
        },
        name: `pod-delete-${input.runId}`,
        namespace: "chaos-mesh",
      },
      spec: {
        action: "pod-kill",
        mode: "one",
        selector: {
          labelSelectors: input.target.selector ?? {},
          namespaces: [input.target.namespace!],
        },
      },
    };
  }

  return {
    apiVersion: "chaos-mesh.org/v1alpha1",
    kind: "NetworkChaos",
    metadata: {
      annotations: {
        "dashboard.datacenter/run-id": input.runId,
        "dashboard.datacenter/target-key": input.target.key,
        "dashboard.datacenter/user-id": input.requestedByUserId,
      },
      labels: {
        "dashboard.datacenter/drill-key": input.drill.key,
      },
      name: `${input.drill.key}-${input.runId}`,
      namespace: "chaos-mesh",
    },
    spec: {
      action: (input.drill.template as { action: "delay" | "loss" }).action,
      mode: "all",
      selector: {
        labelSelectors: input.target.selector ?? {},
        namespaces: [input.target.namespace!],
      },
      ...(input.drill.kind === "network_latency"
        ? { delay: { latency: "120ms", correlation: "100", jitter: "0ms" } }
        : { loss: { loss: "12", correlation: "100" } }),
    },
  };
}
```

```ts
// apps/dashboard/src/lib/drills/load-job-client.ts
export function buildLoadJobManifest(input: {
  drill: DrillDefinitionRecord;
  runId: string;
  target: DrillTargetRecord;
}) {
  return {
    apiVersion: "batch/v1",
    kind: "Job",
    metadata: {
      name: `traffic-spike-${input.runId}`,
      namespace: "chaos-mesh",
    },
    spec: {
      ttlSecondsAfterFinished: 300,
      template: {
        spec: {
          containers: [
            {
              name: "load-generator",
              image: "rakyll/hey:0.1.4",
              args: [
                "-z",
                "60s",
                "-q",
                "25",
                `http://${input.target.serviceName}.${input.target.namespace}.svc.cluster.local/`,
              ],
            },
          ],
          restartPolicy: "Never",
        },
      },
    },
  };
}
```

```ts
// apps/dashboard/src/lib/drills/node-client.ts
export async function cordonNode(client: CoreV1Api, nodeName: string) {
  const node = await client.readNode({ name: nodeName });
  const body = {
    spec: {
      unschedulable: true,
    },
  };

  await client.patchNode(
    { name: nodeName, body },
    undefined,
    undefined,
    undefined,
    undefined,
    { headers: { "Content-Type": "application/merge-patch+json" } },
  );

  return node;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
pnpm test -- src/lib/drills/chaos-client.test.ts src/lib/drills/load-job-client.test.ts src/lib/drills/node-client.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/src/lib/drills/chaos-client.ts apps/dashboard/src/lib/drills/chaos-client.test.ts apps/dashboard/src/lib/drills/load-job-client.ts apps/dashboard/src/lib/drills/load-job-client.test.ts apps/dashboard/src/lib/drills/node-client.ts apps/dashboard/src/lib/drills/node-client.test.ts
git commit -m "feat: add dashboard drill executors"
```

### Task 5: Dispatch Drill Execution By Target And Kind

**Files:**
- Modify: `apps/dashboard/src/lib/drills/service.ts`
- Modify: `apps/dashboard/src/lib/drills/service.test.ts`
- Modify: `apps/dashboard/src/lib/drills/server.ts`

- [ ] **Step 1: Write the failing service test**

```ts
import { describe, expect, it, vi } from "vitest";

import { executeDrillAction } from "./service";

describe("executeDrillAction", () => {
  it("passes both drill and target through to the selected executor", async () => {
    const createPodChaos = vi.fn().mockResolvedValue(undefined);
    const insertRun = vi.fn().mockResolvedValue({ id: "run-1" });
    const insertAuditEvent = vi.fn().mockResolvedValue(undefined);
    const updateRun = vi.fn().mockResolvedValue(undefined);

    await executeDrillAction({
      createPodChaos,
      drill: {
        blastRadiusSummary: "Delete one pod.",
        enabled: true,
        id: "drill-1",
        key: "pod-delete",
        kind: "pod_delete",
        name: "Delete One Pod",
        requiresDisruptiveActions: true,
        targetType: "workload",
        template: { executor: "podChaos", action: "pod-kill", mode: "one" },
      },
      disruptiveActionsEnabled: true,
      insertAuditEvent,
      insertRun,
      role: "operator",
      target: {
        blastRadiusSummary: "Affects dashboard only.",
        enabled: true,
        id: "target-1",
        key: "dashboard",
        kind: "workload",
        name: "Dashboard",
        namespace: "dashboard",
        nodeName: null,
        selector: { "app.kubernetes.io/name": "dashboard" },
        serviceName: "dashboard",
      },
      updateRun,
      user: { id: "user-1", name: "Bill" },
    });

    expect(insertRun).toHaveBeenCalledWith(
      expect.objectContaining({
        drillKey: "pod-delete",
        targetKey: "dashboard",
        targetSummary: "dashboard/dashboard",
      }),
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/lib/drills/service.test.ts`

Expected: FAIL because `target` support and executor dispatch do not exist yet.

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/dashboard/src/lib/drills/server.ts
type ExecuteDrillInput = {
  drillKey: string;
  targetKey: string;
};

const targetRow = await db.query.drillTarget.findFirst({
  where: eq(drillTarget.key, data.targetKey),
});

if (!targetRow) {
  throw new Error("Unknown target");
}

return executeDrillAction({
  drill: toDefinitionRecord(row),
  disruptiveActionsEnabled,
  role: session.role,
  target: toTargetRecord(targetRow),
  user: session.user,
});
```

```ts
// apps/dashboard/src/lib/drills/service.ts
export async function executeDrillAction(input: {
  createChaos?: typeof createChaosObject;
  createLoadJob?: typeof createLoadJob;
  drainNode?: typeof drainNode;
  drill: DrillDefinitionRecord;
  disruptiveActionsEnabled: boolean;
  insertAuditEvent?: typeof insertAuditEvent;
  insertRun?: typeof insertRun;
  role: AppRole;
  target: DrillTargetRecord;
  updateRun?: typeof updateRun;
  user: { id: string; name: string };
}) {
  const decision = canExecuteDrill({
    disruptiveActionsEnabled: input.disruptiveActionsEnabled,
    drill: input.drill,
    role: input.role,
    target: input.target,
  });

  if (!decision.allow) {
    throw new Error(decision.reason);
  }

  const run = await (input.insertRun ?? insertRun)({
    drillDefinitionId: input.drill.id,
    drillKey: input.drill.key,
    drillTargetId: input.target.id,
    requestedByUserId: input.user.id,
    status: "pending",
    targetKey: input.target.key,
    targetSummary:
      input.target.kind === "workload"
        ? `${input.target.namespace}/${input.target.serviceName}`
        : input.target.nodeName!,
  });

  if (input.drill.kind === "traffic_spike") {
    await (input.createLoadJob ?? createLoadJob)(buildLoadJobManifest({
      drill: input.drill,
      runId: run.id,
      target: input.target,
    }));
  } else if (input.drill.kind === "node_cordon_drain") {
    await (input.drainNode ?? drainNode)(input.target.nodeName!);
  } else {
    await (input.createChaos ?? createChaosObject)(buildChaosManifest({
      drill: input.drill,
      requestedByUserId: input.user.id,
      runId: run.id,
      target: input.target,
    }));
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- src/lib/drills/service.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/src/lib/drills/service.ts apps/dashboard/src/lib/drills/service.test.ts apps/dashboard/src/lib/drills/server.ts
git commit -m "feat: add dashboard multi-target drill execution"
```

### Task 6: Add Target Selection To The Drills UI

**Files:**
- Modify: `apps/dashboard/src/components/drill-catalog.tsx`
- Modify: `apps/dashboard/src/components/drill-catalog.test.tsx`
- Modify: `apps/dashboard/src/routes/drills.tsx`

- [ ] **Step 1: Write the failing UI test**

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DrillCatalog } from "./drill-catalog";

describe("DrillCatalog", () => {
  it("submits drill key and selected target key", () => {
    const onExecute = vi.fn();

    render(
      <DrillCatalog
        data={{
          disruptiveActionsEnabled: true,
          drills: [
            {
              blastRadiusSummary: "Delete one pod.",
              enabled: true,
              key: "pod-delete",
              kind: "pod_delete",
              name: "Delete One Pod",
              targets: [
                { blastRadiusSummary: "Affects dashboard only.", key: "dashboard", name: "Dashboard", targetSummary: "dashboard/dashboard" },
                { blastRadiusSummary: "Affects istiod.", key: "istiod", name: "Istiod", targetSummary: "istio-system/istiod" },
              ],
            },
          ],
          runs: [],
        }}
        error={null}
        isRefreshing={false}
        onExecute={onExecute}
        onToggleSafety={() => {}}
        role="operator"
        toggleBusy={false}
      />,
    );

    fireEvent.change(screen.getByLabelText("Target for Delete One Pod"), {
      target: { value: "istiod" },
    });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: "Execute drill" }));

    expect(onExecute).toHaveBeenCalledWith("pod-delete", "istiod");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/components/drill-catalog.test.tsx`

Expected: FAIL because the component cannot render or submit targets yet.

- [ ] **Step 3: Write minimal implementation**

```tsx
// apps/dashboard/src/components/drill-catalog.tsx
type DrillCatalogProps = {
  data: DrillCatalogView;
  error: string | null;
  isRefreshing: boolean;
  onExecute: (drillKey: string, targetKey: string) => void;
  onToggleSafety: (enabled: boolean) => void;
  role: AppRole;
  toggleBusy: boolean;
};

const [selectedTargets, setSelectedTargets] = useState<Record<string, string>>({});

const selectedTargetKey = selectedTargets[drill.key] ?? drill.targets[0]?.key;

<label className="mt-4 block text-sm text-[var(--sea-ink-soft)]">
  Target for {drill.name}
  <select
    aria-label={`Target for ${drill.name}`}
    className="mt-2 w-full rounded-xl border px-3 py-2"
    value={selectedTargetKey}
    onChange={(event) =>
      setSelectedTargets((current) => ({
        ...current,
        [drill.key]: event.target.value,
      }))
    }
  >
    {drill.targets.map((target) => (
      <option key={target.key} value={target.key}>
        {target.targetSummary}
      </option>
    ))}
  </select>
</label>

onClick={() => {
  if (selectedTargetKey && window.confirm(`Execute ${drill.name} against ${selectedTargetKey}?`)) {
    onExecute(drill.key, selectedTargetKey);
  }
}}
```

```tsx
// apps/dashboard/src/routes/drills.tsx
const executeMutation = useMutation({
  mutationFn: (input: { drillKey: string; targetKey: string }) =>
    executeDrill({ data: input }),
});

<DrillCatalog
  data={query.data}
  error={error}
  isRefreshing={query.isFetching}
  onExecute={(drillKey, targetKey) => executeMutation.mutate({ drillKey, targetKey })}
  onToggleSafety={(enabled) => toggleMutation.mutate(enabled)}
  role={initialData.session?.user.role ?? "viewer"}
  toggleBusy={toggleMutation.isPending}
/>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- src/components/drill-catalog.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/src/components/drill-catalog.tsx apps/dashboard/src/components/drill-catalog.test.tsx apps/dashboard/src/routes/drills.tsx
git commit -m "feat: add dashboard drill target selection"
```

### Task 7: Add RBAC, Docs, And Phase 4 Live Verification

**Files:**
- Modify: `clusters/datacenter/dashboard-chaos-access.yaml`
- Modify: `tests/dashboard/test_dashboard_phase4_targets.sh`
- Modify: `apps/dashboard/README.md`
- Modify: `docs/runbooks/local-access.md`

- [ ] **Step 1: Write the failing repo-level RBAC/doc checks**

Extend `tests/dashboard/test_dashboard_phase4_targets.sh` with:

```bash
grep -q 'networkchaos' clusters/datacenter/dashboard-chaos-access.yaml
grep -q 'jobs' clusters/datacenter/dashboard-chaos-access.yaml
grep -q 'nodes' clusters/datacenter/dashboard-chaos-access.yaml
grep -q 'pods/eviction' clusters/datacenter/dashboard-chaos-access.yaml
grep -q 'traffic spike' apps/dashboard/README.md
grep -q 'node cordon' docs/runbooks/local-access.md
```

- [ ] **Step 2: Run checks to verify they fail**

Run: `bash tests/dashboard/test_dashboard_phase4_targets.sh`

Expected: FAIL because RBAC and docs are incomplete.

- [ ] **Step 3: Write minimal implementation**

```yaml
# clusters/datacenter/dashboard-chaos-access.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: dashboard-chaos-runner
  namespace: chaos-mesh
rules:
  - apiGroups: ["chaos-mesh.org"]
    resources: ["podchaos", "networkchaos"]
    verbs: ["create", "delete", "get", "list", "watch"]
  - apiGroups: ["batch"]
    resources: ["jobs"]
    verbs: ["create", "delete", "get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: dashboard-node-drill-runner
rules:
  - apiGroups: [""]
    resources: ["nodes"]
    verbs: ["get", "list", "patch", "watch"]
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["get", "list", "watch"]
  - apiGroups: [""]
    resources: ["pods/eviction"]
    verbs: ["create"]
```

```md
<!-- apps/dashboard/README.md -->
Current drill slice:

- pod delete against approved workload targets
- traffic spike against approved service targets
- latency and error injection against approved workload targets
- exact-node cordon and drain against one approved node
```

```md
<!-- docs/runbooks/local-access.md -->
Open `https://dashboard.datacenter.lan/drills` and confirm:

- each drill shows only approved targets
- pod delete, traffic spike, latency/error, and node cordon/drain render
- selecting a target sends the expected blast-radius text
- a new run row appears after execution
```

- [ ] **Step 4: Run checks to verify they pass**

Run:

```bash
bash tests/dashboard/test_dashboard_phase4_targets.sh
bash tests/bootstrap/test_cluster_scripts.sh
kubectl kustomize clusters/datacenter >/dev/null
pnpm build
```

Expected:

- shell checks pass
- bootstrap tests pass
- kustomize render passes
- build passes

- [ ] **Step 5: Commit**

```bash
git add clusters/datacenter/dashboard-chaos-access.yaml tests/dashboard/test_dashboard_phase4_targets.sh apps/dashboard/README.md docs/runbooks/local-access.md
git commit -m "feat: add dashboard phase 4 drill access and docs"
```

## Final Verification

Run all of the following after Task 7:

```bash
bash tests/dashboard/test_dashboard_phase4_targets.sh
pnpm test -- src/lib/drills/policy.test.ts src/lib/drills/chaos-client.test.ts src/lib/drills/load-job-client.test.ts src/lib/drills/node-client.test.ts
pnpm test -- src/lib/drills/service.test.ts
pnpm test -- src/components/drill-catalog.test.tsx
pnpm build
bash tests/bootstrap/test_cluster_scripts.sh
kubectl kustomize apps/dashboard/k8s >/dev/null
kubectl kustomize clusters/datacenter >/dev/null
```

Expected:

- targeted tests pass
- build passes
- kustomize renders pass

Manual live verification after sync:

```bash
kubectl -n dashboard rollout status deployment/dashboard
kubectl -n chaos-mesh get podchaos
kubectl -n chaos-mesh get networkchaos
kubectl -n chaos-mesh get jobs
kubectl get node <verified-node-name>
```

Then verify in the app:

- `viewer` can read all drills but cannot execute
- `operator` and `admin` can execute each workload drill when disruptive actions are enabled
- `node-cordon-drain` is visible only with the exact allowlisted node target
- run history shows both drill and target
- audit events include both drill and target keys
