import { Button } from "#/components/ui/button";
import type { AppRole } from "#/lib/auth-flow";
import type { DrillCatalogView } from "#/lib/drills/models";

type DrillCatalogProps = {
	data: DrillCatalogView;
	error: string | null;
	isRefreshing: boolean;
	onExecute: (drillKey: string, targetKey: string) => void;
	onToggleSafety: (enabled: boolean) => void;
	viewerRole: AppRole;
	toggleBusy: boolean;
};

export function DrillCatalog({
	data,
	error,
	isRefreshing,
	onExecute,
	onToggleSafety,
	viewerRole,
	toggleBusy,
}: DrillCatalogProps) {
	return (
		<section className="workspace-stack">
			<header className="panel">
				<div className="panel__header">
					<div>
						<p className="eyebrow">Manual drills</p>
						<h1>Manual Drill Workbench</h1>
						<p className="mono-meta">
							safety {data.disruptiveActionsEnabled ? "enabled" : "disabled"}
							{isRefreshing ? " / refreshing" : ""}
						</p>
					</div>

					<div className="toolbar">
						<span className="mono-chip">
							{data.disruptiveActionsEnabled
								? "Safety enabled"
								: "Safety disabled"}
						</span>
						{viewerRole === "admin" ? (
							<Button
								variant="outline"
								size="sm"
								disabled={toggleBusy}
								onClick={() => onToggleSafety(!data.disruptiveActionsEnabled)}
							>
								{data.disruptiveActionsEnabled
									? "Disable disruptive actions"
									: "Enable disruptive actions"}
							</Button>
						) : null}
					</div>
				</div>

				{error ? <div className="alert-block">{error}</div> : null}
			</header>

			<div className="workspace-grid">
				<section className="panel">
					<div className="panel__header">
						<div>
							<p className="eyebrow">Execution catalog</p>
							<h2>Approved drill actions</h2>
						</div>
					</div>

					<div>
						{data.drills.map((drill) => {
							const selectId = `target-${drill.key}`;
							const selectedTarget = drill.targets[0];
							const disabled =
								viewerRole === "viewer" ||
								!data.disruptiveActionsEnabled ||
								!drill.enabled ||
								!selectedTarget;

							return (
								<article key={drill.key} className="drill-row">
									<div className="drill-row__summary">
										<p className="eyebrow">{drill.kind}</p>
										<h2>{drill.name}</h2>
										<p>{drill.blastRadiusSummary}</p>
										<p className="mono-meta">
											{selectedTarget?.targetSummary ?? "No compatible targets"}
										</p>
									</div>

									<div className="drill-row__controls">
										{drill.targets.length > 0 ? (
											<label className="field" htmlFor={selectId}>
												<span className="field__label">{`Target for ${drill.name}`}</span>
												<select
													defaultValue={selectedTarget?.key}
													aria-label={`Target for ${drill.name}`}
													className="drill-row__select"
													id={selectId}
												>
													{drill.targets.map((target) => (
														<option key={target.key} value={target.key}>
															{target.name} · {target.targetSummary}
														</option>
													))}
												</select>
											</label>
										) : null}

										<Button
											disabled={disabled}
											onClick={() => {
												if (
													window.confirm(
														`Execute ${drill.name} against ${selectedTarget?.name ?? "the selected target"}?`,
													)
												) {
													const element = document.getElementById(
														selectId,
													) as HTMLSelectElement | null;

													onExecute(
														drill.key,
														element?.value ?? selectedTarget?.key ?? "",
													);
												}
											}}
										>
											Execute drill
										</Button>
									</div>
								</article>
							);
						})}
					</div>
				</section>

				<section className="ledger">
					<div className="panel__header">
						<div>
							<p className="eyebrow">Run history</p>
							<h2>Recent Drill Runs</h2>
						</div>
					</div>

					{data.runs.length === 0 ? (
						<div className="ledger__row">
							<span>No drill runs yet.</span>
						</div>
					) : (
						data.runs.map((run) => (
							<div key={run.id} className="ledger__row">
								<strong>{run.requestedByName}</strong>
								<span className="mono-meta">{run.status}</span>
								<span>{run.drillKey}</span>
								<span className="mono-meta">{run.targetSummary}</span>
								{run.errorMessage ? (
									<span className="mono-meta">{run.errorMessage}</span>
								) : null}
							</div>
						))
					)}
				</section>
			</div>
		</section>
	);
}
