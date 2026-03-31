import { describe, expect, it } from "vitest";

import { buildLoadJobManifest } from "./load-job-client";
import type { DrillDefinitionRecord, DrillTargetRecord } from "./models";

describe("buildLoadJobManifest", () => {
  it("creates a namespaced job against the selected service", () => {
    const drill: DrillDefinitionRecord = {
      blastRadiusSummary: "Generate fixed HTTP load.",
      enabled: true,
      id: "drill-traffic-spike",
      key: "traffic-spike",
      kind: "traffic_spike",
      name: "Traffic Spike",
      requiresDisruptiveActions: true,
      targetType: "workload",
      template: { durationSeconds: 60, executor: "loadJob", requestsPerSecond: 25 },
    };
    const target: DrillTargetRecord = {
      blastRadiusSummary: "Affects the dashboard service only.",
      enabled: true,
      id: "target-dashboard",
      key: "dashboard",
      kind: "workload",
      name: "Dashboard",
      namespace: "dashboard",
      nodeName: null,
      selector: { "app.kubernetes.io/name": "dashboard" },
      serviceName: "dashboard",
      targetSummary: "dashboard/dashboard",
    };

    expect(buildLoadJobManifest({ drill, runId: "run-123", target })).toMatchObject({
      apiVersion: "batch/v1",
      kind: "Job",
      metadata: {
        name: "traffic-spike-run-123",
        namespace: "dashboard",
      },
      spec: {
        template: {
          spec: {
            containers: [
              expect.objectContaining({
                args: expect.arrayContaining([
                  "http://dashboard.dashboard.svc.cluster.local/",
                  "25",
                  "60",
                ]),
              }),
            ],
            restartPolicy: "Never",
          },
        },
      },
    });
  });
});
