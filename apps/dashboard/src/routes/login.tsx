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
		<main className="auth-panel">
			<section className="auth-card">
				<div>
					<p className="eyebrow">Login</p>
					<h1>Dashboard Sign In</h1>
					<p className="auth-card__meta">
						local account / better-auth / postgres
					</p>
				</div>

				<form className="auth-form" onSubmit={handleSubmit}>
					<div className="field">
						<Label htmlFor="email" className="field__label">
							Email
						</Label>
						<Input
							id="email"
							type="email"
							autoComplete="email"
							value={email}
							onChange={(event) => setEmail(event.target.value)}
							required
						/>
					</div>

					<div className="field">
						<Label htmlFor="password" className="field__label">
							Password
						</Label>
						<Input
							id="password"
							type="password"
							autoComplete="current-password"
							value={password}
							onChange={(event) => setPassword(event.target.value)}
							required
						/>
					</div>

					{error ? <div className="alert-block">{error}</div> : null}

					<Button className="w-full" type="submit" disabled={isSubmitting}>
						{isSubmitting ? "Signing in..." : "Sign in"}
					</Button>
				</form>
			</section>
		</main>
	);
}
