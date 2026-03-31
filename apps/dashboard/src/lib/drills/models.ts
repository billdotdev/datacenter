export type DrillKind =
  | "pod_delete"
  | "traffic_spike"
  | "network_latency"
  | "network_error"
  | "node_cordon_drain";

export type DrillTargetKind = "workload" | "node";

export type DrillRunStatus = "pending" | "running" | "succeeded" | "failed";

export type PodChaosTemplate = {
  action: "pod-kill";
  executor: "podChaos";
  mode: "one";
};

export type NetworkChaosTemplate =
  | {
      action: "delay";
      correlation: string;
      executor: "networkChaos";
      latency: string;
    }
  | {
      action: "loss";
      correlation: string;
      executor: "networkChaos";
      loss: string;
    };

export type LoadJobTemplate = {
  durationSeconds: number;
  executor: "loadJob";
  requestsPerSecond: number;
};

export type NodeDrainTemplate = {
  deleteEmptyDirData: boolean;
  executor: "nodeDrain";
  ignoreDaemonSets: boolean;
};

export type DrillTemplate =
  | PodChaosTemplate
  | NetworkChaosTemplate
  | LoadJobTemplate
  | NodeDrainTemplate;

export type DrillDefinitionRecord = {
  blastRadiusSummary: string;
  enabled: boolean;
  id: string;
  key: string;
  kind: DrillKind;
  name: string;
  requiresDisruptiveActions: boolean;
  targetType: DrillTargetKind;
  template: DrillTemplate;
};

export type DrillRunView = {
  chaosName: string | null;
  errorMessage: string | null;
  finishedAt: string | null;
  id: string;
  requestedAt: string;
  requestedByName: string;
  status: DrillRunStatus;
  targetSummary: string;
};

type DrillTargetBase = {
  blastRadiusSummary: string;
  enabled: boolean;
  id: string;
  key: string;
  name: string;
  targetSummary: string;
};

export type WorkloadDrillTargetRecord = DrillTargetBase & {
  kind: "workload";
  namespace: string;
  nodeName: null;
  selector: Record<string, string>;
  serviceName: string | null;
};

export type NodeDrillTargetRecord = DrillTargetBase & {
  kind: "node";
  namespace: null;
  nodeName: string;
  selector: null;
  serviceName: null;
};

export type DrillTargetRecord =
  | WorkloadDrillTargetRecord
  | NodeDrillTargetRecord;

export type DrillTargetView = Pick<
  DrillTargetRecord,
  "blastRadiusSummary" | "key" | "name" | "targetSummary"
>;

export type DrillCardView = {
  blastRadiusSummary: string;
  enabled: boolean;
  key: string;
  kind: DrillKind;
  name: string;
  targets: DrillTargetView[];
};

export type DrillCatalogView = {
  disruptiveActionsEnabled: boolean;
  drills: DrillCardView[];
  runs: DrillRunView[];
};

export type PodChaosManifest = {
  apiVersion: "chaos-mesh.org/v1alpha1";
  kind: "PodChaos";
  metadata: {
    annotations: Record<string, string>;
    labels: Record<string, string>;
    name: string;
    namespace: "chaos-mesh";
  };
  spec: {
    action: "pod-kill";
    mode: "one";
    selector: {
      labelSelectors: Record<string, string>;
      namespaces: [string];
    };
  };
};

export type NetworkChaosManifest = {
  apiVersion: "chaos-mesh.org/v1alpha1";
  kind: "NetworkChaos";
  metadata: {
    annotations: Record<string, string>;
    labels: Record<string, string>;
    name: string;
    namespace: "chaos-mesh";
  };
  spec:
    | {
        action: "delay";
        delay: {
          correlation: string;
          latency: string;
        };
        mode: "all";
        selector: {
          labelSelectors: Record<string, string>;
          namespaces: [string];
        };
      }
    | {
        action: "loss";
        loss: {
          correlation: string;
          loss: string;
        };
        mode: "all";
        selector: {
          labelSelectors: Record<string, string>;
          namespaces: [string];
        };
      };
};
