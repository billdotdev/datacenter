import { describe, expect, it } from "vitest";

import {
  deriveClusterSnapshot,
  type ArgoApplicationView,
  type NodeView,
} from "./derive-cluster-snapshot";

describe("deriveClusterSnapshot", () => {
  it("derives summary counts from nodes and Argo applications", () => {
    const nodes: NodeView[] = [
      {
        age: "2h",
        internalIP: "10.100.0.111",
        kubeletVersion: "v1.34.5+k3s1",
        name: "cp-1",
        ready: true,
        roles: ["control-plane"],
      },
      {
        age: "2h",
        internalIP: "10.100.0.112",
        kubeletVersion: "v1.34.5+k3s1",
        name: "cp-2",
        ready: false,
        roles: ["control-plane"],
      },
    ];

    const applications: ArgoApplicationView[] = [
      {
        healthStatus: "Healthy",
        name: "dashboard",
        namespace: "argocd",
        syncStatus: "Synced",
        targetRevision: "main",
      },
      {
        healthStatus: "Progressing",
        name: "chaos-mesh",
        namespace: "argocd",
        syncStatus: "OutOfSync",
        targetRevision: "main",
      },
    ];

    expect(
      deriveClusterSnapshot({
        applications,
        clusterName: "datacenter",
        nodes,
        refreshedAt: "2026-03-29T21:00:00.000Z",
      }),
    ).toEqual({
      applications,
      nodes,
      summary: {
        applicationCount: 2,
        clusterName: "datacenter",
        degradedApplicationCount: 1,
        healthyApplicationCount: 1,
        lastRefreshedAt: "2026-03-29T21:00:00.000Z",
        notReadyNodeCount: 1,
        readyNodeCount: 1,
        syncedApplicationCount: 1,
        totalNodeCount: 2,
      },
    });
  });
});
