import { describe, expect, it } from "vitest";

import {
  canExecuteDrill,
  isAllowedNodeTarget,
  isAllowedWorkloadTarget,
  isTargetCompatibleWithDrill,
} from "./policy";
import type { DrillDefinitionRecord, DrillTargetRecord } from "./models";

const dashboardTarget: DrillTargetRecord = {
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
};

const lokiTarget: DrillTargetRecord = {
  blastRadiusSummary: "Affects the Loki single-binary workload.",
  enabled: true,
  id: "target-loki",
  key: "loki",
  kind: "workload",
  name: "Loki",
  namespace: "observability",
  nodeName: null,
  selector: {
    "app.kubernetes.io/component": "single-binary",
    "app.kubernetes.io/instance": "loki",
  },
  serviceName: "loki-gateway",
  targetSummary: "observability/loki",
};

const nodeTarget: DrillTargetRecord = {
  blastRadiusSummary: "Affects the exact node cp-3.",
  enabled: true,
  id: "target-cp-3",
  key: "cp-3",
  kind: "node",
  name: "cp-3",
  namespace: null,
  nodeName: "cp-3",
  selector: null,
  serviceName: null,
  targetSummary: "node/cp-3",
};

const podDeleteDrill: DrillDefinitionRecord = {
  blastRadiusSummary: "Restarts one approved workload pod.",
  enabled: true,
  id: "drill-pod-delete",
  key: "pod-delete",
  kind: "pod_delete",
  name: "Delete One Pod",
  requiresDisruptiveActions: true,
  targetType: "workload",
  template: { action: "pod-kill", executor: "podChaos", mode: "one" },
};

const trafficSpikeDrill: DrillDefinitionRecord = {
  blastRadiusSummary: "Generate fixed HTTP load.",
  enabled: true,
  id: "drill-traffic-spike",
  key: "traffic-spike",
  kind: "traffic_spike",
  name: "Traffic Spike",
  requiresDisruptiveActions: true,
  targetType: "workload",
  template: { durationSeconds: 60, executor: "loadJob", requestsPerSecond: 25 },
};

describe("canExecuteDrill", () => {
  it("denies viewers", () => {
    expect(
      canExecuteDrill({
        disruptiveActionsEnabled: true,
        drill: podDeleteDrill,
        role: "viewer",
        target: dashboardTarget,
      }),
    ).toEqual({
      allow: false,
      reason: "forbidden",
    });
  });

  it("denies incompatible targets", () => {
    expect(
      canExecuteDrill({
        disruptiveActionsEnabled: true,
        drill: trafficSpikeDrill,
        role: "operator",
        target: nodeTarget,
      }),
    ).toEqual({
      allow: false,
      reason: "incompatible-target",
    });
  });
});

describe("allowlisted targets", () => {
  it("allows live Loki selector", () => {
    expect(isAllowedWorkloadTarget(lokiTarget)).toBe(true);
  });

  it("rejects wrong Loki selector label set", () => {
    expect(
      isAllowedWorkloadTarget({
        ...lokiTarget,
        selector: {
          "app.kubernetes.io/component": "single-binary",
          "app.kubernetes.io/name": "loki",
        },
      }),
    ).toBe(false);
  });

  it("allows only the exact seeded node target", () => {
    expect(isAllowedNodeTarget(nodeTarget)).toBe(true);
    expect(
      isAllowedNodeTarget({
        ...nodeTarget,
        key: "cp-1",
        nodeName: "cp-1",
      }),
    ).toBe(false);
  });
});

describe("isTargetCompatibleWithDrill", () => {
  it("allows service-backed Loki target for traffic spike", () => {
    expect(isTargetCompatibleWithDrill(trafficSpikeDrill, lokiTarget)).toBe(
      true,
    );
  });
});
