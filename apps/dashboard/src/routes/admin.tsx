import { Link, createFileRoute, redirect } from "@tanstack/react-router";

import { Button } from "#/components/ui/button";
import { readAuthPage } from "#/lib/session";

export const Route = createFileRoute("/admin")({
  loader: async () => {
    const authPage = await readAuthPage({
      data: { pathname: "/admin" },
    });

    if (!authPage.decision.allow) {
      throw redirect({ to: authPage.decision.redirectTo });
    }

    return authPage;
  },
  component: AdminPage,
});

function AdminPage() {
  const { session } = Route.useLoaderData();

  return (
    <main className="page-wrap px-4 pb-10 pt-14">
      <section className="island-shell rounded-[2rem] px-6 py-10 sm:px-10 sm:py-14">
        <p className="island-kicker mb-3">Admin Surface</p>
        <h1 className="display-title mb-4 text-4xl font-bold text-[var(--sea-ink)] sm:text-5xl">
          Admin-only route confirmed.
        </h1>
        <p className="mb-8 max-w-3xl text-base leading-8 text-[var(--sea-ink-soft)]">
          {session?.user.email} is authenticated as{" "}
          <code>{session?.user.role}</code>. This placeholder exists to prove
          role-aware routing before user management screens land.
        </p>

        <Button asChild variant="outline">
          <Link to="/">Back to dashboard</Link>
        </Button>
      </section>
    </main>
  );
}
