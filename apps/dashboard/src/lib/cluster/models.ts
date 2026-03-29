export type NodeView = {
  age: string;
  internalIP: string | null;
  kubeletVersion: string;
  name: string;
  ready: boolean;
  roles: string[];
};

export type ArgoApplicationView = {
  healthStatus: string;
  name: string;
  namespace: string;
  syncStatus: string;
  targetRevision: string;
};

export type ClusterSummaryView = {
  applicationCount: number;
  clusterName: string;
  degradedApplicationCount: number;
  healthyApplicationCount: number;
  lastRefreshedAt: string;
  notReadyNodeCount: number;
  readyNodeCount: number;
  syncedApplicationCount: number;
  totalNodeCount: number;
};

export type ClusterSnapshotView = {
  applications: ArgoApplicationView[];
  nodes: NodeView[];
  summary: ClusterSummaryView;
};
