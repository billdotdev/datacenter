// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ClusterOverview } from "./cluster-overview";

describe("ClusterOverview", () => {
  it("renders summary, nodes, and Argo applications", () => {
    render(
      <ClusterOverview
        cluster={{
          applications: [
            {
              healthStatus: "Healthy",
              name: "dashboard",
              namespace: "argocd",
              syncStatus: "Synced",
              targetRevision: "main",
            },
          ],
          nodes: [
            {
              age: "2h",
              internalIP: "10.100.0.111",
              kubeletVersion: "v1.34.5+k3s1",
              name: "cp-1",
              ready: true,
              roles: ["control-plane"],
            },
          ],
          summary: {
            applicationCount: 1,
            clusterName: "datacenter",
            degradedApplicationCount: 0,
            healthyApplicationCount: 1,
            lastRefreshedAt: "2026-03-29T21:00:00.000Z",
            notReadyNodeCount: 0,
            readyNodeCount: 1,
            syncedApplicationCount: 1,
            totalNodeCount: 1,
          },
        }}
        error={null}
        isRefreshing={false}
      />,
    );

    expect(screen.getByText("Cluster Summary")).toBeTruthy();
    expect(screen.getByText("cp-1")).toBeTruthy();
    expect(screen.getByText("dashboard")).toBeTruthy();
    expect(screen.getByText("Ready Nodes")).toBeTruthy();
  });
});
