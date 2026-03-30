import { useMutation } from "@tanstack/react-query";
import { Link, createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";

import { Button } from "#/components/ui/button";
import {
  readDrillCatalog,
  setDisruptiveActionsEnabled,
} from "#/lib/drills/server";
import { readAuthPage } from "#/lib/session";

export const Route = createFileRoute("/admin")({
  loader: async () => {
    const authPage = await readAuthPage({
      data: { pathname: "/admin" },
    });

    if (!authPage.decision.allow) {
      throw redirect({ to: authPage.decision.redirectTo });
    }

    return {
      authPage,
      drillCatalog: await readDrillCatalog(),
    };
  },
  component: AdminPage,
});

function AdminPage() {
  const { authPage, drillCatalog } = Route.useLoaderData();
  const [enabled, setEnabled] = useState(drillCatalog.disruptiveActionsEnabled);

  const toggleMutation = useMutation({
    mutationFn: (nextEnabled: boolean) =>
      setDisruptiveActionsEnabled({ data: { enabled: nextEnabled } }),
    onSuccess: (_, nextEnabled) => {
      setEnabled(nextEnabled);
    },
  });

  return (
    <main className="page-wrap px-4 pb-10 pt-14">
      <section className="island-shell rounded-[2rem] px-6 py-10 sm:px-10 sm:py-14">
        <p className="island-kicker mb-3">Admin Surface</p>
        <h1 className="display-title mb-4 text-4xl font-bold text-[var(--sea-ink)] sm:text-5xl">
          Admin-only route confirmed.
        </h1>
        <p className="mb-8 max-w-3xl text-base leading-8 text-[var(--sea-ink-soft)]">
          {authPage.session?.user.email} is authenticated as{" "}
          <code>{authPage.session?.user.role}</code>.
        </p>
        <p className="mb-6 max-w-3xl text-base leading-8 text-[var(--sea-ink-soft)]">
          Disruptive actions are currently{" "}
          <strong>{enabled ? "enabled" : "disabled"}</strong>.
        </p>
        <p className="mb-8 max-w-3xl text-sm leading-7 text-[var(--sea-ink-soft)]">
          When disabled, every manual drill request fails closed for all roles,
          including admins.
        </p>

        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => toggleMutation.mutate(!enabled)}
            disabled={toggleMutation.isPending}
          >
            {enabled ? "Disable disruptive actions" : "Enable disruptive actions"}
          </Button>
          <Button asChild>
            <Link to="/drills">Go to drills</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/">Back to dashboard</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
