import { Button } from "#/components/ui/button";
import type { DrillCatalogView } from "#/lib/drills/models";
import type { AppRole } from "#/lib/auth-flow";

type DrillCatalogProps = {
  data: DrillCatalogView;
  error: string | null;
  isRefreshing: boolean;
  onExecute: (drillKey: string, targetKey: string) => void;
  onToggleSafety: (enabled: boolean) => void;
  role: AppRole;
  toggleBusy: boolean;
};

export function DrillCatalog({
  data,
  error,
  isRefreshing,
  onExecute,
  onToggleSafety,
  role,
  toggleBusy,
}: DrillCatalogProps) {
  return (
    <section className="space-y-6">
      <div className="island-shell rounded-[2rem] px-6 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="island-kicker mb-2">Manual Drills</p>
            <h2 className="display-title text-3xl text-[var(--sea-ink)]">
              First controlled write path
            </h2>
            <p className="mt-3 text-sm text-[var(--sea-ink-soft)]">
              Safety gate:{" "}
              <strong>
                {data.disruptiveActionsEnabled ? "enabled" : "disabled"}
              </strong>
              {isRefreshing ? " · refreshing" : ""}
            </p>
          </div>

          {role === "admin" ? (
            <Button
              variant="outline"
              disabled={toggleBusy}
              onClick={() => onToggleSafety(!data.disruptiveActionsEnabled)}
            >
              {data.disruptiveActionsEnabled
                ? "Disable disruptive actions"
                : "Enable disruptive actions"}
            </Button>
          ) : null}
        </div>

        {error ? (
          <p className="mt-4 rounded-xl border border-[rgba(180,57,57,0.22)] bg-[rgba(180,57,57,0.08)] px-4 py-3 text-sm text-[rgb(139,42,42)]">
            {error}
          </p>
        ) : null}
      </div>

      {data.drills.map((drill) => {
        const selectId = `target-${drill.key}`;
        const selectedTarget = drill.targets[0];
        const disabled =
          role === "viewer" ||
          !data.disruptiveActionsEnabled ||
          !drill.enabled ||
          !selectedTarget;

        return (
          <article
            key={drill.key}
            className="island-shell rounded-[2rem] px-6 py-6"
          >
            <p className="island-kicker mb-2">{drill.kind}</p>
            <h3 className="text-2xl font-semibold text-[var(--sea-ink)]">
              {drill.name}
            </h3>
            <p className="mt-3 text-sm text-[var(--sea-ink-soft)]">
              {drill.blastRadiusSummary}
            </p>
            <p className="mt-2 text-sm text-[var(--sea-ink-soft)]">
              Target:{" "}
              <code>{selectedTarget?.targetSummary ?? "No compatible targets"}</code>
            </p>
            {drill.targets.length > 0 ? (
              <label
                className="mt-4 flex flex-col gap-2 text-sm text-[var(--sea-ink-soft)]"
                htmlFor={selectId}
              >
                <span>{`Target for ${drill.name}`}</span>
                <select
                  defaultValue={selectedTarget?.key}
                  aria-label={`Target for ${drill.name}`}
                  className="rounded-md border border-[rgba(23,58,64,0.16)] bg-white px-3 py-2 text-[var(--sea-ink)]"
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
              className="mt-5"
              disabled={disabled}
              onClick={() => {
                if (
                  window.confirm(
                    `Execute ${drill.name} against ${selectedTarget?.name ?? "the selected target"}?`,
                  )
                ) {
                  const element = document.getElementById(selectId) as
                    | HTMLSelectElement
                    | null;

                  onExecute(drill.key, element?.value ?? selectedTarget?.key ?? "");
                }
              }}
            >
              Execute drill
            </Button>
          </article>
        );
      })}

      <section className="island-shell rounded-[2rem] px-6 py-6">
        <p className="island-kicker mb-2">Recent Runs</p>
        <h3 className="text-2xl font-semibold text-[var(--sea-ink)]">
          Latest drill history
        </h3>
        <div className="mt-5 space-y-3">
          {data.runs.length === 0 ? (
            <p className="text-sm text-[var(--sea-ink-soft)]">
              No drill runs yet.
            </p>
          ) : (
            data.runs.map((run) => (
              <div
                key={run.id}
                className="rounded-2xl border border-[rgba(23,58,64,0.12)] px-4 py-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong>{run.requestedByName}</strong>
                  <span>{run.status}</span>
                </div>
                <p className="mt-2 text-sm text-[var(--sea-ink-soft)]">
                  {run.drillKey}
                </p>
                <p className="mt-1 text-sm text-[var(--sea-ink-soft)]">
                  {run.targetSummary}
                </p>
                {run.errorMessage ? (
                  <p className="mt-2 text-sm text-[rgb(139,42,42)]">
                    {run.errorMessage}
                  </p>
                ) : null}
              </div>
            ))
          )}
        </div>
      </section>
    </section>
  );
}
