import { and, desc, eq } from "drizzle-orm";

import { db } from "#/db";
import {
  appConfig,
  auditLog,
  drillDefinition,
  drillRun,
  drillTarget,
  user,
} from "#/db/schema";
import type { AppRole } from "#/lib/auth-flow";

import {
  buildNetworkChaosManifest,
  buildPodChaosManifest,
  createNetworkChaos,
  createPodChaos,
  getNetworkChaos,
  getPodChaos,
} from "./chaos-client";
import { buildLoadJobManifest, createLoadJob } from "./load-job-client";
import type {
  DrillCatalogView,
  DrillDefinitionRecord,
  DrillRunStatus,
  DrillTargetRecord,
} from "./models";
import { canExecuteDrill, isTargetCompatibleWithDrill } from "./policy";
import { cordonAndDrainNode } from "./node-client";
import { formatTargetSummary } from "./targets";

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
    enabled: row.enabled,
    id: row.id,
    key: row.key,
    kind: row.kind as DrillDefinitionRecord["kind"],
    name: row.name,
    requiresDisruptiveActions: row.requiresDisruptiveActions,
    targetType: row.targetType as DrillDefinitionRecord["targetType"],
    template: row.template as DrillDefinitionRecord["template"],
  };
}

function toTargetRecord(row: typeof drillTarget.$inferSelect): DrillTargetRecord {
  if (row.kind === "node") {
    return {
      blastRadiusSummary: row.blastRadiusSummary,
      enabled: row.enabled,
      id: row.id,
      key: row.key,
      kind: "node",
      name: row.name,
      namespace: null,
      nodeName: row.nodeName ?? row.key,
      selector: null,
      serviceName: null,
      targetSummary: `node/${row.nodeName ?? row.key}`,
    };
  }

  return {
    blastRadiusSummary: row.blastRadiusSummary,
    enabled: row.enabled,
    id: row.id,
    key: row.key,
    kind: "workload",
    name: row.name,
    namespace: row.namespace ?? "",
    nodeName: null,
    selector: (row.selector ?? {}) as Record<string, string>,
    serviceName: row.serviceName,
    targetSummary: `${row.namespace}/${row.key}`,
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
  listTargets?: () => Promise<DrillTargetRecord[]>;
  listRuns?: () => Promise<DrillCatalogView["runs"]>;
  readDisruptiveActionsEnabled?: () => Promise<boolean>;
  reconcileRunStatuses?: () => Promise<void>;
}) {
  await (input?.reconcileRunStatuses ?? reconcileRunStatuses)();

  const [definitions, targets, runs, disruptiveActionsEnabled] = await Promise.all([
    (input?.listDefinitions ?? listDrillDefinitions)(),
    (input?.listTargets ?? listDrillTargets)(),
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
      targets: targets
        .filter((target) => isTargetCompatibleWithDrill(definition, target))
        .map((target) => ({
          blastRadiusSummary: target.blastRadiusSummary,
          key: target.key,
          name: target.name,
          targetSummary: target.targetSummary,
        })),
    })),
    runs,
  } satisfies DrillCatalogView;
}

export async function executeDrillAction(input: {
  cordonAndDrainNode?: typeof cordonAndDrainNode;
  createLoadJob?: typeof createLoadJob;
  createNetworkChaos?: typeof createNetworkChaos;
  createPodChaos?: typeof createPodChaos;
  drill: DrillDefinitionRecord;
  disruptiveActionsEnabled: boolean;
  insertAuditEvent?: typeof insertAuditEvent;
  insertRun?: typeof insertRun;
  now?: () => Date;
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
    await (input.insertAuditEvent ?? insertAuditEvent)({
      actorUserId: input.user.id,
      eventType: "drill.execution.denied",
      payload: {
        drillKey: input.drill.key,
        reason: decision.reason,
        targetKey: input.target.key,
        targetSummary: input.target.targetSummary,
      },
      subjectId: input.drill.id,
      subjectType: "drill_definition",
    });

    throw new Error(decision.reason);
  }

  const requestedAt = (input.now ?? (() => new Date()))().toISOString();
  const run = await (input.insertRun ?? insertRun)({
    drillDefinitionId: input.drill.id,
    drillKey: input.drill.key,
    drillTargetId: input.target.id,
    requestedAt,
    requestedByUserId: input.user.id,
    status: "pending",
    targetKey: input.target.key,
    targetSummary: input.target.targetSummary,
  });

  await (input.insertAuditEvent ?? insertAuditEvent)({
    actorUserId: input.user.id,
    eventType: "drill.execution.requested",
    payload: {
      drillKey: input.drill.key,
      runId: run.id,
      targetKey: input.target.key,
      targetSummary: input.target.targetSummary,
    },
    subjectId: run.id,
    subjectType: "drill_run",
  });

  try {
    if (input.drill.template.executor === "podChaos") {
      const manifest = buildPodChaosManifest({
        drill: input.drill,
        requestedByUserId: input.user.id,
        runId: run.id,
        target: input.target,
      });

      await (input.createPodChaos ?? createPodChaos)(manifest);

      await (input.updateRun ?? updateRun)(run.id, {
        chaosName: manifest.metadata.name,
        chaosNamespace: manifest.metadata.namespace,
        startedAt: requestedAt,
        status: "running",
      });
    } else if (input.drill.template.executor === "networkChaos") {
      const manifest = buildNetworkChaosManifest({
        drill: input.drill,
        requestedByUserId: input.user.id,
        runId: run.id,
        target: input.target,
      });

      await (input.createNetworkChaos ?? createNetworkChaos)(manifest);

      await (input.updateRun ?? updateRun)(run.id, {
        chaosName: manifest.metadata.name,
        chaosNamespace: manifest.metadata.namespace,
        startedAt: requestedAt,
        status: "running",
      });
    } else if (input.drill.template.executor === "loadJob") {
      const manifest = buildLoadJobManifest({
        drill: input.drill,
        runId: run.id,
        target: input.target,
      });

      await (input.createLoadJob ?? createLoadJob)(manifest);

      await (input.updateRun ?? updateRun)(run.id, {
        chaosName: manifest.metadata?.name ?? null,
        chaosNamespace: manifest.metadata?.namespace ?? null,
        startedAt: requestedAt,
        status: "running",
      });
    } else {
      await (input.cordonAndDrainNode ?? cordonAndDrainNode)({
        nodeName: input.target.kind === "node" ? input.target.nodeName : input.target.key,
      });

      await (input.updateRun ?? updateRun)(run.id, {
        finishedAt: requestedAt,
        startedAt: requestedAt,
        status: "succeeded",
      });
    }

    await (input.insertAuditEvent ?? insertAuditEvent)({
      actorUserId: input.user.id,
      eventType: "drill.execution.created",
      payload: {
        drillKey: input.drill.key,
        runId: run.id,
        targetKey: input.target.key,
        targetSummary: input.target.targetSummary,
      },
      subjectId: run.id,
      subjectType: "drill_run",
    });

    return {
      id: run.id,
      status: input.drill.template.executor === "nodeDrain" ? ("succeeded" as const) : ("running" as const),
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
        targetKey: input.target.key,
        targetSummary: input.target.targetSummary,
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

async function listDrillTargets(): Promise<DrillTargetRecord[]> {
  const rows = await db.select().from(drillTarget);
  return rows.map(toTargetRecord);
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
  drillKey: string;
  drillTargetId: string;
  requestedAt: string;
  requestedByUserId: string;
  status: string;
  targetKey: string;
  targetSummary: string;
}) {
  const id = createId("run");

  await db.insert(drillRun).values({
    drillDefinitionId: input.drillDefinitionId,
    drillKey: input.drillKey,
    drillTargetId: input.drillTargetId,
    id,
    requestedAt: new Date(input.requestedAt),
    requestedByUserId: input.requestedByUserId,
    status: input.status,
    targetKey: input.targetKey,
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

      const object = (row.drillKey === "network-latency" || row.drillKey === "network-error"
        ? await getNetworkChaos(row.chaosName)
        : await getPodChaos(row.chaosName)) as PodChaosLike;
      const nextStatus = reconcileRunStatusFromObject(object);

      if (nextStatus.status === "succeeded") {
        await updateRun(row.id, {
          finishedAt: new Date().toISOString(),
          status: "succeeded",
        });
        await insertAuditEvent({
          actorUserId: row.requestedByUserId,
          eventType: "drill.execution.completed",
          payload: { drillKey: row.drillKey, runId: row.id, targetKey: row.targetKey, targetSummary: row.targetSummary },
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
          payload: { drillKey: row.drillKey, runId: row.id, targetKey: row.targetKey, targetSummary: row.targetSummary },
          subjectId: row.id,
          subjectType: "drill_run",
        });
      }
    }),
  );
}
