import type { V1Job } from "@kubernetes/client-node";

import { createKubeClients } from "#/lib/cluster/kube-client";

import type { DrillDefinitionRecord, DrillTargetRecord } from "./models";

export function buildLoadJobManifest(input: {
  drill: DrillDefinitionRecord;
  runId: string;
  target: DrillTargetRecord;
}): V1Job {
  if (
    input.target.kind !== "workload" ||
    input.drill.template.executor !== "loadJob"
  ) {
    throw new Error("Invalid load job input");
  }

  if (!input.target.serviceName) {
    throw new Error("Selected target has no service endpoint");
  }

  const url = `http://${input.target.serviceName}.${input.target.namespace}.svc.cluster.local/`;

  return {
    apiVersion: "batch/v1",
    kind: "Job",
    metadata: {
      labels: {
        "app.kubernetes.io/managed-by": "datacenter-dashboard",
        "datacenter.dev/drill-key": input.drill.key,
        "datacenter.dev/target-key": input.target.key,
        "datacenter.dev/run-id": input.runId,
      },
      name: `${input.drill.key}-${input.runId}`,
      namespace: input.target.namespace,
    },
    spec: {
      backoffLimit: 0,
      template: {
        spec: {
          containers: [
            {
              args: [
                url,
                String(input.drill.template.requestsPerSecond),
                String(input.drill.template.durationSeconds),
              ],
              command: [
                "sh",
                "-c",
                'url="$1"; rps="$2"; duration="$3"; end=$((SECONDS + duration)); while [ "$SECONDS" -lt "$end" ]; do i=0; while [ "$i" -lt "$rps" ]; do wget -qO- "$url" >/dev/null 2>&1 || true; i=$((i + 1)); done; sleep 1; done',
                "--",
              ],
              image: "busybox:1.36.1",
              name: "load-generator",
            },
          ],
          restartPolicy: "Never",
        },
      },
    },
  };
}

export async function createLoadJob(manifest: V1Job) {
  const { batchApi } = createKubeClients();

  await batchApi.createNamespacedJob({
    body: manifest,
    namespace: manifest.metadata?.namespace ?? "default",
  });
}

export async function readLoadJob(name: string, namespace: string) {
  const { batchApi } = createKubeClients();

  return batchApi.readNamespacedJob({
    name,
    namespace,
  });
}
