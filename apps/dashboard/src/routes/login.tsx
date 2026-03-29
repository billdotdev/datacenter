import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";

import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { authClient } from "#/lib/auth-client";
import { readAuthPage } from "#/lib/session";

export const Route = createFileRoute("/login")({
  loader: async () => {
    const authPage = await readAuthPage({
      data: { pathname: "/login" },
    });

    if (!authPage.decision.allow) {
      throw redirect({ to: authPage.decision.redirectTo });
    }

    return authPage;
  },
  component: LoginPage,
});

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await authClient.signIn.email({
      email,
      password,
    });

    if (result.error) {
      setError(result.error.message ?? "Unable to sign in");
      setIsSubmitting(false);
      return;
    }

    window.location.href = "/";
  }

  return (
    <main className="page-wrap px-4 pb-10 pt-14">
      <section className="mx-auto max-w-lg rounded-[2rem] border border-[rgba(23,58,64,0.12)] bg-white/85 p-8 shadow-[0_32px_80px_rgba(21,57,64,0.14)] backdrop-blur">
        <p className="island-kicker mb-3">Login</p>
        <h1 className="display-title mb-3 text-4xl font-bold text-[var(--sea-ink)]">
          Dashboard sign in
        </h1>
        <p className="mb-8 text-sm leading-6 text-[var(--sea-ink-soft)]">
          Use the local Better Auth account stored in PostgreSQL. No public
          signup route exists after bootstrap.
        </p>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
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
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>

          {error ? (
            <p className="m-0 rounded-xl border border-[rgba(180,57,57,0.22)] bg-[rgba(180,57,57,0.08)] px-4 py-3 text-sm text-[rgb(139,42,42)]">
              {error}
            </p>
          ) : null}

          <Button className="w-full" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </section>
    </main>
  );
}
