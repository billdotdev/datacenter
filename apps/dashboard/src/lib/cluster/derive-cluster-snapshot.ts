import type {
  ArgoApplicationView,
  ClusterSnapshotView,
  NodeView,
} from "./models";

export type { ArgoApplicationView, NodeView } from "./models";

type DeriveClusterSnapshotInput = {
  applications: ArgoApplicationView[];
  clusterName: string;
  nodes: NodeView[];
  refreshedAt: string;
};

export function deriveClusterSnapshot({
  applications,
  clusterName,
  nodes,
  refreshedAt,
}: DeriveClusterSnapshotInput): ClusterSnapshotView {
  const readyNodeCount = nodes.filter((node) => node.ready).length;
  const syncedApplicationCount = applications.filter(
    (application) => application.syncStatus === "Synced",
  ).length;
  const healthyApplicationCount = applications.filter(
    (application) => application.healthStatus === "Healthy",
  ).length;

  return {
    applications,
    nodes,
    summary: {
      applicationCount: applications.length,
      clusterName,
      degradedApplicationCount:
        applications.length - healthyApplicationCount,
      healthyApplicationCount,
      lastRefreshedAt: refreshedAt,
      notReadyNodeCount: nodes.length - readyNodeCount,
      readyNodeCount,
      syncedApplicationCount,
      totalNodeCount: nodes.length,
    },
  };
}
