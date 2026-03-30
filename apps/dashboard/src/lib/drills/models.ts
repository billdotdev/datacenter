export type DrillKind = "pod_delete";

export type DrillRunStatus = "pending" | "running" | "succeeded" | "failed";

export type DrillDefinitionRecord = {
  blastRadiusSummary: string;
  chaosTemplate: {
    action: "pod-kill";
    mode: "one";
  };
  enabled: boolean;
  id: string;
  key: string;
  kind: DrillKind;
  name: string;
  requiresDisruptiveActions: boolean;
  targetNamespace: string;
  targetSelector: Record<string, string>;
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

export type DrillCardView = {
  blastRadiusSummary: string;
  enabled: boolean;
  key: string;
  kind: DrillKind;
  name: string;
  targetSummary: string;
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
