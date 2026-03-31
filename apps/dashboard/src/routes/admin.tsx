import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
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
		<main className="workspace workspace--narrow">
			<section className="panel control-panel">
				<p className="eyebrow">Admin</p>
				<h1>Disruptive Actions Gate</h1>
				<p className="mono-meta">{authPage.session?.user.email}</p>
				<p className="mono-meta">{authPage.session?.user.role}</p>
				<p>
					Manual drill requests fail closed for every role when this gate is
					disabled.
				</p>
				<div className="toolbar">
					<Button
						onClick={() => toggleMutation.mutate(!enabled)}
						disabled={toggleMutation.isPending}
					>
						{enabled
							? "Disable disruptive actions"
							: "Enable disruptive actions"}
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
