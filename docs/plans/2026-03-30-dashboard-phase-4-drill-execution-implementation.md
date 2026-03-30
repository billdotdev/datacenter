# Dashboard Phase 4 Drill Execution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the first manual drill execution slice to the dashboard with one seeded `pod-delete-dashboard` scenario, role-aware execution, PostgreSQL-backed run history, audit logging, and an admin safety gate.

**Architecture:** Keep all drill logic inside the app server boundary. Persist drill definitions, runs, audit events, and safety state in PostgreSQL; expose a small set of server functions for catalog reads, execution, and admin safety toggling; and create a namespaced Chaos Mesh `PodChaos` object from a fixed app-owned template for the single allowlisted dashboard target.

**Tech Stack:** TanStack Start, TanStack Query, Better Auth, Drizzle ORM, PostgreSQL, TypeScript, Vitest, Chaos Mesh, Kubernetes RBAC, kustomize

---

### Task 1: Add Drill Persistence And Seed Data

**Files:**
- Modify: `apps/dashboard/src/db/schema.ts`
- Create: `apps/dashboard/drizzle/0001_dashboard_drill_execution.sql`
- Modify: `apps/dashboard/drizzle/meta/_journal.json`
- Create: `tests/dashboard/test_dashboard_drill_schema.sh`

- [ ] **Step 1: Write the failing test**

```bash
#!/usr/bin/env bash
set -euo pipefail

test -f apps/dashboard/src/db/schema.ts
test -f apps/dashboard/drizzle/0001_dashboard_drill_execution.sql

grep -q 'drill_definition' apps/dashboard/src/db/schema.ts
grep -q 'drill_run' apps/dashboard/src/db/schema.ts
grep -q 'audit_log' apps/dashboard/src/db/schema.ts
grep -q 'app_config' apps/dashboard/src/db/schema.ts
grep -q 'pod-delete-dashboard' apps/dashboard/drizzle/0001_dashboard_drill_execution.sql
grep -q 'disruptive_actions_enabled' apps/dashboard/drizzle/0001_dashboard_drill_execution.sql
grep -q '"tag": "0001_dashboard_drill_execution"' apps/dashboard/drizzle/meta/_journal.json
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bash tests/dashboard/test_dashboard_drill_schema.sh`
Expected: FAIL because the drill tables, seed migration, and journal entry do not exist yet.

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/dashboard/src/db/schema.ts
import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  role: text("role", { enum: ["admin", "operator", "viewer"] }).default(
    "viewer",
  ),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const drillDefinition = pgTable(
  "drill_definition",
  {
    id: text("id").primaryKey(),
    key: text("key").notNull().unique(),
    name: text("name").notNull(),
    kind: text("kind").notNull(),
    enabled: boolean("enabled").default(true).notNull(),
    requiresDisruptiveActions: boolean("requires_disruptive_actions")
      .default(true)
      .notNull(),
    targetNamespace: text("target_namespace").notNull(),
    targetSelector: jsonb("target_selector").notNull(),
    blastRadiusSummary: text("blast_radius_summary").notNull(),
    chaosTemplate: jsonb("chaos_template").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("drill_definition_key_idx").on(table.key)],
);

export const drillRun = pgTable(
  "drill_run",
  {
    id: text("id").primaryKey(),
    drillDefinitionId: text("drill_definition_id")
      .notNull()
      .references(() => drillDefinition.id, { onDelete: "restrict" }),
    requestedByUserId: text("requested_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
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
    index("drill_run_requested_by_idx").on(table.requestedByUserId),
    index("drill_run_status_idx").on(table.status),
  ],
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: text("id").primaryKey(),
    eventType: text("event_type").notNull(),
    actorUserId: text("actor_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    subjectType: text("subject_type").notNull(),
    subjectId: text("subject_id"),
    payload: jsonb("payload").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("audit_log_event_type_idx").on(table.eventType),
    index("audit_log_actor_idx").on(table.actorUserId),
  ],
);

export const appConfig = pgTable("app_config", {
  key: text("key").primaryKey(),
  booleanValue: boolean("boolean_value").notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  drillRuns: many(drillRun),
  auditLogs: many(auditLog),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const drillDefinitionRelations = relations(
  drillDefinition,
  ({ many }) => ({
    runs: many(drillRun),
  }),
);

export const drillRunRelations = relations(drillRun, ({ one }) => ({
  drillDefinition: one(drillDefinition, {
    fields: [drillRun.drillDefinitionId],
    references: [drillDefinition.id],
  }),
  requestedByUser: one(user, {
    fields: [drillRun.requestedByUserId],
    references: [user.id],
  }),
}));

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  actorUser: one(user, {
    fields: [auditLog.actorUserId],
    references: [user.id],
  }),
}));
```

```sql
-- apps/dashboard/drizzle/0001_dashboard_drill_execution.sql
CREATE TABLE "drill_definition" (
  "id" text PRIMARY KEY NOT NULL,
  "key" text NOT NULL,
  "name" text NOT NULL,
  "kind" text NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "requires_disruptive_actions" boolean DEFAULT true NOT NULL,
  "target_namespace" text NOT NULL,
  "target_selector" jsonb NOT NULL,
  "blast_radius_summary" text NOT NULL,
  "chaos_template" jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "drill_definition_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "drill_run" (
  "id" text PRIMARY KEY NOT NULL,
  "drill_definition_id" text NOT NULL,
  "requested_by_user_id" text NOT NULL,
  "status" text NOT NULL,
  "target_summary" text NOT NULL,
  "chaos_namespace" text,
  "chaos_name" text,
  "requested_at" timestamp DEFAULT now() NOT NULL,
  "started_at" timestamp,
  "finished_at" timestamp,
  "error_message" text
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
  "id" text PRIMARY KEY NOT NULL,
  "event_type" text NOT NULL,
  "actor_user_id" text,
  "subject_type" text NOT NULL,
  "subject_id" text,
  "payload" jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_config" (
  "key" text PRIMARY KEY NOT NULL,
  "boolean_value" boolean NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "drill_run" ADD CONSTRAINT "drill_run_definition_fk"
  FOREIGN KEY ("drill_definition_id") REFERENCES "public"."drill_definition"("id")
  ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "drill_run" ADD CONSTRAINT "drill_run_requested_by_fk"
  FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."user"("id")
  ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_fk"
  FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id")
  ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "drill_definition_key_idx" ON "drill_definition" USING btree ("key");
--> statement-breakpoint
CREATE INDEX "drill_run_definition_idx" ON "drill_run" USING btree ("drill_definition_id");
--> statement-breakpoint
CREATE INDEX "drill_run_requested_by_idx" ON "drill_run" USING btree ("requested_by_user_id");
--> statement-breakpoint
CREATE INDEX "drill_run_status_idx" ON "drill_run" USING btree ("status");
--> statement-breakpoint
CREATE INDEX "audit_log_event_type_idx" ON "audit_log" USING btree ("event_type");
--> statement-breakpoint
CREATE INDEX "audit_log_actor_idx" ON "audit_log" USING btree ("actor_user_id");
--> statement-breakpoint
INSERT INTO "drill_definition" (
  "id",
  "key",
  "name",
  "kind",
  "enabled",
  "requires_disruptive_actions",
  "target_namespace",
  "target_selector",
  "blast_radius_summary",
  "chaos_template"
) VALUES (
  'drill-pod-delete-dashboard',
  'pod-delete-dashboard',
  'Delete One Dashboard Pod',
  'pod_delete',
  true,
  true,
  'dashboard',
  '{"app.kubernetes.io/name":"dashboard"}'::jsonb,
  'Restarts one dashboard pod in namespace dashboard.'::text,
  '{"action":"pod-kill","mode":"one"}'::jsonb
);
--> statement-breakpoint
INSERT INTO "app_config" ("key", "boolean_value")
VALUES ('disruptive_actions_enabled', false);
```

```json
// apps/dashboard/drizzle/meta/_journal.json
{
  "version": "7",
  "dialect": "postgresql",
  "entries": [
    {
      "idx": 0,
      "version": "7",
      "when": 1774817720757,
      "tag": "0000_wet_photon",
      "breakpoints": true
    },
    {
      "idx": 1,
      "version": "7",
      "when": 1774890000000,
      "tag": "0001_dashboard_drill_execution",
      "breakpoints": true
    }
  ]
}
```

```bash
# tests/dashboard/test_dashboard_drill_schema.sh
#!/usr/bin/env bash
set -euo pipefail

test -f apps/dashboard/src/db/schema.ts
test -f apps/dashboard/drizzle/0001_dashboard_drill_execution.sql

grep -q 'drill_definition' apps/dashboard/src/db/schema.ts
grep -q 'drill_run' apps/dashboard/src/db/schema.ts
grep -q 'audit_log' apps/dashboard/src/db/schema.ts
grep -q 'app_config' apps/dashboard/src/db/schema.ts
grep -q 'pod-delete-dashboard' apps/dashboard/drizzle/0001_dashboard_drill_execution.sql
grep -q 'disruptive_actions_enabled' apps/dashboard/drizzle/0001_dashboard_drill_execution.sql
grep -q '"tag": "0001_dashboard_drill_execution"' apps/dashboard/drizzle/meta/_journal.json
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bash tests/dashboard/test_dashboard_drill_schema.sh`
Expected: PASS with no output.

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/src/db/schema.ts apps/dashboard/drizzle/0001_dashboard_drill_execution.sql apps/dashboard/drizzle/meta/_journal.json tests/dashboard/test_dashboard_drill_schema.sh
git commit -m "feat: add dashboard drill persistence"
```

### Task 2: Add Drill Policy, DTOs, And Chaos Mesh Translation

**Files:**
- Create: `apps/dashboard/src/lib/drills/models.ts`
- Create: `apps/dashboard/src/lib/drills/policy.ts`
- Create: `apps/dashboard/src/lib/drills/policy.test.ts`
- Create: `apps/dashboard/src/lib/drills/chaos-client.ts`
- Create: `apps/dashboard/src/lib/drills/chaos-client.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// apps/dashboard/src/lib/drills/policy.test.ts
import { describe, expect, it } from "vitest";

import { canExecuteDrill, isAllowedTarget } from "./policy";
import type { DrillDefinitionRecord } from "./models";

const drill: DrillDefinitionRecord = {
  blastRadiusSummary: "Restarts one dashboard pod in namespace dashboard.",
  chaosTemplate: { action: "pod-kill", mode: "one" },
  enabled: true,
  id: "drill-pod-delete-dashboard",
  key: "pod-delete-dashboard",
  kind: "pod_delete",
  name: "Delete One Dashboard Pod",
  requiresDisruptiveActions: true,
  targetNamespace: "dashboard",
  targetSelector: { "app.kubernetes.io/name": "dashboard" },
};

describe("canExecuteDrill", () => {
  it("denies viewers", () => {
    expect(
      canExecuteDrill({
        disruptiveActionsEnabled: true,
        drill,
        role: "viewer",
      }),
    ).toEqual({
      allow: false,
      reason: "forbidden",
    });
  });

  it("denies when disruptive actions are disabled", () => {
    expect(
      canExecuteDrill({
        disruptiveActionsEnabled: false,
        drill,
        role: "operator",
      }),
    ).toEqual({
      allow: false,
      reason: "disruptive-actions-disabled",
    });
  });
});

describe("isAllowedTarget", () => {
  it("allows only dashboard namespace and selector", () => {
    expect(
      isAllowedTarget({
        namespace: "dashboard",
        selector: { "app.kubernetes.io/name": "dashboard" },
      }),
    ).toBe(true);

    expect(
      isAllowedTarget({
        namespace: "observability",
        selector: { "app.kubernetes.io/name": "dashboard" },
      }),
    ).toBe(false);
  });
});
```

```ts
// apps/dashboard/src/lib/drills/chaos-client.test.ts
import { describe, expect, it } from "vitest";

import { buildPodChaosManifest } from "./chaos-client";
import type { DrillDefinitionRecord } from "./models";

describe("buildPodChaosManifest", () => {
  it("materializes a namespaced pod-kill manifest for dashboard pods", () => {
    const drill: DrillDefinitionRecord = {
      blastRadiusSummary: "Restarts one dashboard pod in namespace dashboard.",
      chaosTemplate: { action: "pod-kill", mode: "one" },
      enabled: true,
      id: "drill-pod-delete-dashboard",
      key: "pod-delete-dashboard",
      kind: "pod_delete",
      name: "Delete One Dashboard Pod",
      requiresDisruptiveActions: true,
      targetNamespace: "dashboard",
      targetSelector: { "app.kubernetes.io/name": "dashboard" },
    };

    expect(
      buildPodChaosManifest({
        drill,
        requestedByUserId: "user-123",
        runId: "run-123",
      }),
    ).toMatchObject({
      apiVersion: "chaos-mesh.org/v1alpha1",
      kind: "PodChaos",
      metadata: {
        labels: {
          "app.kubernetes.io/managed-by": "datacenter-dashboard",
          "datacenter.dev/drill-key": "pod-delete-dashboard",
          "datacenter.dev/run-id": "run-123",
        },
        name: "dashboard-run-123",
        namespace: "chaos-mesh",
      },
      spec: {
        action: "pod-kill",
        mode: "one",
        selector: {
          labelSelectors: {
            "app.kubernetes.io/name": "dashboard",
          },
          namespaces: ["dashboard"],
        },
      },
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- src/lib/drills/policy.test.ts src/lib/drills/chaos-client.test.ts`
Expected: FAIL because the drill model, policy, and chaos client files do not exist yet.

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/dashboard/src/lib/drills/models.ts
export type DrillKind = "pod_delete";

export type DrillRunStatus = "pending" | "running" | "succeeded" | "failed";

export type AppRole = "admin" | "operator" | "viewer";

export type DrillDefinitionRecord = {
  blastRadiusSummary: string;
  chaosTemplate: {
    action: "pod-kill";
    mode: "one";
  };
  enabled: boolean;
  id: string;
  key: string;
  kind: DrillKind;
  name: string;
  requiresDisruptiveActions: boolean;
  targetNamespace: string;
  targetSelector: Record<string, string>;
};

export type DrillRunView = {
  chaosName: string | null;
  errorMessage: string | null;
  finishedAt: string | null;
  id: string;
  requestedAt: string;
  requestedByName: string;
  status: DrillRunStatus;
  targetSummary: string;
};

export type DrillCatalogView = {
  disruptiveActionsEnabled: boolean;
  drills: Array<{
    blastRadiusSummary: string;
    enabled: boolean;
    key: string;
    kind: DrillKind;
    name: string;
    targetSummary: string;
  }>;
  runs: DrillRunView[];
};

export type PodChaosManifest = {
  apiVersion: "chaos-mesh.org/v1alpha1";
  kind: "PodChaos";
  metadata: {
    annotations: Record<string, string>;
    labels: Record<string, string>;
    name: string;
    namespace: "chaos-mesh";
  };
  spec: {
    action: "pod-kill";
    mode: "one";
    selector: {
      labelSelectors: Record<string, string>;
      namespaces: [string];
    };
  };
};
```

```ts
// apps/dashboard/src/lib/drills/policy.ts
import type { AppRole, DrillDefinitionRecord } from "./models";

type CanExecuteDrillInput = {
  disruptiveActionsEnabled: boolean;
  drill: DrillDefinitionRecord;
  role: AppRole;
};

export function isAllowedTarget(input: {
  namespace: string;
  selector: Record<string, string>;
}) {
  return (
    input.namespace === "dashboard" &&
    input.selector["app.kubernetes.io/name"] === "dashboard" &&
    Object.keys(input.selector).length === 1
  );
}

export function canExecuteDrill({
  disruptiveActionsEnabled,
  drill,
  role,
}: CanExecuteDrillInput) {
  if (role !== "admin" && role !== "operator") {
    return { allow: false as const, reason: "forbidden" as const };
  }

  if (!drill.enabled) {
    return { allow: false as const, reason: "drill-disabled" as const };
  }

  if (drill.requiresDisruptiveActions && !disruptiveActionsEnabled) {
    return {
      allow: false as const,
      reason: "disruptive-actions-disabled" as const,
    };
  }

  if (
    !isAllowedTarget({
      namespace: drill.targetNamespace,
      selector: drill.targetSelector,
    })
  ) {
    return { allow: false as const, reason: "invalid-target" as const };
  }

  return { allow: true as const };
}
```

```ts
// apps/dashboard/src/lib/drills/chaos-client.ts
import { createKubeClients } from "#/lib/cluster/kube-client";

import type { DrillDefinitionRecord, PodChaosManifest } from "./models";

export function buildPodChaosManifest(input: {
  drill: DrillDefinitionRecord;
  requestedByUserId: string;
  runId: string;
}): PodChaosManifest {
  return {
    apiVersion: "chaos-mesh.org/v1alpha1",
    kind: "PodChaos",
    metadata: {
      annotations: {
        "datacenter.dev/requested-by": input.requestedByUserId,
      },
      labels: {
        "app.kubernetes.io/managed-by": "datacenter-dashboard",
        "datacenter.dev/drill-key": input.drill.key,
        "datacenter.dev/run-id": input.runId,
      },
      name: `dashboard-${input.runId}`,
      namespace: "chaos-mesh",
    },
    spec: {
      action: input.drill.chaosTemplate.action,
      mode: input.drill.chaosTemplate.mode,
      selector: {
        labelSelectors: input.drill.targetSelector,
        namespaces: [input.drill.targetNamespace],
      },
    },
  };
}

export async function createPodChaos(manifest: PodChaosManifest) {
  const { customObjectsApi } = createKubeClients();

  await customObjectsApi.createNamespacedCustomObject({
    body: manifest,
    group: "chaos-mesh.org",
    namespace: manifest.metadata.namespace,
    plural: "podchaos",
    version: "v1alpha1",
  });
}

export async function getPodChaos(name: string) {
  const { customObjectsApi } = createKubeClients();

  return customObjectsApi.getNamespacedCustomObject({
    group: "chaos-mesh.org",
    name,
    namespace: "chaos-mesh",
    plural: "podchaos",
    version: "v1alpha1",
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- src/lib/drills/policy.test.ts src/lib/drills/chaos-client.test.ts`
Expected: PASS with `2 passed`.

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/src/lib/drills/models.ts apps/dashboard/src/lib/drills/policy.ts apps/dashboard/src/lib/drills/policy.test.ts apps/dashboard/src/lib/drills/chaos-client.ts apps/dashboard/src/lib/drills/chaos-client.test.ts
git commit -m "feat: add dashboard drill policy and chaos client"
```

### Task 3: Add Drill Catalog, Execution, And Admin Safety Server Functions

**Files:**
- Create: `apps/dashboard/src/lib/drills/service.ts`
- Create: `apps/dashboard/src/lib/drills/service.test.ts`
- Create: `apps/dashboard/src/lib/drills/server.ts`

- [ ] **Step 1: Write the failing test**

```ts
// apps/dashboard/src/lib/drills/service.test.ts
import { describe, expect, it, vi } from "vitest";

import { executeDrillAction, readDrillCatalogData, setDisruptiveActions } from "./service";

describe("readDrillCatalogData", () => {
  it("returns drill cards, safety state, and recent runs", async () => {
    const result = await readDrillCatalogData({
      listDefinitions: async () => [
        {
          blastRadiusSummary: "Restarts one dashboard pod in namespace dashboard.",
          chaosTemplate: { action: "pod-kill", mode: "one" },
          enabled: true,
          id: "drill-pod-delete-dashboard",
          key: "pod-delete-dashboard",
          kind: "pod_delete",
          name: "Delete One Dashboard Pod",
          requiresDisruptiveActions: true,
          targetNamespace: "dashboard",
          targetSelector: { "app.kubernetes.io/name": "dashboard" },
        },
      ],
      listRuns: async () => [],
      reconcileRunStatuses: async () => undefined,
      readDisruptiveActionsEnabled: async () => false,
    });

    expect(result.disruptiveActionsEnabled).toBe(false);
    expect(result.drills[0]?.key).toBe("pod-delete-dashboard");
  });
});

describe("executeDrillAction", () => {
  it("creates a run and PodChaos for an operator", async () => {
    const createPodChaos = vi.fn(async () => undefined);
    const insertAuditEvent = vi.fn(async () => undefined);
    const insertRun = vi.fn(async () => ({
      id: "run-123",
      status: "pending",
    }));
    const updateRun = vi.fn(async () => undefined);

    const result = await executeDrillAction({
      createPodChaos,
      drill: {
        blastRadiusSummary: "Restarts one dashboard pod in namespace dashboard.",
        chaosTemplate: { action: "pod-kill", mode: "one" },
        enabled: true,
        id: "drill-pod-delete-dashboard",
        key: "pod-delete-dashboard",
        kind: "pod_delete",
        name: "Delete One Dashboard Pod",
        requiresDisruptiveActions: true,
        targetNamespace: "dashboard",
        targetSelector: { "app.kubernetes.io/name": "dashboard" },
      },
      disruptiveActionsEnabled: true,
      insertAuditEvent,
      insertRun,
      now: () => new Date("2026-03-30T12:00:00.000Z"),
      role: "operator",
      updateRun,
      user: { id: "user-123", name: "Op User" },
    });

    expect(result.status).toBe("running");
    expect(createPodChaos).toHaveBeenCalledTimes(1);
    expect(insertAuditEvent).toHaveBeenCalledTimes(2);
    expect(updateRun).toHaveBeenCalledWith(
      "run-123",
      expect.objectContaining({
        chaosName: "dashboard-run-123",
        status: "running",
      }),
    );
  });
});

describe("setDisruptiveActions", () => {
  it("blocks non-admin users", async () => {
    await expect(
      setDisruptiveActions({
        enabled: true,
        insertAuditEvent: async () => undefined,
        role: "operator",
        setValue: async () => undefined,
        user: { id: "user-123", name: "Op User" },
      }),
    ).rejects.toThrow("Forbidden");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/lib/drills/service.test.ts`
Expected: FAIL because the drill service and server functions do not exist yet.

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/dashboard/src/lib/drills/service.ts
import { and, desc, eq, inArray } from "drizzle-orm";

import { db } from "#/db";
import { appConfig, auditLog, drillDefinition, drillRun, user } from "#/db/schema";

import { buildPodChaosManifest, createPodChaos, getPodChaos } from "./chaos-client";
import { canExecuteDrill } from "./policy";
import type {
  AppRole,
  DrillCatalogView,
  DrillDefinitionRecord,
  DrillRunStatus,
} from "./models";

function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function toRunStatus(value: string | undefined): DrillRunStatus {
  if (value === "succeeded" || value === "failed" || value === "running") {
    return value;
  }

  return "pending";
}

export async function readDisruptiveActionsEnabled() {
  const config = await db.query.appConfig.findFirst({
    where: eq(appConfig.key, "disruptive_actions_enabled"),
  });

  return config?.booleanValue ?? false;
}

export async function readDrillCatalogData(input?: {
  listDefinitions?: () => Promise<DrillDefinitionRecord[]>;
  listRuns?: () => Promise<DrillCatalogView["runs"]>;
  readDisruptiveActionsEnabled?: () => Promise<boolean>;
  reconcileRunStatuses?: () => Promise<void>;
}) {
  await (input?.reconcileRunStatuses ?? reconcileRunStatuses)();

  const [definitions, runs, disruptiveActionsEnabled] = await Promise.all([
    (input?.listDefinitions ?? listDrillDefinitions)(),
    (input?.listRuns ?? listRecentRuns)(),
    (input?.readDisruptiveActionsEnabled ?? readDisruptiveActionsEnabled)(),
  ]);

  return {
    disruptiveActionsEnabled,
    drills: definitions.map((definition) => ({
      blastRadiusSummary: definition.blastRadiusSummary,
      enabled: definition.enabled,
      key: definition.key,
      kind: definition.kind,
      name: definition.name,
      targetSummary: `${definition.targetNamespace}/${definition.targetSelector["app.kubernetes.io/name"]}`,
    })),
    runs,
  } satisfies DrillCatalogView;
}

export async function executeDrillAction(input: {
  createPodChaos?: typeof createPodChaos;
  drill: DrillDefinitionRecord;
  disruptiveActionsEnabled: boolean;
  insertAuditEvent?: typeof insertAuditEvent;
  insertRun?: typeof insertRun;
  now?: () => Date;
  role: AppRole;
  updateRun?: typeof updateRun;
  user: { id: string; name: string };
}) {
  const decision = canExecuteDrill({
    disruptiveActionsEnabled: input.disruptiveActionsEnabled,
    drill: input.drill,
    role: input.role,
  });

  if (!decision.allow) {
    await (input.insertAuditEvent ?? insertAuditEvent)({
      actorUserId: input.user.id,
      eventType: "drill.execution.denied",
      payload: { drillKey: input.drill.key, reason: decision.reason },
      subjectId: input.drill.id,
      subjectType: "drill_definition",
    });

    throw new Error(decision.reason);
  }

  const requestedAt = (input.now ?? (() => new Date()))().toISOString();
  const run = await (input.insertRun ?? insertRun)({
    requestedAt,
    requestedByUserId: input.user.id,
    status: "pending",
    targetSummary: `${input.drill.targetNamespace}/${input.drill.targetSelector["app.kubernetes.io/name"]}`,
    drillDefinitionId: input.drill.id,
  });

  await (input.insertAuditEvent ?? insertAuditEvent)({
    actorUserId: input.user.id,
    eventType: "drill.execution.requested",
    payload: { drillKey: input.drill.key, runId: run.id },
    subjectId: run.id,
    subjectType: "drill_run",
  });

  const manifest = buildPodChaosManifest({
    drill: input.drill,
    requestedByUserId: input.user.id,
    runId: run.id,
  });

  try {
    await (input.createPodChaos ?? createPodChaos)(manifest);

    await (input.updateRun ?? updateRun)(run.id, {
      chaosName: manifest.metadata.name,
      chaosNamespace: manifest.metadata.namespace,
      startedAt: requestedAt,
      status: "running",
    });

    await (input.insertAuditEvent ?? insertAuditEvent)({
      actorUserId: input.user.id,
      eventType: "drill.execution.created",
      payload: { drillKey: input.drill.key, runId: run.id },
      subjectId: run.id,
      subjectType: "drill_run",
    });

    return {
      id: run.id,
      status: "running" as const,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create PodChaos";

    await (input.updateRun ?? updateRun)(run.id, {
      errorMessage: message,
      finishedAt: requestedAt,
      status: "failed",
    });

    await (input.insertAuditEvent ?? insertAuditEvent)({
      actorUserId: input.user.id,
      eventType: "drill.execution.failed",
      payload: { drillKey: input.drill.key, message, runId: run.id },
      subjectId: run.id,
      subjectType: "drill_run",
    });

    throw error;
  }
}

export async function setDisruptiveActions(input: {
  enabled: boolean;
  insertAuditEvent?: typeof insertAuditEvent;
  role: AppRole;
  setValue?: typeof setDisruptiveActionsValue;
  user: { id: string; name: string };
}) {
  if (input.role !== "admin") {
    throw new Error("Forbidden");
  }

  await (input.setValue ?? setDisruptiveActionsValue)(input.enabled);

  await (input.insertAuditEvent ?? insertAuditEvent)({
    actorUserId: input.user.id,
    eventType: "safety.disruptive_actions.updated",
    payload: { enabled: input.enabled },
    subjectId: "disruptive_actions_enabled",
    subjectType: "app_config",
  });
}

async function listDrillDefinitions(): Promise<DrillDefinitionRecord[]> {
  const rows = await db.select().from(drillDefinition);

  return rows.map((row) => ({
    blastRadiusSummary: row.blastRadiusSummary,
    chaosTemplate: row.chaosTemplate as DrillDefinitionRecord["chaosTemplate"],
    enabled: row.enabled,
    id: row.id,
    key: row.key,
    kind: row.kind as DrillDefinitionRecord["kind"],
    name: row.name,
    requiresDisruptiveActions: row.requiresDisruptiveActions,
    targetNamespace: row.targetNamespace,
    targetSelector: row.targetSelector as Record<string, string>,
  }));
}

async function listRecentRuns() {
  const rows = await db
    .select({
      chaosName: drillRun.chaosName,
      errorMessage: drillRun.errorMessage,
      finishedAt: drillRun.finishedAt,
      id: drillRun.id,
      requestedAt: drillRun.requestedAt,
      requestedByName: user.name,
      status: drillRun.status,
      targetSummary: drillRun.targetSummary,
    })
    .from(drillRun)
    .innerJoin(user, eq(drillRun.requestedByUserId, user.id))
    .orderBy(desc(drillRun.requestedAt))
    .limit(10);

  return rows.map((row) => ({
    chaosName: row.chaosName,
    errorMessage: row.errorMessage,
    finishedAt: row.finishedAt?.toISOString() ?? null,
    id: row.id,
    requestedAt: row.requestedAt.toISOString(),
    requestedByName: row.requestedByName,
    status: toRunStatus(row.status),
    targetSummary: row.targetSummary,
  }));
}

async function insertRun(input: {
  drillDefinitionId: string;
  requestedAt: string;
  requestedByUserId: string;
  status: string;
  targetSummary: string;
}) {
  const id = createId("run");

  await db.insert(drillRun).values({
    drillDefinitionId: input.drillDefinitionId,
    id,
    requestedAt: new Date(input.requestedAt),
    requestedByUserId: input.requestedByUserId,
    status: input.status,
    targetSummary: input.targetSummary,
  });

  return { id, status: input.status };
}

async function updateRun(
  id: string,
  patch: Partial<{
    chaosName: string;
    chaosNamespace: string;
    errorMessage: string;
    finishedAt: string;
    startedAt: string;
    status: string;
  }>,
) {
  await db
    .update(drillRun)
    .set({
      chaosName: patch.chaosName,
      chaosNamespace: patch.chaosNamespace,
      errorMessage: patch.errorMessage,
      finishedAt: patch.finishedAt ? new Date(patch.finishedAt) : undefined,
      startedAt: patch.startedAt ? new Date(patch.startedAt) : undefined,
      status: patch.status,
    })
    .where(eq(drillRun.id, id));
}

async function insertAuditEvent(input: {
  actorUserId: string | null;
  eventType: string;
  payload: Record<string, unknown>;
  subjectId: string | null;
  subjectType: string;
}) {
  await db.insert(auditLog).values({
    actorUserId: input.actorUserId,
    eventType: input.eventType,
    id: createId("audit"),
    payload: input.payload,
    subjectId: input.subjectId,
    subjectType: input.subjectType,
  });
}

async function setDisruptiveActionsValue(enabled: boolean) {
  await db
    .update(appConfig)
    .set({
      booleanValue: enabled,
    })
    .where(eq(appConfig.key, "disruptive_actions_enabled"));
}

async function reconcileRunStatuses() {
  const runningRows = await db
    .select()
    .from(drillRun)
    .where(
      and(
        eq(drillRun.status, "running"),
        inArray(drillRun.chaosNamespace, ["chaos-mesh"]),
      ),
    );

  await Promise.all(
    runningRows.map(async (row) => {
      if (!row.chaosName) {
        return;
      }

      const object = (await getPodChaos(row.chaosName)) as {
        status?: { experiment?: { desiredPhase?: string } };
      };
      const desiredPhase = object.status?.experiment?.desiredPhase;

      if (desiredPhase === "Finished") {
        await updateRun(row.id, {
          finishedAt: new Date().toISOString(),
          status: "succeeded",
        });
        await insertAuditEvent({
          actorUserId: row.requestedByUserId,
          eventType: "drill.execution.completed",
          payload: { runId: row.id },
          subjectId: row.id,
          subjectType: "drill_run",
        });
      }

      if (desiredPhase === "Failed") {
        await updateRun(row.id, {
          errorMessage: "Chaos Mesh marked the run as failed",
          finishedAt: new Date().toISOString(),
          status: "failed",
        });
        await insertAuditEvent({
          actorUserId: row.requestedByUserId,
          eventType: "drill.execution.failed",
          payload: { runId: row.id },
          subjectId: row.id,
          subjectType: "drill_run",
        });
      }
    }),
  );
}
```

```ts
// apps/dashboard/src/lib/drills/server.ts
import { eq } from "drizzle-orm";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

import { db } from "#/db";
import { drillDefinition } from "#/db/schema";
import { auth } from "#/lib/auth";

import {
  executeDrillAction,
  readDisruptiveActionsEnabled,
  readDrillCatalogData,
  setDisruptiveActions,
} from "./service";

type ExecuteDrillInput = {
  drillKey: string;
};

type SetDisruptiveActionsInput = {
  enabled: boolean;
};

function coerceRole(role: string | null | undefined) {
  if (role === "admin" || role === "operator" || role === "viewer") {
    return role;
  }

  return null;
}

async function requireSession() {
  const session = await auth.api.getSession({
    headers: getRequest().headers,
  });

  if (!session) {
    throw new Error("Unauthenticated");
  }

  const role = coerceRole(session.user.role);

  if (!role) {
    throw new Error("Unauthenticated");
  }

  return {
    role,
    user: {
      id: session.user.id,
      name: session.user.name,
    },
  };
}

export const readDrillCatalog = createServerFn({ method: "GET" }).handler(
  async () => {
    await requireSession();
    return readDrillCatalogData();
  },
);

export const executeDrill = createServerFn({ method: "POST" })
  .inputValidator((data: ExecuteDrillInput) => data)
  .handler(async ({ data }) => {
    const session = await requireSession();
    const disruptiveActionsEnabled = await readDisruptiveActionsEnabled();
    const row = await db.query.drillDefinition.findFirst({
      where: eq(drillDefinition.key, data.drillKey),
    });

    if (!row) {
      throw new Error("Unknown drill");
    }

    return executeDrillAction({
      drill: {
        blastRadiusSummary: row.blastRadiusSummary,
        chaosTemplate: row.chaosTemplate as { action: "pod-kill"; mode: "one" },
        enabled: row.enabled,
        id: row.id,
        key: row.key,
        kind: row.kind as "pod_delete",
        name: row.name,
        requiresDisruptiveActions: row.requiresDisruptiveActions,
        targetNamespace: row.targetNamespace,
        targetSelector: row.targetSelector as Record<string, string>,
      },
      disruptiveActionsEnabled,
      role: session.role,
      user: session.user,
    });
  });

export const setDisruptiveActionsEnabled = createServerFn({ method: "POST" })
  .inputValidator((data: SetDisruptiveActionsInput) => data)
  .handler(async ({ data }) => {
    const session = await requireSession();

    await setDisruptiveActions({
      enabled: data.enabled,
      role: session.role,
      user: session.user,
    });

    return {
      ok: true,
    };
  });
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- src/lib/drills/service.test.ts`
Expected: PASS with `3 passed`.

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/src/lib/drills/service.ts apps/dashboard/src/lib/drills/service.test.ts apps/dashboard/src/lib/drills/server.ts
git commit -m "feat: add dashboard drill server functions"
```

### Task 4: Add Drills UI And Admin Safety Controls

**Files:**
- Create: `apps/dashboard/src/components/drill-catalog.tsx`
- Create: `apps/dashboard/src/components/drill-catalog.test.tsx`
- Create: `apps/dashboard/src/routes/drills.tsx`
- Modify: `apps/dashboard/src/routes/admin.tsx`
- Modify: `apps/dashboard/src/components/Header.tsx`
- Modify: `apps/dashboard/src/routeTree.gen.ts`

- [ ] **Step 1: Write the failing test**

```tsx
// apps/dashboard/src/components/drill-catalog.test.tsx
// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DrillCatalog } from "./drill-catalog";

describe("DrillCatalog", () => {
  it("disables execute for viewers and shows recent runs", () => {
    render(
      <DrillCatalog
        error={null}
        isRefreshing={false}
        onExecute={vi.fn()}
        onToggleSafety={vi.fn()}
        role="viewer"
        toggleBusy={false}
        data={{
          disruptiveActionsEnabled: false,
          drills: [
            {
              blastRadiusSummary: "Restarts one dashboard pod in namespace dashboard.",
              enabled: true,
              key: "pod-delete-dashboard",
              kind: "pod_delete",
              name: "Delete One Dashboard Pod",
              targetSummary: "dashboard/dashboard",
            },
          ],
          runs: [
            {
              chaosName: "dashboard-run-123",
              errorMessage: null,
              finishedAt: null,
              id: "run-123",
              requestedAt: "2026-03-30T12:00:00.000Z",
              requestedByName: "Op User",
              status: "running",
              targetSummary: "dashboard/dashboard",
            },
          ],
        }}
      />,
    );

    expect(screen.getByText("Delete One Dashboard Pod")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Execute drill" })).toBeDisabled();
    expect(screen.getByText("Op User")).toBeTruthy();
  });

  it("executes after confirmation for operators", () => {
    const onExecute = vi.fn();
    vi.stubGlobal("confirm", vi.fn(() => true));

    render(
      <DrillCatalog
        error={null}
        isRefreshing={false}
        onExecute={onExecute}
        onToggleSafety={vi.fn()}
        role="operator"
        toggleBusy={false}
        data={{
          disruptiveActionsEnabled: true,
          drills: [
            {
              blastRadiusSummary: "Restarts one dashboard pod in namespace dashboard.",
              enabled: true,
              key: "pod-delete-dashboard",
              kind: "pod_delete",
              name: "Delete One Dashboard Pod",
              targetSummary: "dashboard/dashboard",
            },
          ],
          runs: [],
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Execute drill" }));
    expect(onExecute).toHaveBeenCalledWith("pod-delete-dashboard");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/components/drill-catalog.test.tsx`
Expected: FAIL because the drill catalog component and route do not exist yet.

- [ ] **Step 3: Write minimal implementation**

```tsx
// apps/dashboard/src/components/drill-catalog.tsx
import { Button } from "#/components/ui/button";
import type { DrillCatalogView } from "#/lib/drills/models";

type DrillCatalogProps = {
  data: DrillCatalogView;
  error: string | null;
  isRefreshing: boolean;
  onExecute: (drillKey: string) => void;
  onToggleSafety: (enabled: boolean) => void;
  role: "admin" | "operator" | "viewer";
  toggleBusy: boolean;
};

export function DrillCatalog({
  data,
  error,
  isRefreshing,
  onExecute,
  onToggleSafety,
  role,
  toggleBusy,
}: DrillCatalogProps) {
  return (
    <section className="space-y-6">
      <div className="island-shell rounded-[2rem] px-6 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="island-kicker mb-2">Manual Drills</p>
            <h2 className="display-title text-3xl text-[var(--sea-ink)]">
              First controlled write path
            </h2>
            <p className="mt-3 text-sm text-[var(--sea-ink-soft)]">
              Safety gate:{" "}
              <strong>
                {data.disruptiveActionsEnabled ? "enabled" : "disabled"}
              </strong>
              {isRefreshing ? " · refreshing" : ""}
            </p>
          </div>

          {role === "admin" ? (
            <Button
              variant="outline"
              disabled={toggleBusy}
              onClick={() => onToggleSafety(!data.disruptiveActionsEnabled)}
            >
              {data.disruptiveActionsEnabled
                ? "Disable disruptive actions"
                : "Enable disruptive actions"}
            </Button>
          ) : null}
        </div>

        {error ? (
          <p className="mt-4 rounded-xl border border-[rgba(180,57,57,0.22)] bg-[rgba(180,57,57,0.08)] px-4 py-3 text-sm text-[rgb(139,42,42)]">
            {error}
          </p>
        ) : null}
      </div>

      {data.drills.map((drill) => {
        const disabled =
          role === "viewer" || !data.disruptiveActionsEnabled || !drill.enabled;

        return (
          <article
            key={drill.key}
            className="island-shell rounded-[2rem] px-6 py-6"
          >
            <p className="island-kicker mb-2">{drill.kind}</p>
            <h3 className="text-2xl font-semibold text-[var(--sea-ink)]">
              {drill.name}
            </h3>
            <p className="mt-3 text-sm text-[var(--sea-ink-soft)]">
              {drill.blastRadiusSummary}
            </p>
            <p className="mt-2 text-sm text-[var(--sea-ink-soft)]">
              Target: <code>{drill.targetSummary}</code>
            </p>
            <Button
              className="mt-5"
              disabled={disabled}
              onClick={() => {
                if (
                  window.confirm(
                    `Execute ${drill.name}? This will restart one dashboard pod.`,
                  )
                ) {
                  onExecute(drill.key);
                }
              }}
            >
              Execute drill
            </Button>
          </article>
        );
      })}

      <section className="island-shell rounded-[2rem] px-6 py-6">
        <p className="island-kicker mb-2">Recent Runs</p>
        <h3 className="text-2xl font-semibold text-[var(--sea-ink)]">
          Latest drill history
        </h3>
        <div className="mt-5 space-y-3">
          {data.runs.length === 0 ? (
            <p className="text-sm text-[var(--sea-ink-soft)]">
              No drill runs yet.
            </p>
          ) : (
            data.runs.map((run) => (
              <div
                key={run.id}
                className="rounded-2xl border border-[rgba(23,58,64,0.12)] px-4 py-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong>{run.requestedByName}</strong>
                  <span>{run.status}</span>
                </div>
                <p className="mt-2 text-sm text-[var(--sea-ink-soft)]">
                  {run.targetSummary}
                </p>
                {run.errorMessage ? (
                  <p className="mt-2 text-sm text-[rgb(139,42,42)]">
                    {run.errorMessage}
                  </p>
                ) : null}
              </div>
            ))
          )}
        </div>
      </section>
    </section>
  );
}
```

```tsx
// apps/dashboard/src/routes/drills.tsx
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";

import { DrillCatalog } from "#/components/drill-catalog";
import {
  executeDrill,
  readDrillCatalog,
  setDisruptiveActionsEnabled,
} from "#/lib/drills/server";
import { readAuthPage } from "#/lib/session";

export const Route = createFileRoute("/drills")({
  loader: async () => {
    const authPage = await readAuthPage({
      data: { pathname: "/drills" },
    });

    if (!authPage.decision.allow) {
      throw redirect({ to: authPage.decision.redirectTo });
    }

    return {
      catalog: await readDrillCatalog(),
      session: authPage.session,
    };
  },
  component: DrillsPage,
});

function DrillsPage() {
  const initialData = Route.useLoaderData();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const query = useQuery({
    initialData: initialData.catalog,
    queryFn: () => readDrillCatalog(),
    queryKey: ["drill-catalog"],
    refetchInterval: 20_000,
  });

  const executeMutation = useMutation({
    mutationFn: (drillKey: string) => executeDrill({ data: { drillKey } }),
    onError: (mutationError) => {
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : "Unable to execute drill",
      );
    },
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ["drill-catalog"] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (enabled: boolean) =>
      setDisruptiveActionsEnabled({ data: { enabled } }),
    onError: (mutationError) => {
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : "Unable to update safety setting",
      );
    },
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ["drill-catalog"] });
    },
  });

  return (
    <main className="page-wrap px-4 pb-10 pt-14">
      <DrillCatalog
        data={query.data}
        error={error}
        isRefreshing={query.isFetching}
        onExecute={(drillKey) => executeMutation.mutate(drillKey)}
        onToggleSafety={(enabled) => toggleMutation.mutate(enabled)}
        role={initialData.session?.user.role ?? "viewer"}
        toggleBusy={toggleMutation.isPending}
      />
    </main>
  );
}
```

```tsx
// apps/dashboard/src/routes/admin.tsx
import { useMutation } from "@tanstack/react-query";
import { Link, createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";

import { Button } from "#/components/ui/button";
import {
  readDrillCatalog,
  setDisruptiveActionsEnabled,
} from "#/lib/drills/server";
import { readAuthPage } from "#/lib/session";

export const Route = createFileRoute("/admin")({
  loader: async () => {
    const authPage = await readAuthPage({
      data: { pathname: "/admin" },
    });

    if (!authPage.decision.allow) {
      throw redirect({ to: authPage.decision.redirectTo });
    }

    return {
      authPage,
      drillCatalog: await readDrillCatalog(),
    };
  },
  component: AdminPage,
});

function AdminPage() {
  const { authPage, drillCatalog } = Route.useLoaderData();
  const [enabled, setEnabled] = useState(drillCatalog.disruptiveActionsEnabled);

  const toggleMutation = useMutation({
    mutationFn: (nextEnabled: boolean) =>
      setDisruptiveActionsEnabled({ data: { enabled: nextEnabled } }),
    onSuccess: (_, nextEnabled) => {
      setEnabled(nextEnabled);
    },
  });

  return (
    <main className="page-wrap px-4 pb-10 pt-14">
      <section className="island-shell rounded-[2rem] px-6 py-10 sm:px-10 sm:py-14">
        <p className="island-kicker mb-3">Admin Surface</p>
        <h1 className="display-title mb-4 text-4xl font-bold text-[var(--sea-ink)] sm:text-5xl">
          Admin-only route confirmed.
        </h1>
        <p className="mb-3 max-w-3xl text-base leading-8 text-[var(--sea-ink-soft)]">
          {authPage.session?.user.email} is authenticated as{" "}
          <code>{authPage.session?.user.role}</code>.
        </p>
        <p className="mb-8 max-w-3xl text-base leading-8 text-[var(--sea-ink-soft)]">
          Disruptive actions are currently{" "}
          <strong>{enabled ? "enabled" : "disabled"}</strong>
          .
        </p>
        <p className="mb-8 max-w-3xl text-sm leading-7 text-[var(--sea-ink-soft)]">
          When disabled, every manual drill request fails closed for all roles,
          including admins.
        </p>

        <div className="flex gap-3">
          <Button
            disabled={toggleMutation.isPending}
            onClick={() => toggleMutation.mutate(!enabled)}
          >
            {enabled ? "Disable disruptive actions" : "Enable disruptive actions"}
          </Button>
          <Button asChild>
            <Link to="/drills">Go to drills</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/">Back to dashboard</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
```

```tsx
// apps/dashboard/src/components/Header.tsx
import { Link } from "@tanstack/react-router";

import ThemeToggle from "./ThemeToggle";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[var(--header-bg)] px-4 backdrop-blur-lg">
      <nav className="page-wrap flex flex-wrap items-center gap-x-3 gap-y-2 py-3 sm:py-4">
        <h2 className="m-0 flex-shrink-0 text-base font-semibold tracking-tight">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-3 py-1.5 text-sm text-[var(--sea-ink)] no-underline shadow-[0_8px_24px_rgba(30,90,72,0.08)] sm:px-4 sm:py-2"
          >
            <span className="h-2 w-2 rounded-full bg-[linear-gradient(90deg,#56c6be,#7ed3bf)]" />
            Datacenter
          </Link>
        </h2>

        <div className="ml-auto flex items-center gap-1.5 sm:ml-0 sm:gap-2">
          <ThemeToggle />
        </div>

        <div className="order-3 flex w-full flex-wrap items-center gap-x-4 gap-y-1 pb-1 text-sm font-semibold sm:order-2 sm:w-auto sm:flex-nowrap sm:pb-0">
          <Link
            to="/"
            className="nav-link"
            activeProps={{ className: "nav-link is-active" }}
          >
            Home
          </Link>
          <Link
            to="/drills"
            className="nav-link"
            activeProps={{ className: "nav-link is-active" }}
          >
            Drills
          </Link>
          <Link
            to="/about"
            className="nav-link"
            activeProps={{ className: "nav-link is-active" }}
          >
            About
          </Link>
        </div>
      </nav>
    </header>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- src/components/drill-catalog.test.tsx`
Expected: PASS with `2 passed`.

Run: `pnpm build`
Expected: PASS with Vite client and SSR builds succeeding.

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/src/components/drill-catalog.tsx apps/dashboard/src/components/drill-catalog.test.tsx apps/dashboard/src/routes/drills.tsx apps/dashboard/src/routes/admin.tsx apps/dashboard/src/components/Header.tsx apps/dashboard/src/routeTree.gen.ts
git commit -m "feat: add dashboard drill controls"
```

### Task 5: Add Chaos Mesh RBAC, Docs, And Verification Runbook

**Files:**
- Create: `clusters/datacenter/dashboard-chaos-access.yaml`
- Modify: `clusters/datacenter/kustomization.yaml`
- Create: `tests/dashboard/test_dashboard_drill_access.sh`
- Modify: `tests/bootstrap/test_cluster_scripts.sh`
- Modify: `apps/dashboard/README.md`
- Modify: `docs/runbooks/local-access.md`

- [ ] **Step 1: Write the failing test**

```bash
#!/usr/bin/env bash
set -euo pipefail

test -f clusters/datacenter/dashboard-chaos-access.yaml

grep -q 'kind: Role' clusters/datacenter/dashboard-chaos-access.yaml
grep -q 'kind: RoleBinding' clusters/datacenter/dashboard-chaos-access.yaml
grep -q 'namespace: chaos-mesh' clusters/datacenter/dashboard-chaos-access.yaml
grep -q 'podchaos' clusters/datacenter/dashboard-chaos-access.yaml
grep -q 'dashboard-chaos-access.yaml' clusters/datacenter/kustomization.yaml
grep -q 'drills' apps/dashboard/README.md
grep -q 'disruptive actions' apps/dashboard/README.md
grep -q 'PodChaos' docs/runbooks/local-access.md
kubectl kustomize clusters/datacenter >/dev/null
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bash tests/dashboard/test_dashboard_drill_access.sh`
Expected: FAIL because the cross-namespace Chaos Mesh access manifest and phase-4 docs do not exist yet.

- [ ] **Step 3: Write minimal implementation**

```yaml
# clusters/datacenter/dashboard-chaos-access.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: dashboard-chaos-runner
  namespace: chaos-mesh
rules:
  - apiGroups:
      - chaos-mesh.org
    resources:
      - podchaos
    verbs:
      - create
      - get
      - list
      - watch
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: dashboard-chaos-runner
  namespace: chaos-mesh
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: dashboard-chaos-runner
subjects:
  - kind: ServiceAccount
    name: dashboard
    namespace: dashboard
```

```yaml
# clusters/datacenter/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - root-project.yaml
  - platform
  - dashboard.yaml
  - dashboard-chaos-access.yaml
```

```bash
# tests/dashboard/test_dashboard_drill_access.sh
#!/usr/bin/env bash
set -euo pipefail

test -f clusters/datacenter/dashboard-chaos-access.yaml

grep -q 'kind: Role' clusters/datacenter/dashboard-chaos-access.yaml
grep -q 'kind: RoleBinding' clusters/datacenter/dashboard-chaos-access.yaml
grep -q 'namespace: chaos-mesh' clusters/datacenter/dashboard-chaos-access.yaml
grep -q 'podchaos' clusters/datacenter/dashboard-chaos-access.yaml
grep -q 'dashboard-chaos-access.yaml' clusters/datacenter/kustomization.yaml
grep -q 'drills' apps/dashboard/README.md
grep -q 'disruptive actions' apps/dashboard/README.md
grep -q 'PodChaos' docs/runbooks/local-access.md
kubectl kustomize clusters/datacenter >/dev/null
```

```bash
# tests/bootstrap/test_cluster_scripts.sh
grep -q 'serviceAccountName: dashboard' apps/dashboard/k8s/deployment.yaml
grep -q 'argoproj.io' apps/dashboard/k8s/clusterrole.yaml
grep -q 'applications' apps/dashboard/k8s/clusterrole.yaml
grep -q 'nodes' apps/dashboard/k8s/clusterrole.yaml
grep -q 'podchaos' clusters/datacenter/dashboard-chaos-access.yaml
grep -q 'namespace: chaos-mesh' clusters/datacenter/dashboard-chaos-access.yaml
```

```md
<!-- apps/dashboard/README.md -->
## Phase 4 Drill Execution

The dashboard now exposes a dedicated `/drills` route for the first controlled
write path.

Current drill slice:

- one seeded drill: `pod-delete-dashboard`
- `viewer` can read catalog and run history only
- `operator` and `admin` can execute when disruptive actions are enabled
- `admin` can toggle the global disruptive-actions safety gate

Execution backend:

- app-owned PostgreSQL drill definitions, runs, and audit log
- backend-created Chaos Mesh `PodChaos`
- fixed allowlist target: dashboard pods in namespace `dashboard`
```

```md
<!-- docs/runbooks/local-access.md -->
## Dashboard Drill Execution

Before executing drills, verify the safety gate state in `/admin` or `/drills`.

After syncing the latest image, verify:

```bash
kubectl -n dashboard rollout status deployment/dashboard
kubectl -n chaos-mesh get rolebinding dashboard-chaos-runner
kubectl -n chaos-mesh get podchaos
```

Open `https://dashboard.datacenter.lan/drills` and confirm:

- the `pod-delete-dashboard` card renders
- `viewer` cannot execute
- `operator` or `admin` can execute when disruptive actions are enabled
- a new run row appears after execution
- a `PodChaos` object appears in namespace `chaos-mesh`
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bash tests/dashboard/test_dashboard_drill_access.sh`
Expected: PASS with no output.

Run: `bash tests/bootstrap/test_cluster_scripts.sh`
Expected: PASS with no output.

Run: `kubectl kustomize clusters/datacenter >/dev/null`
Expected: PASS with exit code `0`.

- [ ] **Step 5: Commit**

```bash
git add clusters/datacenter/dashboard-chaos-access.yaml clusters/datacenter/kustomization.yaml tests/dashboard/test_dashboard_drill_access.sh tests/bootstrap/test_cluster_scripts.sh apps/dashboard/README.md docs/runbooks/local-access.md
git commit -m "feat: add dashboard chaos access and docs"
```

## Final Verification

Run all of the following after Task 5:

```bash
bash tests/dashboard/test_dashboard_drill_schema.sh
pnpm test -- src/lib/drills/policy.test.ts src/lib/drills/chaos-client.test.ts
pnpm test -- src/lib/drills/service.test.ts
pnpm test -- src/components/drill-catalog.test.tsx
pnpm build
bash tests/dashboard/test_dashboard_drill_access.sh
bash tests/bootstrap/test_cluster_scripts.sh
kubectl kustomize apps/dashboard/k8s >/dev/null
kubectl kustomize clusters/datacenter >/dev/null
```

Expected:

- shell tests pass
- Vitest checks pass
- build passes
- both kustomize renders pass

Manual live verification after sync:

```bash
kubectl -n dashboard rollout status deployment/dashboard
kubectl -n chaos-mesh get rolebinding dashboard-chaos-runner
kubectl -n chaos-mesh get podchaos
```

Then:

- sign in as `viewer` and confirm execute is disabled
- sign in as `admin`, enable disruptive actions, execute the drill, and confirm a new `PodChaos` object exists
- sign in as `operator` and confirm execution works while the safety flag remains enabled
