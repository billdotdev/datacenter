import { deriveClusterSnapshot } from "./derive-cluster-snapshot";
import { createKubeClients } from "./kube-client";

type NodeLike = {
  metadata?: {
    creationTimestamp?: string;
    labels?: Record<string, string>;
    name?: string;
  };
  status?: {
    addresses?: Array<{ address?: string; type?: string }>;
    conditions?: Array<{ status?: string; type?: string }>;
    nodeInfo?: { kubeletVersion?: string };
  };
};

type ApplicationLike = {
  metadata?: {
    name?: string;
    namespace?: string;
  };
  spec?: {
    source?: {
      targetRevision?: string;
    };
  };
  status?: {
    health?: { status?: string };
    sync?: { status?: string };
  };
};

type ReadClusterSnapshotInput = {
  clusterName: string;
  listApplications: () => Promise<ApplicationLike[]>;
  listNodes: () => Promise<NodeLike[]>;
  now?: () => Date;
};

function formatAge(from: Date, to: Date) {
  const ageMs = Math.max(0, to.getTime() - from.getTime());
  const hours = Math.max(1, Math.floor(ageMs / 3_600_000));

  return `${hours}h`;
}

export async function readClusterSnapshotFromSources({
  clusterName,
  listApplications,
  listNodes,
  now = () => new Date(),
}: ReadClusterSnapshotInput) {
  const [nodes, applications] = await Promise.all([listNodes(), listApplications()]);
  const currentTime = now();

  return deriveClusterSnapshot({
    applications: applications.map((application) => ({
      healthStatus: application.status?.health?.status ?? "Unknown",
      name: application.metadata?.name ?? "unknown",
      namespace: application.metadata?.namespace ?? "argocd",
      syncStatus: application.status?.sync?.status ?? "Unknown",
      targetRevision: application.spec?.source?.targetRevision ?? "unknown",
    })),
    clusterName,
    nodes: nodes.map((node) => ({
      age: node.metadata?.creationTimestamp
        ? formatAge(new Date(node.metadata.creationTimestamp), currentTime)
        : "unknown",
      internalIP:
        node.status?.addresses?.find((address) => address.type === "InternalIP")
          ?.address ?? null,
      kubeletVersion: node.status?.nodeInfo?.kubeletVersion ?? "unknown",
      name: node.metadata?.name ?? "unknown",
      ready:
        node.status?.conditions?.some(
          (condition) =>
            condition.type === "Ready" && condition.status === "True",
        ) ?? false,
      roles: Object.keys(node.metadata?.labels ?? {})
        .filter((label) => label.startsWith("node-role.kubernetes.io/"))
        .map((label) => label.replace("node-role.kubernetes.io/", "")),
    })),
    refreshedAt: currentTime.toISOString(),
  });
}

export async function readClusterSnapshot() {
  const { coreApi, customObjectsApi } = createKubeClients();

  return readClusterSnapshotFromSources({
    clusterName: process.env.CLUSTER_NAME ?? "datacenter",
    listApplications: async () => {
      const response = await customObjectsApi.listNamespacedCustomObject({
        group: "argoproj.io",
        namespace: "argocd",
        plural: "applications",
        version: "v1alpha1",
      });

      return ((response as { items?: ApplicationLike[] }).items ?? []) as ApplicationLike[];
    },
    listNodes: async () => {
      const response = await coreApi.listNode();
      return response.items as NodeLike[];
    },
  });
}
