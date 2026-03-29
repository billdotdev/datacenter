import { Link, createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";

import { Button } from "#/components/ui/button";
import { authClient } from "#/lib/auth-client";
import { readAuthPage } from "#/lib/session";

export const Route = createFileRoute("/")({
  loader: async () => {
    const authPage = await readAuthPage({
      data: { pathname: "/" },
    });

    if (!authPage.decision.allow) {
      throw redirect({ to: authPage.decision.redirectTo });
    }

    return authPage;
  },
  component: DashboardHome,
});

function DashboardHome() {
  const { session } = Route.useLoaderData();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);

    await authClient.signOut();
    window.location.href = "/login";
  }

  return (
    <main className="page-wrap px-4 pb-10 pt-14">
      <section className="island-shell rise-in relative overflow-hidden rounded-[2rem] px-6 py-10 sm:px-10 sm:py-14">
        <div className="pointer-events-none absolute -left-20 -top-24 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(79,184,178,0.32),transparent_66%)]" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(47,106,74,0.18),transparent_66%)]" />
        <p className="island-kicker mb-3">Authenticated Dashboard</p>
        <h1 className="display-title mb-5 max-w-3xl text-4xl leading-[1.02] font-bold tracking-tight text-[var(--sea-ink)] sm:text-6xl">
          Welcome back, {session?.user.name}.
        </h1>
        <p className="mb-8 max-w-2xl text-base text-[var(--sea-ink-soft)] sm:text-lg">
          Better Auth is now the session boundary for the dashboard. The first
          admin bootstrap is complete, sessions persist in PostgreSQL, and role
          claims are available server-side for the next feature slices.
        </p>

        <div className="grid gap-4 sm:grid-cols-3">
          <article className="rounded-2xl border border-[rgba(23,58,64,0.12)] bg-white/70 p-5">
            <p className="island-kicker mb-2">Email</p>
            <p className="m-0 text-sm font-semibold text-[var(--sea-ink)]">
              {session?.user.email}
            </p>
          </article>
          <article className="rounded-2xl border border-[rgba(23,58,64,0.12)] bg-white/70 p-5">
            <p className="island-kicker mb-2">Role</p>
            <p className="m-0 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--lagoon-deep)]">
              {session?.user.role}
            </p>
          </article>
          <article className="rounded-2xl border border-[rgba(23,58,64,0.12)] bg-white/70 p-5">
            <p className="island-kicker mb-2">Status</p>
            <p className="m-0 text-sm font-semibold text-[var(--sea-ink)]">
              Auth live. Cluster read APIs next.
            </p>
          </article>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          {session?.user.role === "admin" ? (
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
    </main>
  );
}
