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
  return (
    <section className="island-shell rounded-[2rem] px-6 py-8 sm:px-10 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="island-kicker mb-2">Cluster Summary</p>
          <h2 className="display-title text-4xl font-bold text-[var(--sea-ink)]">
            {cluster.summary.clusterName}
          </h2>
        </div>
        <p className="text-sm text-[var(--sea-ink-soft)]">
          {isRefreshing
            ? "Refreshing..."
            : `Updated ${cluster.summary.lastRefreshedAt}`}
        </p>
      </div>

      {error ? (
        <p className="mt-4 rounded-xl border border-[rgba(180,57,57,0.22)] bg-[rgba(180,57,57,0.08)] px-4 py-3 text-sm text-[rgb(139,42,42)]">
          {error}
        </p>
      ) : null}

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Ready Nodes", cluster.summary.readyNodeCount],
          ["Not Ready", cluster.summary.notReadyNodeCount],
          ["Healthy Apps", cluster.summary.healthyApplicationCount],
          ["Out Of Sync / Degraded", cluster.summary.degradedApplicationCount],
        ].map(([label, value]) => (
          <article
            key={label}
            className="rounded-2xl border border-[rgba(23,58,64,0.12)] bg-white/70 p-5"
          >
            <p className="island-kicker mb-2">{label}</p>
            <p className="m-0 text-3xl font-semibold text-[var(--sea-ink)]">
              {value}
            </p>
          </article>
        ))}
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <article className="rounded-2xl border border-[rgba(23,58,64,0.12)] bg-white/70 p-5">
          <h3 className="mb-4 text-lg font-semibold text-[var(--sea-ink)]">
            Nodes
          </h3>
          <div className="space-y-3">
            {cluster.nodes.map((node) => (
              <div
                key={node.name}
                className="rounded-xl border border-[rgba(23,58,64,0.08)] px-4 py-3"
              >
                <div className="flex items-center justify-between gap-4">
                  <p className="m-0 font-semibold text-[var(--sea-ink)]">
                    {node.name}
                  </p>
                  <span className="text-sm text-[var(--sea-ink-soft)]">
                    {node.ready ? "Ready" : "Not Ready"}
                  </span>
                </div>
                <p className="m-0 mt-1 text-sm text-[var(--sea-ink-soft)]">
                  {node.internalIP ?? "No IP"} · {node.kubeletVersion} ·{" "}
                  {node.roles.join(", ")}
                </p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-[rgba(23,58,64,0.12)] bg-white/70 p-5">
          <h3 className="mb-4 text-lg font-semibold text-[var(--sea-ink)]">
            Argo Applications
          </h3>
          <div className="space-y-3">
            {cluster.applications.map((application) => (
              <div
                key={application.name}
                className="rounded-xl border border-[rgba(23,58,64,0.08)] px-4 py-3"
              >
                <div className="flex items-center justify-between gap-4">
                  <p className="m-0 font-semibold text-[var(--sea-ink)]">
                    {application.name}
                  </p>
                  <span className="text-sm text-[var(--sea-ink-soft)]">
                    {application.syncStatus} / {application.healthStatus}
                  </span>
                </div>
                <p className="m-0 mt-1 text-sm text-[var(--sea-ink-soft)]">
                  {application.namespace} · {application.targetRevision}
                </p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </section>
  );
}
