// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DrillCatalog } from "./drill-catalog";

describe("DrillCatalog", () => {
  it("disables execute for viewers and shows recent runs", () => {
    render(
      <DrillCatalog
        data={{
          disruptiveActionsEnabled: false,
          drills: [
            {
              blastRadiusSummary: "Restarts one dashboard pod in namespace dashboard.",
              enabled: true,
              key: "pod-delete",
              kind: "pod_delete",
              name: "Delete One Pod",
              targets: [
                {
                  blastRadiusSummary: "Affects the dashboard service only.",
                  key: "dashboard",
                  name: "Dashboard",
                  targetSummary: "dashboard/dashboard",
                },
              ],
            },
          ],
          runs: [
            {
              chaosName: "dashboard-run-123",
              errorMessage: null,
              finishedAt: null,
              id: "run-123",
              requestedAt: "2026-03-30T12:00:00.000Z",
              requestedByName: "Op User",
              status: "running",
              targetSummary: "dashboard/dashboard",
            },
          ],
        }}
        error={null}
        isRefreshing={false}
        onExecute={vi.fn()}
        onToggleSafety={vi.fn()}
        role="viewer"
        toggleBusy={false}
      />,
    );

    expect(screen.getByText("Delete One Pod")).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: "Execute drill" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(screen.getByText("Op User")).toBeTruthy();
  });

  it("executes after confirmation for operators", () => {
    const onExecute = vi.fn();
    vi.stubGlobal("confirm", vi.fn(() => true));
    cleanup();

    render(
      <DrillCatalog
        data={{
          disruptiveActionsEnabled: true,
          drills: [
            {
              blastRadiusSummary: "Restarts one dashboard pod in namespace dashboard.",
              enabled: true,
              key: "pod-delete",
              kind: "pod_delete",
              name: "Delete One Pod",
              targets: [
                {
                  blastRadiusSummary: "Affects the dashboard service only.",
                  key: "dashboard",
                  name: "Dashboard",
                  targetSummary: "dashboard/dashboard",
                },
                {
                  blastRadiusSummary: "Affects Loki only.",
                  key: "loki",
                  name: "Loki",
                  targetSummary: "observability/loki",
                },
              ],
            },
          ],
          runs: [],
        }}
        error={null}
        isRefreshing={false}
        onExecute={onExecute}
        onToggleSafety={vi.fn()}
        role="operator"
        toggleBusy={false}
      />,
    );

    fireEvent.change(screen.getByLabelText("Target for Delete One Pod"), {
      target: { value: "loki" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Execute drill" }));
    expect(onExecute).toHaveBeenCalledWith("pod-delete", "loki");
  });
});
