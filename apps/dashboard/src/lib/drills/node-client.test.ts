import { describe, expect, it } from "vitest";

import {
  buildCordonPatch,
  buildEviction,
  selectDrainablePods,
} from "./node-client";

describe("buildCordonPatch", () => {
  it("marks the node unschedulable", () => {
    expect(buildCordonPatch()).toEqual({
      spec: {
        unschedulable: true,
      },
    });
  });
});

describe("buildEviction", () => {
  it("creates a policy/v1 eviction object", () => {
    expect(
      buildEviction({
        name: "dashboard-123",
        namespace: "dashboard",
      }),
    ).toEqual({
      apiVersion: "policy/v1",
      kind: "Eviction",
      metadata: {
        name: "dashboard-123",
        namespace: "dashboard",
      },
    });
  });
});

describe("selectDrainablePods", () => {
  it("skips daemonset, mirror, and finished pods", () => {
    expect(
      selectDrainablePods([
        {
          metadata: {
            name: "daemon",
            namespace: "kube-system",
            ownerReferences: [{ kind: "DaemonSet" }],
          },
          status: { phase: "Running" },
        },
        {
          metadata: {
            annotations: { "kubernetes.io/config.mirror": "mirror" },
            name: "mirror",
            namespace: "kube-system",
          },
          status: { phase: "Running" },
        },
        {
          metadata: { name: "done", namespace: "default" },
          status: { phase: "Succeeded" },
        },
        {
          metadata: { name: "dashboard-123", namespace: "dashboard" },
          status: { phase: "Running" },
        },
      ]),
    ).toEqual([
      {
        name: "dashboard-123",
        namespace: "dashboard",
      },
    ]);
  });
});
