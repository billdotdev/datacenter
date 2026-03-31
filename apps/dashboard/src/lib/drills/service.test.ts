import { describe, expect, it, vi } from "vitest";

import {
  executeDrillAction,
  readDrillCatalogData,
  reconcileRunStatusFromObject,
  setDisruptiveActions,
} from "./service";

describe("readDrillCatalogData", () => {
  it("returns drill cards with only compatible targets", async () => {
    const result = await readDrillCatalogData({
      listDefinitions: async () => [
        {
          blastRadiusSummary: "Restarts one approved workload pod.",
          enabled: true,
          id: "drill-pod-delete",
          key: "pod-delete",
          kind: "pod_delete",
          name: "Delete One Pod",
          requiresDisruptiveActions: true,
          targetType: "workload",
          template: { action: "pod-kill", executor: "podChaos", mode: "one" },
        },
        {
          blastRadiusSummary: "Generate fixed HTTP load.",
          enabled: true,
          id: "drill-traffic-spike",
          key: "traffic-spike",
          kind: "traffic_spike",
          name: "Traffic Spike",
          requiresDisruptiveActions: true,
          targetType: "workload",
          template: {
            durationSeconds: 60,
            executor: "loadJob",
            requestsPerSecond: 25,
          },
        },
      ],
      listTargets: async () => [
        {
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
          targetSummary: "dashboard/dashboard",
        },
        {
          blastRadiusSummary: "Affects the PostgreSQL cluster pods only.",
          enabled: true,
          id: "target-datacenter-postgres",
          key: "datacenter-postgres",
          kind: "workload",
          name: "Datacenter Postgres",
          namespace: "database",
          nodeName: null,
          selector: { "cnpg.io/cluster": "datacenter-postgres" },
          serviceName: null,
          targetSummary: "database/datacenter-postgres",
        },
      ],
      listRuns: async () => [],
      readDisruptiveActionsEnabled: async () => false,
      reconcileRunStatuses: async () => undefined,
    });

    expect(result.disruptiveActionsEnabled).toBe(false);
    expect(result.drills[0]).toMatchObject({
      key: "pod-delete",
      targets: [{ key: "dashboard" }, { key: "datacenter-postgres" }],
    });
    expect(result.drills[1]).toMatchObject({
      key: "traffic-spike",
      targets: [{ key: "dashboard" }],
    });
  });
});

describe("executeDrillAction", () => {
  it("creates a run and PodChaos for an operator-selected target", async () => {
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
        blastRadiusSummary: "Restarts one approved workload pod.",
        enabled: true,
        id: "drill-pod-delete",
        key: "pod-delete",
        kind: "pod_delete",
        name: "Delete One Pod",
        requiresDisruptiveActions: true,
        targetType: "workload",
        template: { action: "pod-kill", executor: "podChaos", mode: "one" },
      },
      disruptiveActionsEnabled: true,
      insertAuditEvent,
      insertRun,
      now: () => new Date("2026-03-30T12:00:00.000Z"),
      role: "operator",
      target: {
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
        targetSummary: "dashboard/dashboard",
      },
      updateRun,
      user: { id: "user-123", name: "Op User" },
    });

    expect(result.status).toBe("running");
    expect(createPodChaos).toHaveBeenCalledTimes(1);
    expect(insertAuditEvent).toHaveBeenCalledTimes(2);
    expect(insertRun).toHaveBeenCalledWith(
      expect.objectContaining({
        drillKey: "pod-delete",
        targetKey: "dashboard",
      }),
    );
    expect(updateRun).toHaveBeenCalledWith(
      "run-123",
      expect.objectContaining({
        chaosName: "pod-delete-run-123",
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
