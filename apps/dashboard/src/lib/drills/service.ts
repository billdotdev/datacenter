import { and, desc, eq } from "drizzle-orm";

import { db } from "#/db";
import {
  appConfig,
  auditLog,
  drillDefinition,
  drillRun,
  user,
} from "#/db/schema";
import type { AppRole } from "#/lib/auth-flow";

import { buildPodChaosManifest, createPodChaos, getPodChaos } from "./chaos-client";
import type {
  DrillCatalogView,
  DrillDefinitionRecord,
  DrillRunStatus,
} from "./models";
import { canExecuteDrill } from "./policy";

function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function toRunStatus(value: string): DrillRunStatus {
  if (
    value === "pending" ||
    value === "running" ||
    value === "succeeded" ||
    value === "failed"
  ) {
    return value;
  }

  return "pending";
}

function toDefinitionRecord(row: typeof drillDefinition.$inferSelect): DrillDefinitionRecord {
  return {
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
  };
}

type PodChaosLike = {
  status?: {
    conditions?: Array<{
      status?: string;
      type?: string;
    }>;
    experiment?: {
      desiredPhase?: string;
    };
  };
};

export function reconcileRunStatusFromObject(object: PodChaosLike): {
  errorMessage: string | null;
  status: "failed" | "running" | "succeeded";
} {
  const desiredPhase = object.status?.experiment?.desiredPhase;
  const conditions = object.status?.conditions ?? [];
  const hasCondition = (type: string, status: string) =>
    conditions.some(
      (condition) => condition.type === type && condition.status === status,
    );

  if (desiredPhase === "Failed") {
    return {
      errorMessage: "Chaos Mesh marked the run as failed",
      status: "failed",
    };
  }

  if (desiredPhase === "Finished" || hasCondition("AllRecovered", "True")) {
    return {
      errorMessage: null,
      status: "succeeded",
    };
  }

  // One-shot PodChaos without duration stays in Run after successful injection.
  if (desiredPhase === "Run" && hasCondition("AllInjected", "True")) {
    return {
      errorMessage: null,
      status: "succeeded",
    };
  }

  return {
    errorMessage: null,
    status: "running",
  };
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
      payload: {
        drillKey: input.drill.key,
        reason: decision.reason,
      },
      subjectId: input.drill.id,
      subjectType: "drill_definition",
    });

    throw new Error(decision.reason);
  }

  const requestedAt = (input.now ?? (() => new Date()))().toISOString();
  const run = await (input.insertRun ?? insertRun)({
    drillDefinitionId: input.drill.id,
    requestedAt,
    requestedByUserId: input.user.id,
    status: "pending",
    targetSummary: `${input.drill.targetNamespace}/${input.drill.targetSelector["app.kubernetes.io/name"]}`,
  });

  await (input.insertAuditEvent ?? insertAuditEvent)({
    actorUserId: input.user.id,
    eventType: "drill.execution.requested",
    payload: {
      drillKey: input.drill.key,
      runId: run.id,
    },
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
      payload: {
        drillKey: input.drill.key,
        runId: run.id,
      },
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
      payload: {
        drillKey: input.drill.key,
        message,
        runId: run.id,
      },
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
    payload: {
      enabled: input.enabled,
    },
    subjectId: "disruptive_actions_enabled",
    subjectType: "app_config",
  });
}

async function listDrillDefinitions(): Promise<DrillDefinitionRecord[]> {
  const rows = await db.select().from(drillDefinition);
  return rows.map(toDefinitionRecord);
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

  return {
    id,
    status: input.status,
  };
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
      and(eq(drillRun.status, "running"), eq(drillRun.chaosNamespace, "chaos-mesh")),
    );

  await Promise.all(
    runningRows.map(async (row) => {
      if (!row.chaosName) {
        return;
      }

      const object = (await getPodChaos(row.chaosName)) as PodChaosLike;
      const nextStatus = reconcileRunStatusFromObject(object);

      if (nextStatus.status === "succeeded") {
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
      } else if (nextStatus.status === "failed") {
        await updateRun(row.id, {
          errorMessage: nextStatus.errorMessage ?? "Chaos Mesh marked the run as failed",
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
