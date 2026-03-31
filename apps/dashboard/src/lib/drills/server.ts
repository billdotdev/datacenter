import { eq } from "drizzle-orm";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

import { db } from "#/db";
import { drillDefinition, drillTarget } from "#/db/schema";
import { auth } from "#/lib/auth";
import type { AppRole } from "#/lib/auth-flow";
import { formatTargetSummary } from "#/lib/drills/targets";

import {
  executeDrillAction,
  readDisruptiveActionsEnabled,
  readDrillCatalogData,
  setDisruptiveActions,
} from "./service";

type ExecuteDrillInput = {
  drillKey: string;
  targetKey: string;
};

type SetDisruptiveActionsInput = {
  enabled: boolean;
};

function coerceRole(role: string | null | undefined): AppRole | null {
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

    const targetRow = await db.query.drillTarget.findFirst({
      where: eq(drillTarget.key, data.targetKey),
    });

    if (!targetRow) {
      throw new Error("Unknown target");
    }

    return executeDrillAction({
      drill: {
        blastRadiusSummary: row.blastRadiusSummary,
        enabled: row.enabled,
        id: row.id,
        key: row.key,
        kind: row.kind as
          | "node_cordon_drain"
          | "network_error"
          | "network_latency"
          | "pod_delete"
          | "traffic_spike",
        name: row.name,
        requiresDisruptiveActions: row.requiresDisruptiveActions,
        targetType: row.targetType as "node" | "workload",
        template: row.template as
          | {
              action: "pod-kill";
              executor: "podChaos";
              mode: "one";
            }
          | {
              action: "delay";
              correlation: string;
              executor: "networkChaos";
              latency: string;
            }
          | {
              action: "loss";
              correlation: string;
              executor: "networkChaos";
              loss: string;
            }
          | {
              deleteEmptyDirData: boolean;
              executor: "nodeDrain";
              ignoreDaemonSets: boolean;
            }
          | {
              durationSeconds: number;
              executor: "loadJob";
              requestsPerSecond: number;
            },
      },
      disruptiveActionsEnabled,
      role: session.role,
      target:
        targetRow.kind === "node"
          ? {
              blastRadiusSummary: targetRow.blastRadiusSummary,
              enabled: targetRow.enabled,
              id: targetRow.id,
              key: targetRow.key,
              kind: "node",
              name: targetRow.name,
              namespace: null,
              nodeName: targetRow.nodeName ?? targetRow.key,
              selector: null,
              serviceName: null,
              targetSummary: `node/${targetRow.nodeName ?? targetRow.key}`,
            }
          : {
              blastRadiusSummary: targetRow.blastRadiusSummary,
              enabled: targetRow.enabled,
              id: targetRow.id,
              key: targetRow.key,
              kind: "workload",
              name: targetRow.name,
              namespace: targetRow.namespace ?? "",
              nodeName: null,
              selector: (targetRow.selector ?? {}) as Record<string, string>,
              serviceName: targetRow.serviceName,
              targetSummary: formatTargetSummary({
                blastRadiusSummary: targetRow.blastRadiusSummary,
                enabled: targetRow.enabled,
                id: targetRow.id,
                key: targetRow.key,
                kind: "workload",
                name: targetRow.name,
                namespace: targetRow.namespace ?? "",
                nodeName: null,
                selector: (targetRow.selector ?? {}) as Record<string, string>,
                serviceName: targetRow.serviceName,
                targetSummary: `${targetRow.namespace}/${targetRow.key}`,
              }),
            },
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

    return { ok: true };
  });
