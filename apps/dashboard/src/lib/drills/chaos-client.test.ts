import { describe, expect, it } from "vitest";

import { buildNetworkChaosManifest, buildPodChaosManifest } from "./chaos-client";
import type { DrillDefinitionRecord, DrillTargetRecord } from "./models";

describe("buildPodChaosManifest", () => {
  it("materializes a namespaced pod-kill manifest for dashboard pods", () => {
    const drill: DrillDefinitionRecord = {
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
    const target: DrillTargetRecord = {
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

    expect(
      buildPodChaosManifest({
        drill,
        requestedByUserId: "user-123",
        runId: "run-123",
        target,
      }),
    ).toMatchObject({
      apiVersion: "chaos-mesh.org/v1alpha1",
      kind: "PodChaos",
      metadata: {
        labels: {
          "app.kubernetes.io/managed-by": "datacenter-dashboard",
          "datacenter.dev/drill-key": "pod-delete",
          "datacenter.dev/target-key": "dashboard",
          "datacenter.dev/run-id": "run-123",
        },
        name: "pod-delete-run-123",
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

describe("buildNetworkChaosManifest", () => {
  it("materializes a delay manifest for an allowlisted workload", () => {
    const drill: DrillDefinitionRecord = {
      blastRadiusSummary: "Inject latency into an approved workload.",
      enabled: true,
      id: "drill-network-latency",
      key: "network-latency",
      kind: "network_latency",
      name: "Inject Network Latency",
      requiresDisruptiveActions: true,
      targetType: "workload",
      template: {
        action: "delay",
        correlation: "100",
        executor: "networkChaos",
        latency: "120ms",
      },
    };
    const target: DrillTargetRecord = {
      blastRadiusSummary: "Affects Loki only.",
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

    expect(
      buildNetworkChaosManifest({
        drill,
        requestedByUserId: "user-123",
        runId: "run-456",
        target,
      }),
    ).toMatchObject({
      apiVersion: "chaos-mesh.org/v1alpha1",
      kind: "NetworkChaos",
      metadata: {
        name: "network-latency-run-456",
        namespace: "chaos-mesh",
      },
      spec: {
        action: "delay",
        delay: {
          correlation: "100",
          latency: "120ms",
        },
        mode: "all",
        selector: {
          labelSelectors: {
            "app.kubernetes.io/component": "single-binary",
            "app.kubernetes.io/instance": "loki",
          },
          namespaces: ["observability"],
        },
      },
    });
  });
});
