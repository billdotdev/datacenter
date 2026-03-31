import type { V1Pod } from "@kubernetes/client-node";

import { createKubeClients } from "#/lib/cluster/kube-client";

export function buildCordonPatch() {
  return {
    spec: {
      unschedulable: true,
    },
  };
}

export function buildEviction(input: { name: string; namespace: string }) {
  return {
    apiVersion: "policy/v1",
    kind: "Eviction",
    metadata: {
      name: input.name,
      namespace: input.namespace,
    },
  };
}

export function selectDrainablePods(pods: Array<Partial<V1Pod>>) {
  return pods
    .filter((pod) => {
      const phase = pod.status?.phase;
      const annotations = pod.metadata?.annotations ?? {};
      const ownerReferences = pod.metadata?.ownerReferences ?? [];

      if (phase === "Succeeded" || phase === "Failed") {
        return false;
      }

      if (annotations["kubernetes.io/config.mirror"]) {
        return false;
      }

      if (ownerReferences.some((owner) => owner.kind === "DaemonSet")) {
        return false;
      }

      return Boolean(pod.metadata?.name && pod.metadata?.namespace);
    })
    .map((pod) => ({
      name: pod.metadata!.name!,
      namespace: pod.metadata!.namespace!,
    }));
}

export async function cordonAndDrainNode(input: { nodeName: string }) {
  const { coreApi } = createKubeClients();

  await coreApi.patchNode({
    body: buildCordonPatch(),
    name: input.nodeName,
  });

  const pods = await coreApi.listPodForAllNamespaces({
    fieldSelector: `spec.nodeName=${input.nodeName}`,
  });

  const evictions = selectDrainablePods(pods.items);

  for (const eviction of evictions) {
    await coreApi.createNamespacedPodEviction({
      body: buildEviction(eviction),
      name: eviction.name,
      namespace: eviction.namespace,
    });
  }

  return {
    cordoned: true,
    evictedPodCount: evictions.length,
  };
}
