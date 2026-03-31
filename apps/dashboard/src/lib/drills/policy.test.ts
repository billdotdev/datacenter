import { describe, expect, it } from "vitest";

import {
  canExecuteDrill,
  isAllowedNodeTarget,
  isAllowedWorkloadTarget,
  isTargetCompatibleWithDrill,
} from "./policy";
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
  targetSummary: "dashboard/dashboard",
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

const workloadDrill: DrillDefinitionRecord = {
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

const nodeDrill: DrillDefinitionRecord = {
  blastRadiusSummary: "Drain an exact node.",
  enabled: true,
  id: "drill-node-cordon-drain",
  key: "node-cordon-drain",
  kind: "node_cordon_drain",
  name: "Cordon And Drain Node",
  requiresDisruptiveActions: true,
  targetType: "node",
  template: {
    deleteEmptyDirData: false,
    executor: "nodeDrain",
    ignoreDaemonSets: true,
  },
};

describe("canExecuteDrill", () => {
  it("denies viewers", () => {
    expect(
      canExecuteDrill({
        disruptiveActionsEnabled: true,
        drill: workloadDrill,
        role: "viewer",
        target: workloadTarget,
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
        drill: workloadDrill,
        role: "operator",
        target: workloadTarget,
      }),
    ).toEqual({
      allow: false,
      reason: "disruptive-actions-disabled",
    });
  });

  it("denies incompatible targets", () => {
    expect(
      canExecuteDrill({
        disruptiveActionsEnabled: true,
        drill: nodeDrill,
        role: "operator",
        target: workloadTarget,
      }),
    ).toEqual({
      allow: false,
      reason: "incompatible-target",
    });
  });
});

describe("allowlisted targets", () => {
  it("allows only exact workload targets", () => {
    expect(isAllowedWorkloadTarget(workloadTarget)).toBe(true);
    expect(
      isAllowedWorkloadTarget({
        ...workloadTarget,
        namespace: "observability",
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
  it("requires service-backed workload targets for traffic spike", () => {
    expect(isTargetCompatibleWithDrill(trafficSpikeDrill, workloadTarget)).toBe(
      true,
    );
    expect(
      isTargetCompatibleWithDrill(trafficSpikeDrill, {
        ...workloadTarget,
        key: "datacenter-postgres",
        serviceName: null,
      }),
    ).toBe(false);
  });

  it("accepts exact node target for node drills", () => {
    expect(isTargetCompatibleWithDrill(nodeDrill, nodeTarget)).toBe(true);
  });
});
