import { eq } from "drizzle-orm";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

import { db } from "#/db";
import { drillDefinition } from "#/db/schema";
import { auth } from "#/lib/auth";
import type { AppRole } from "#/lib/auth-flow";

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

    return { ok: true };
  });
