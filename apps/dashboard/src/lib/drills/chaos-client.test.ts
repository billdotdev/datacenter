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
