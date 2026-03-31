import type { ClusterSnapshotView } from "#/lib/cluster/models";

type ClusterOverviewProps = {
	cluster: ClusterSnapshotView;
	error: string | null;
	isRefreshing: boolean;
};

export function ClusterOverview({
	cluster,
	error,
	isRefreshing,
}: ClusterOverviewProps) {
	const metrics = [
		[
			"Cluster Health",
			`${cluster.summary.healthyApplicationCount}/${cluster.summary.applicationCount}`,
		],
		["Ready Nodes", String(cluster.summary.readyNodeCount)],
		["Healthy Apps", String(cluster.summary.healthyApplicationCount)],
		[
			"Alerts",
			String(
				cluster.summary.degradedApplicationCount +
					cluster.summary.notReadyNodeCount,
			),
		],
	] as const;

	return (
		<section className="workspace-stack">
			<div className="kpi-strip">
				{metrics.map(([label, value]) => (
					<article key={label}>
						<p className="eyebrow">{label}</p>
						<p className="metric-value">{value}</p>
						<p className="mono-meta">
							{label === "Alerts"
								? "degraded + not-ready"
								: label === "Cluster Health"
									? cluster.summary.clusterName
									: "live cluster state"}
						</p>
					</article>
				))}
			</div>

			{error ? <div className="alert-block">{error}</div> : null}

			<div className="workspace-grid">
				<section className="panel">
					<div className="panel__header">
						<div>
							<p className="eyebrow">Nodes</p>
							<h2>Compute Nodes Activity</h2>
						</div>
						<p className="mono-meta">
							{isRefreshing
								? "refreshing"
								: `updated ${cluster.summary.lastRefreshedAt}`}
						</p>
					</div>

					<table className="ops-table">
						<thead>
							<tr>
								<th>Status</th>
								<th>Node</th>
								<th>Version</th>
								<th>Role</th>
								<th>IP</th>
							</tr>
						</thead>
						<tbody>
							{cluster.nodes.map((node) => (
								<tr key={node.name}>
									<td>{node.ready ? "Ready" : "Not Ready"}</td>
									<td>{node.name}</td>
									<td className="mono-meta">{node.kubeletVersion}</td>
									<td>{node.roles.join(", ")}</td>
									<td className="mono-meta">{node.internalIP ?? "No IP"}</td>
								</tr>
							))}
						</tbody>
					</table>
				</section>

				<section className="ledger">
					<div className="panel__header">
						<div>
							<p className="eyebrow">Applications</p>
							<h2>Argo Application Ledger</h2>
						</div>
						<p className="mono-meta">
							{cluster.summary.syncedApplicationCount} synced
						</p>
					</div>

					{cluster.applications.map((application) => (
						<article key={application.name} className="ledger__row">
							<strong>{application.name}</strong>
							<span className="mono-meta">
								{application.syncStatus} / {application.healthStatus}
							</span>
							<span>{application.namespace}</span>
							<span className="mono-meta">{application.targetRevision}</span>
						</article>
					))}
				</section>
			</div>

			<section className="panel">
				<div className="panel__header">
					<div>
						<p className="eyebrow">Summary</p>
						<h2>Cluster Identity</h2>
					</div>
					<p className="mono-meta">
						{cluster.summary.totalNodeCount} total nodes
					</p>
				</div>
				<div className="ledger__row">
					<strong>{cluster.summary.clusterName}</strong>
					<span className="mono-meta">
						{cluster.summary.applicationCount} applications /{" "}
						{cluster.summary.syncedApplicationCount} synced
					</span>
				</div>
			</section>
		</section>
	);
}
