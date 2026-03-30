import { createKubeClients } from "#/lib/cluster/kube-client";

import type { DrillDefinitionRecord, PodChaosManifest } from "./models";

export function buildPodChaosManifest(input: {
  drill: DrillDefinitionRecord;
  requestedByUserId: string;
  runId: string;
}): PodChaosManifest {
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
        "datacenter.dev/run-id": input.runId,
      },
      name: `dashboard-${input.runId}`,
      namespace: "chaos-mesh",
    },
    spec: {
      action: input.drill.chaosTemplate.action,
      mode: input.drill.chaosTemplate.mode,
      selector: {
        labelSelectors: input.drill.targetSelector,
        namespaces: [input.drill.targetNamespace],
      },
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
