import { describe, expect, it, vi } from "vitest";

import {
  executeDrillAction,
  readDrillCatalogData,
  reconcileRunStatusFromObject,
  setDisruptiveActions,
} from "./service";

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
      readDisruptiveActionsEnabled: async () => false,
      reconcileRunStatuses: async () => undefined,
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

describe("reconcileRunStatusFromObject", () => {
  it("marks a run succeeded when PodChaos has injected faults without duration", () => {
    expect(
      reconcileRunStatusFromObject({
        kind: "PodChaos",
        status: {
          conditions: [
            { status: "False", type: "Paused" },
            { status: "True", type: "Selected" },
            { status: "True", type: "AllInjected" },
            { status: "False", type: "AllRecovered" },
          ],
          experiment: {
            desiredPhase: "Run",
          },
        },
      }),
    ).toEqual({
      errorMessage: null,
      status: "succeeded",
    });
  });

  it("marks a run failed when PodChaos reports failed phase", () => {
    expect(
      reconcileRunStatusFromObject({
        kind: "PodChaos",
        status: {
          experiment: {
            desiredPhase: "Failed",
          },
        },
      }),
    ).toEqual({
      errorMessage: "Chaos Mesh marked the run as failed",
      status: "failed",
    });
  });
});
