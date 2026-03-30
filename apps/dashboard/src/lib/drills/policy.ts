import type { AppRole } from "#/lib/auth-flow";

import type { DrillDefinitionRecord } from "./models";

type CanExecuteDrillInput = {
  disruptiveActionsEnabled: boolean;
  drill: DrillDefinitionRecord;
  role: AppRole;
};

export function isAllowedTarget(input: {
  namespace: string;
  selector: Record<string, string>;
}) {
  return (
    input.namespace === "dashboard" &&
    input.selector["app.kubernetes.io/name"] === "dashboard" &&
    Object.keys(input.selector).length === 1
  );
}

export function canExecuteDrill({
  disruptiveActionsEnabled,
  drill,
  role,
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

  if (
    !isAllowedTarget({
      namespace: drill.targetNamespace,
      selector: drill.targetSelector,
    })
  ) {
    return { allow: false as const, reason: "invalid-target" as const };
  }

  return { allow: true as const };
}
