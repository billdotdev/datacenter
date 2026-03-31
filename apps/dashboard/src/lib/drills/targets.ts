import type { DrillTargetRecord, WorkloadDrillTargetRecord } from "./models";

export function isWorkloadTarget(
  target: DrillTargetRecord,
): target is WorkloadDrillTargetRecord {
  return target.kind === "workload";
}

export function formatTargetSummary(target: DrillTargetRecord) {
  if (target.kind === "node") {
    return `node/${target.nodeName}`;
  }

  return `${target.namespace}/${target.key}`;
}

export function hasServiceTarget(target: DrillTargetRecord) {
  return isWorkloadTarget(target) && Boolean(target.serviceName);
}
