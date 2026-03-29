import { describe, expect, it } from "vitest";

import { readClusterSnapshotFromSources } from "./read-cluster-snapshot";

describe("readClusterSnapshotFromSources", () => {
  it("normalizes nodes and Argo applications from Kubernetes responses", async () => {
    const snapshot = await readClusterSnapshotFromSources({
      clusterName: "datacenter",
      listApplications: async () => [
        {
          metadata: { name: "dashboard", namespace: "argocd" },
          spec: { source: { targetRevision: "main" } },
          status: { health: { status: "Healthy" }, sync: { status: "Synced" } },
        },
      ],
      listNodes: async () => [
        {
          metadata: {
            creationTimestamp: "2026-03-29T19:00:00.000Z",
            labels: {
              "node-role.kubernetes.io/control-plane": "true",
            },
            name: "cp-1",
          },
          status: {
            addresses: [{ address: "10.100.0.111", type: "InternalIP" }],
            conditions: [{ status: "True", type: "Ready" }],
            nodeInfo: { kubeletVersion: "v1.34.5+k3s1" },
          },
        },
      ],
      now: () => new Date("2026-03-29T21:00:00.000Z"),
    });

    expect(snapshot.summary).toMatchObject({
      applicationCount: 1,
      clusterName: "datacenter",
      healthyApplicationCount: 1,
      readyNodeCount: 1,
      totalNodeCount: 1,
    });

    expect(snapshot.nodes).toEqual([
      {
        age: "2h",
        internalIP: "10.100.0.111",
        kubeletVersion: "v1.34.5+k3s1",
        name: "cp-1",
        ready: true,
        roles: ["control-plane"],
      },
    ]);
  });
});
