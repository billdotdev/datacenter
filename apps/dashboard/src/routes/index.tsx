import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";

import { ClusterOverview } from "#/components/cluster-overview";
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

	const query = useQuery({
		initialData,
		queryFn: () => readDashboardHome(),
		queryKey: ["dashboard-home"],
		refetchInterval: 20_000,
	});

	return (
		<main className="workspace">
			<ClusterOverview
				cluster={query.data.cluster}
				error={query.error instanceof Error ? query.error.message : null}
				isRefreshing={query.isFetching}
			/>
		</main>
	);
}
