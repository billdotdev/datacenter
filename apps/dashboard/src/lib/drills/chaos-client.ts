import { createKubeClients } from "#/lib/cluster/kube-client";

import type {
  DrillDefinitionRecord,
  DrillTargetRecord,
  NetworkChaosManifest,
  PodChaosManifest,
} from "./models";

export function buildPodChaosManifest(input: {
  drill: DrillDefinitionRecord;
  requestedByUserId: string;
  runId: string;
  target: DrillTargetRecord;
}): PodChaosManifest {
  if (
    input.target.kind !== "workload" ||
    input.drill.template.executor !== "podChaos"
  ) {
    throw new Error("Invalid pod chaos input");
  }

  return {
    apiVersion: "chaos-mesh.org/v1alpha1",
    kind: "PodChaos",
    metadata: {
      annotations: {
        "datacenter.dev/requested-by": input.requestedByUserId,
      },
      labels: {
        "app.kubernetes.io/managed-by": "datacenter-dashboard",
        "datacenter.dev/drill-key": input.drill.key,
        "datacenter.dev/target-key": input.target.key,
        "datacenter.dev/run-id": input.runId,
      },
      name: `${input.drill.key}-${input.runId}`,
      namespace: "chaos-mesh",
    },
    spec: {
      action: input.drill.template.action,
      mode: input.drill.template.mode,
      selector: {
        labelSelectors: input.target.selector,
        namespaces: [input.target.namespace],
      },
    },
  };
}

export function buildNetworkChaosManifest(input: {
  drill: DrillDefinitionRecord;
  requestedByUserId: string;
  runId: string;
  target: DrillTargetRecord;
}): NetworkChaosManifest {
  if (
    input.target.kind !== "workload" ||
    input.drill.template.executor !== "networkChaos"
  ) {
    throw new Error("Invalid network chaos input");
  }

  const metadata = {
    annotations: {
      "datacenter.dev/requested-by": input.requestedByUserId,
    },
    labels: {
      "app.kubernetes.io/managed-by": "datacenter-dashboard",
      "datacenter.dev/drill-key": input.drill.key,
      "datacenter.dev/target-key": input.target.key,
      "datacenter.dev/run-id": input.runId,
    },
    name: `${input.drill.key}-${input.runId}`,
    namespace: "chaos-mesh" as const,
  };

  const selector = {
    labelSelectors: input.target.selector,
    namespaces: [input.target.namespace] as [string],
  };

  if (input.drill.template.action === "delay") {
    return {
      apiVersion: "chaos-mesh.org/v1alpha1",
      kind: "NetworkChaos",
      metadata,
      spec: {
        action: "delay",
        delay: {
          correlation: input.drill.template.correlation,
          latency: input.drill.template.latency,
        },
        mode: "all",
        selector,
      },
    };
  }

  return {
    apiVersion: "chaos-mesh.org/v1alpha1",
    kind: "NetworkChaos",
    metadata,
    spec: {
      action: "loss",
      loss: {
        correlation: input.drill.template.correlation,
        loss: input.drill.template.loss,
      },
      mode: "all",
      selector,
    },
  };
}

export async function createPodChaos(manifest: PodChaosManifest) {
  const { customObjectsApi } = createKubeClients();

  await customObjectsApi.createNamespacedCustomObject({
    body: manifest,
    group: "chaos-mesh.org",
    namespace: manifest.metadata.namespace,
    plural: "podchaos",
    version: "v1alpha1",
  });
}

export async function createNetworkChaos(manifest: NetworkChaosManifest) {
  const { customObjectsApi } = createKubeClients();

  await customObjectsApi.createNamespacedCustomObject({
    body: manifest,
    group: "chaos-mesh.org",
    namespace: manifest.metadata.namespace,
    plural: "networkchaos",
    version: "v1alpha1",
  });
}

export async function getPodChaos(name: string) {
  const { customObjectsApi } = createKubeClients();

  return customObjectsApi.getNamespacedCustomObject({
    group: "chaos-mesh.org",
    name,
    namespace: "chaos-mesh",
    plural: "podchaos",
    version: "v1alpha1",
  });
}

export async function getNetworkChaos(name: string) {
  const { customObjectsApi } = createKubeClients();

  return customObjectsApi.getNamespacedCustomObject({
    group: "chaos-mesh.org",
    name,
    namespace: "chaos-mesh",
    plural: "networkchaos",
    version: "v1alpha1",
  });
}
