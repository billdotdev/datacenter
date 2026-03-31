import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

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
		<main className="auth-panel auth-panel--wide">
			<section className="auth-card">
				<div>
					<p className="eyebrow">First Admin</p>
					<h1>Bootstrap Dashboard Admin</h1>
					<p className="auth-card__meta">restricted route / first user only</p>
				</div>

				<form className="auth-grid" onSubmit={handleSubmit}>
					<div className="field field--full">
						<Label htmlFor="name" className="field__label">
							Full name
						</Label>
						<Input
							id="name"
							autoComplete="name"
							value={name}
							onChange={(event) => setName(event.target.value)}
							required
						/>
					</div>

					<div className="field field--full">
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
							autoComplete="new-password"
							value={password}
							onChange={(event) => setPassword(event.target.value)}
							required
						/>
					</div>

					<div className="field">
						<Label htmlFor="confirm-password" className="field__label">
							Confirm password
						</Label>
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
						<div className="alert-block field--full">{error}</div>
					) : null}

					<Button className="field--full" type="submit" disabled={isSubmitting}>
						{isSubmitting ? "Creating admin..." : "Create bootstrap admin"}
					</Button>
				</form>
			</section>
		</main>
	);
}
