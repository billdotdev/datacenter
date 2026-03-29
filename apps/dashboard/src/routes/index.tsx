import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";

import { ClusterOverview } from "#/components/cluster-overview";
import { Button } from "#/components/ui/button";
import { authClient } from "#/lib/auth-client";
import { readAuthPage, readDashboardHome } from "#/lib/session";

export const Route = createFileRoute("/")({
  loader: async () => {
    const authPage = await readAuthPage({
      data: { pathname: "/" },
    });

    if (!authPage.decision.allow) {
      throw redirect({ to: authPage.decision.redirectTo });
    }

    return readDashboardHome();
  },
  component: DashboardHome,
});

function DashboardHome() {
  const initialData = Route.useLoaderData();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const query = useQuery({
    initialData,
    queryFn: () => readDashboardHome(),
    queryKey: ["dashboard-home"],
    refetchInterval: 20_000,
  });

  async function handleSignOut() {
    setIsSigningOut(true);

    await authClient.signOut();
    window.location.href = "/login";
  }

  return (
    <main className="page-wrap px-4 pb-10 pt-14">
      <section className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="island-kicker mb-2">Authenticated Dashboard</p>
          <h1 className="display-title text-4xl font-bold text-[var(--sea-ink)] sm:text-5xl">
            Welcome back, {query.data.session.user.name}.
          </h1>
          <p className="mt-3 max-w-2xl text-base text-[var(--sea-ink-soft)]">
            Live cluster reads are now served by the app backend. The browser
            only sees normalized dashboard data, not raw Kubernetes API access.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {query.data.session.user.role === "admin" ? (
            <Button asChild>
              <Link to="/admin">Admin Surface</Link>
            </Button>
          ) : null}
          <Button
            variant="outline"
            onClick={handleSignOut}
            disabled={isSigningOut}
          >
            {isSigningOut ? "Signing out..." : "Sign out"}
          </Button>
        </div>
      </section>

      <ClusterOverview
        cluster={query.data.cluster}
        error={query.error instanceof Error ? query.error.message : null}
        isRefreshing={query.isFetching}
      />
    </main>
  );
}
