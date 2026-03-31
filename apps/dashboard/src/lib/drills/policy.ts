import type { AppRole } from "#/lib/auth-flow";

import type { DrillDefinitionRecord, DrillTargetRecord } from "./models";
import { hasServiceTarget } from "./targets";

type CanExecuteDrillInput = {
  disruptiveActionsEnabled: boolean;
  drill: DrillDefinitionRecord;
  role: AppRole;
  target: DrillTargetRecord;
};

export function isAllowedWorkloadTarget(target: DrillTargetRecord) {
  if (target.kind !== "workload") {
    return false;
  }

  const pairs = [
    [
      "dashboard",
      "dashboard",
      { "app.kubernetes.io/name": "dashboard" },
    ],
    [
      "istiod",
      "istio-system",
      { app: "istiod" },
    ],
    [
      "datacenter-postgres",
      "database",
      { "cnpg.io/cluster": "datacenter-postgres" },
    ],
    [
      "loki",
      "observability",
      {
        "app.kubernetes.io/component": "single-binary",
        "app.kubernetes.io/instance": "loki",
      },
    ],
  ] as const;

  return (
    pairs.find(
      ([key, namespace, selector]) =>
        target.key === key &&
        target.namespace === namespace &&
        JSON.stringify(target.selector) === JSON.stringify(selector),
    ) !== undefined
  );
}

export function isAllowedNodeTarget(target: DrillTargetRecord) {
  return target.kind === "node" && target.key === "cp-3" && target.nodeName === "cp-3";
}

export function isTargetCompatibleWithDrill(
  drill: DrillDefinitionRecord,
  target: DrillTargetRecord,
) {
  if (drill.targetType !== target.kind) {
    return false;
  }

  if (drill.template.executor === "loadJob") {
    return hasServiceTarget(target);
  }

  return true;
}

export function canExecuteDrill({
  disruptiveActionsEnabled,
  drill,
  role,
  target,
}: CanExecuteDrillInput) {
  if (role !== "admin" && role !== "operator") {
    return { allow: false as const, reason: "forbidden" as const };
  }

  if (!drill.enabled) {
    return { allow: false as const, reason: "drill-disabled" as const };
  }

  if (drill.requiresDisruptiveActions && !disruptiveActionsEnabled) {
    return {
      allow: false as const,
      reason: "disruptive-actions-disabled" as const,
    };
  }

  if (!isTargetCompatibleWithDrill(drill, target)) {
    return { allow: false as const, reason: "incompatible-target" as const };
  }

  const allowed =
    target.kind === "workload"
      ? isAllowedWorkloadTarget(target)
      : isAllowedNodeTarget(target);

  if (!allowed) {
    return { allow: false as const, reason: "invalid-target" as const };
  }

  return { allow: true as const };
}
