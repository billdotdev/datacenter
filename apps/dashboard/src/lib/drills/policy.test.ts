import { describe, expect, it } from "vitest";

import { canExecuteDrill, isAllowedTarget } from "./policy";
import type { DrillDefinitionRecord } from "./models";

const drill: DrillDefinitionRecord = {
  blastRadiusSummary: "Restarts one dashboard pod in namespace dashboard.",
  chaosTemplate: { action: "pod-kill", mode: "one" },
  enabled: true,
  id: "drill-pod-delete-dashboard",
  key: "pod-delete-dashboard",
  kind: "pod_delete",
  name: "Delete One Dashboard Pod",
  requiresDisruptiveActions: true,
  targetNamespace: "dashboard",
  targetSelector: { "app.kubernetes.io/name": "dashboard" },
};

describe("canExecuteDrill", () => {
  it("denies viewers", () => {
    expect(
      canExecuteDrill({
        disruptiveActionsEnabled: true,
        drill,
        role: "viewer",
      }),
    ).toEqual({
      allow: false,
      reason: "forbidden",
    });
  });

  it("denies when disruptive actions are disabled", () => {
    expect(
      canExecuteDrill({
        disruptiveActionsEnabled: false,
        drill,
        role: "operator",
      }),
    ).toEqual({
      allow: false,
      reason: "disruptive-actions-disabled",
    });
  });
});

describe("isAllowedTarget", () => {
  it("allows only dashboard namespace and selector", () => {
    expect(
      isAllowedTarget({
        namespace: "dashboard",
        selector: { "app.kubernetes.io/name": "dashboard" },
      }),
    ).toBe(true);

    expect(
      isAllowedTarget({
        namespace: "observability",
        selector: { "app.kubernetes.io/name": "dashboard" },
      }),
    ).toBe(false);
  });
});
