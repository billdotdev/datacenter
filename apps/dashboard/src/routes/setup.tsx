import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";

import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { bootstrapAdmin, readAuthPage } from "#/lib/session";

export const Route = createFileRoute("/setup")({
  loader: async () => {
    const authPage = await readAuthPage({
      data: { pathname: "/setup" },
    });

    if (!authPage.decision.allow) {
      throw redirect({ to: authPage.decision.redirectTo });
    }

    return authPage;
  },
  component: SetupPage,
});

function SetupPage() {
  const runBootstrapAdmin = useServerFn(bootstrapAdmin);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsSubmitting(true);

    try {
      await runBootstrapAdmin({
        data: {
          email,
          name,
          password,
        },
      });

      window.location.href = "/";
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to create bootstrap admin";

      setError(message);
      setIsSubmitting(false);
    }
  }

  return (
    <main className="page-wrap px-4 pb-10 pt-14">
      <section className="mx-auto max-w-2xl rounded-[2rem] border border-[rgba(23,58,64,0.12)] bg-white/85 p-8 shadow-[0_32px_80px_rgba(21,57,64,0.14)] backdrop-blur">
        <p className="island-kicker mb-3">First Admin</p>
        <h1 className="display-title mb-3 text-4xl font-bold text-[var(--sea-ink)]">
          Bootstrap the dashboard admin
        </h1>
        <p className="mb-8 max-w-xl text-sm leading-6 text-[var(--sea-ink-soft)]">
          This route is only open while the dashboard has zero users. The first
          account is promoted to <code>admin</code>; later accounts will be
          managed through admin tooling.
        </p>

        <form className="grid gap-5 sm:grid-cols-2" onSubmit={handleSubmit}>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm password</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />
          </div>

          {error ? (
            <p className="m-0 rounded-xl border border-[rgba(180,57,57,0.22)] bg-[rgba(180,57,57,0.08)] px-4 py-3 text-sm text-[rgb(139,42,42)] sm:col-span-2">
              {error}
            </p>
          ) : null}

          <Button
            className="sm:col-span-2"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating admin..." : "Create bootstrap admin"}
          </Button>
        </form>
      </section>
    </main>
  );
}
