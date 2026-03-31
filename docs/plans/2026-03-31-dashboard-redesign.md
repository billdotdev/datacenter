# Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `apps/dashboard` into the approved technical-minimalist operator console without changing route behavior or backend data flows.

**Architecture:** Introduce a shared light-only shell for authenticated routes, rebuild the global token layer around the approved brief, then restyle each major surface around dense tables, ledgers, and instrument-panel forms. Preserve existing route loaders/mutations and use only targeted tests where behavior or critical rendering contracts already exist.

**Tech Stack:** TanStack Start/Router, React 19, Tailwind v4, Vitest, Testing Library, Biome

---

## File Structure Map

### Create

- `apps/dashboard/src/components/AppShell.tsx` — authenticated app chrome with left rail, top command bar, placeholder navigation, and sign-out affordance
- `docs/plans/2026-03-31-dashboard-redesign.md` — this plan

### Modify

- `apps/dashboard/src/routes/__root.tsx` — swap the current header/footer wrapper for route-aware shell composition and fixed light theme initialization
- `apps/dashboard/src/components/Header.tsx` — reduce to shell-specific header primitives or remove if absorbed into `AppShell.tsx`
- `apps/dashboard/src/components/Footer.tsx` — remove or reduce if it conflicts with the approved shell
- `apps/dashboard/src/components/ThemeToggle.tsx` — delete usage and remove file if nothing imports it
- `apps/dashboard/src/styles.css` — replace lagoon/island tokens with the approved technical-minimalist token set and shell utility classes
- `apps/dashboard/src/routes/index.tsx` — remove the welcome hero and remap the route to the new operator overview layout
- `apps/dashboard/src/components/cluster-overview.tsx` — replace soft cards with KPI strip, dense node table, and application ledger
- `apps/dashboard/src/components/cluster-overview.test.tsx` — update assertions to lock the new home information architecture
- `apps/dashboard/src/routes/drills.tsx` — align page container and route framing to the new shell
- `apps/dashboard/src/components/drill-catalog.tsx` — convert stacked cards into compact operator workbench sections
- `apps/dashboard/src/components/drill-catalog.test.tsx` — preserve execute-target behavior while asserting the new dense drill surface
- `apps/dashboard/src/routes/admin.tsx` — replace hero-style admin screen with a narrow operational control panel
- `apps/dashboard/src/routes/login.tsx` — rebuild login into a sharp instrument-panel form
- `apps/dashboard/src/routes/setup.tsx` — rebuild bootstrap form into the same auth system

### Test / Verification Targets

- `apps/dashboard/src/components/cluster-overview.test.tsx`
- `apps/dashboard/src/components/drill-catalog.test.tsx`
- `pnpm --dir apps/dashboard test`
- `pnpm --dir apps/dashboard build`
- `pnpm --dir apps/dashboard check`

### Notes

- Do not add snapshot tests.
- Do not add tests for purely cosmetic shell rearrangements unless behavior changes.
- Keep placeholder navigation inert; do not wire fake routes.

### Task 1: Establish The Shared Light-Only Shell

**Files:**
- Create: `apps/dashboard/src/components/AppShell.tsx`
- Modify: `apps/dashboard/src/routes/__root.tsx`
- Modify: `apps/dashboard/src/components/Header.tsx`
- Modify: `apps/dashboard/src/components/Footer.tsx`
- Modify: `apps/dashboard/src/components/ThemeToggle.tsx`
- Modify: `apps/dashboard/src/styles.css`

- [ ] **Step 1: Add the authenticated shell component**

```tsx
import { Link, Outlet, useRouterState } from "@tanstack/react-router";

import { authClient } from "#/lib/auth-client";

const REAL_NAV = [
  { label: "Overview", to: "/" },
  { label: "Drills", to: "/drills" },
  { label: "Admin", to: "/admin" },
] as const;

const PLACEHOLDER_NAV = ["Telemetry", "Security", "Logs", "Deployment"] as const;

export function AppShell() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isAuthSurface = pathname === "/login" || pathname === "/setup";

  async function handleSignOut() {
    await authClient.signOut();
    window.location.href = "/login";
  }

  if (isAuthSurface) {
    return (
      <div className="auth-layout">
        <Outlet />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className="app-rail">
        <div className="app-rail__brand">
          <span className="app-rail__mark" />
          <div>
            <p className="app-rail__title">Architect</p>
            <p className="app-rail__meta">cluster-ops / stable</p>
          </div>
        </div>

        <nav className="app-rail__nav">
          {REAL_NAV.map((item) => (
            <Link key={item.to} to={item.to} className="app-rail__link" activeProps={{ className: "app-rail__link is-active" }}>
              {item.label}
            </Link>
          ))}
          {PLACEHOLDER_NAV.map((label) => (
            <span key={label} className="app-rail__link is-placeholder">
              {label}
            </span>
          ))}
        </nav>

        <div className="app-rail__utility">
          <span>docs</span>
          <span>support</span>
          <button type="button" className="app-rail__signout" onClick={handleSignOut}>
            sign out
          </button>
        </div>
      </aside>

      <div className="app-shell__main">
        <header className="topbar">
          <div className="topbar__section-label">Dashboard</div>
          <div className="topbar__tabs">
            <span className="is-active">Systems</span>
            <span>Assets</span>
            <span>Safety</span>
          </div>
          <div className="topbar__status">Safety: nominal</div>
        </header>

        <Outlet />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Use the shell in the root route and force light mode**

```tsx
import { AppShell } from "../components/AppShell";

const THEME_INIT_SCRIPT = `(function(){try{var root=document.documentElement;root.classList.remove('dark');root.classList.add('light');root.setAttribute('data-theme','light');root.style.colorScheme='light';window.localStorage.removeItem('theme');}catch(e){}})();`;

function RootDocument() {
  return (
    <html lang="en" className="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <HeadContent />
      </head>
      <body className="dashboard-body">
        <TanStackQueryProvider>
          <AppShell />
          <TanStackDevtools
            config={{
              position: "bottom-right",
            }}
            plugins={[
              {
                name: "Tanstack Router",
                render: <TanStackRouterDevtoolsPanel />,
              },
              TanStackQueryDevtools,
            ]}
          />
        </TanStackQueryProvider>
        <Scripts />
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Rewrite the global tokens and shell utility classes**

```css
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap");

:root {
  --background: #f8f9fa;
  --surface: #ffffff;
  --surface-container-low: #f1f4f6;
  --surface-container: #eaeff1;
  --surface-container-high: #e2e9ec;
  --primary: #0053db;
  --primary-container: #dbe1ff;
  --outline: #737c7f;
  --outline-variant: #abb3b7;
  --foreground: #2b3437;
  --foreground-muted: #586064;
  --error: #9f403d;
  --error-container: #fe8983;
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
}

body {
  margin: 0;
  font-family: "Inter", sans-serif;
  color: var(--foreground);
  background: var(--background);
}

.app-shell {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 15rem 1fr;
}

.app-rail,
.topbar,
.panel,
.ledger,
.kpi-strip > article {
  border: 1px solid color-mix(in srgb, var(--outline-variant) 35%, transparent);
  background: var(--surface);
  box-shadow: none;
}
```

- [ ] **Step 4: Remove theme-toggle usage and old decorative shell pieces**

```tsx
// Header.tsx
export default function Header() {
  return null;
}

// Footer.tsx
export default function Footer() {
  return null;
}
```

- [ ] **Step 5: Verify the shared shell compiles cleanly**

Run: `pnpm --dir apps/dashboard build`
Expected: build completes with no references to `ThemeToggle` and no Tailwind/classname compile errors

- [ ] **Step 6: Commit**

```bash
git add apps/dashboard/src/components/AppShell.tsx apps/dashboard/src/routes/__root.tsx apps/dashboard/src/components/Header.tsx apps/dashboard/src/components/Footer.tsx apps/dashboard/src/components/ThemeToggle.tsx apps/dashboard/src/styles.css
git commit -m "feat: add technical minimalist app shell"
```

### Task 2: Rebuild The Home Route Around KPI + Ledger Layout

**Files:**
- Modify: `apps/dashboard/src/routes/index.tsx`
- Modify: `apps/dashboard/src/components/cluster-overview.tsx`
- Test: `apps/dashboard/src/components/cluster-overview.test.tsx`

- [ ] **Step 1: Update the home component test to describe the new information architecture**

```tsx
it("renders the operator overview with KPI strip, nodes table, and application ledger", () => {
  render(
    <ClusterOverview
      cluster={clusterFixture}
      error={null}
      isRefreshing={false}
    />,
  );

  expect(screen.getByText("Compute Nodes Activity")).toBeTruthy();
  expect(screen.getByText("Argo Application Ledger")).toBeTruthy();
  expect(screen.getByText("Cluster Health")).toBeTruthy();
  expect(screen.queryByText("Cluster Summary")).toBeNull();
});
```

- [ ] **Step 2: Run the home test to verify it fails**

Run: `pnpm --dir apps/dashboard test src/components/cluster-overview.test.tsx`
Expected: FAIL because the current component still renders the old `"Cluster Summary"` card layout

- [ ] **Step 3: Replace the welcome hero and rebuild `ClusterOverview`**

```tsx
// routes/index.tsx
return (
  <main className="workspace">
    <ClusterOverview
      cluster={query.data.cluster}
      error={query.error instanceof Error ? query.error.message : null}
      isRefreshing={query.isFetching}
    />
  </main>
);

// components/cluster-overview.tsx
export function ClusterOverview({ cluster, error, isRefreshing }: ClusterOverviewProps) {
  const metrics = [
    ["Cluster Health", `${cluster.summary.healthyApplicationCount}/${cluster.summary.applicationCount}`],
    ["Ready Nodes", String(cluster.summary.readyNodeCount)],
    ["Healthy Apps", String(cluster.summary.healthyApplicationCount)],
    ["Alerts", String(cluster.summary.degradedApplicationCount + cluster.summary.notReadyNodeCount)],
  ] as const;

  return (
    <section className="workspace-stack">
      <div className="kpi-strip">
        {metrics.map(([label, value]) => (
          <article key={label}>
            <p className="eyebrow">{label}</p>
            <p className="metric-value">{value}</p>
          </article>
        ))}
      </div>

      {error ? <div className="alert-block">{error}</div> : null}

      <div className="workspace-grid">
        <section className="panel">
          <div className="panel__header">
            <h2>Compute Nodes Activity</h2>
            <p className="mono-meta">{isRefreshing ? "refreshing" : cluster.summary.lastRefreshedAt}</p>
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
            <h2>Argo Application Ledger</h2>
          </div>
          {cluster.applications.map((application) => (
            <article key={application.name} className="ledger__row">
              <strong>{application.name}</strong>
              <span className="mono-meta">
                {application.syncStatus} / {application.healthStatus}
              </span>
            </article>
          ))}
        </section>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run the home test to verify it passes**

Run: `pnpm --dir apps/dashboard test src/components/cluster-overview.test.tsx`
Expected: PASS with the new KPI/table/ledger assertions green

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/src/routes/index.tsx apps/dashboard/src/components/cluster-overview.tsx apps/dashboard/src/components/cluster-overview.test.tsx
git commit -m "feat: redesign dashboard home overview"
```

### Task 3: Convert Drills And Admin Into Operational Control Surfaces

**Files:**
- Modify: `apps/dashboard/src/routes/drills.tsx`
- Modify: `apps/dashboard/src/components/drill-catalog.tsx`
- Modify: `apps/dashboard/src/routes/admin.tsx`
- Test: `apps/dashboard/src/components/drill-catalog.test.tsx`

- [ ] **Step 1: Tighten the drill-catalog test around the new dense surface while preserving execute behavior**

```tsx
it("renders a dense workbench and still executes the selected target", () => {
  const onExecute = vi.fn();

  render(
    <DrillCatalog
      data={catalogFixture}
      error={null}
      isRefreshing={false}
      onExecute={onExecute}
      onToggleSafety={vi.fn()}
      role="operator"
      toggleBusy={false}
    />,
  );

  expect(screen.getByText("Manual Drill Workbench")).toBeTruthy();
  expect(screen.getByText("Recent Drill Runs")).toBeTruthy();

  fireEvent.change(screen.getByLabelText("Target for Delete One Pod"), {
    target: { value: "loki" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Execute drill" }));
  expect(onExecute).toHaveBeenCalledWith("pod-delete", "loki");
});
```

- [ ] **Step 2: Run the drill test to verify it fails**

Run: `pnpm --dir apps/dashboard test src/components/drill-catalog.test.tsx`
Expected: FAIL because the current component still renders the old `"First controlled write path"` surface

- [ ] **Step 3: Rebuild the drill workbench and admin control panel**

```tsx
// components/drill-catalog.tsx
return (
  <section className="workspace-stack">
    <header className="panel panel--header">
      <div>
        <p className="eyebrow">Manual drills</p>
        <h1>Manual Drill Workbench</h1>
      </div>
      <div className="toolbar">
        <span className="mono-chip">
          safety {data.disruptiveActionsEnabled ? "enabled" : "disabled"}
        </span>
        {role === "admin" ? (
          <Button variant="outline" size="sm" onClick={() => onToggleSafety(!data.disruptiveActionsEnabled)}>
            {data.disruptiveActionsEnabled ? "Disable disruptive actions" : "Enable disruptive actions"}
          </Button>
        ) : null}
      </div>
    </header>

    <div className="workspace-grid">
      <section className="panel">
        {data.drills.map((drill) => (
          <article key={drill.key} className="drill-row">
            <div>
              <p className="eyebrow">{drill.kind}</p>
              <h2>{drill.name}</h2>
              <p>{drill.blastRadiusSummary}</p>
            </div>
            <div className="drill-row__controls">
              <label htmlFor={`target-${drill.key}`} className="field__label">
                Target
              </label>
              <select
                id={`target-${drill.key}`}
                defaultValue={drill.targets[0]?.key}
                className="drill-row__select"
              >
                {drill.targets.map((target) => (
                  <option key={target.key} value={target.key}>
                    {target.name} · {target.targetSummary}
                  </option>
                ))}
              </select>
              <Button
                onClick={() => {
                  const element = document.getElementById(`target-${drill.key}`) as HTMLSelectElement | null;
                  onExecute(drill.key, element?.value ?? drill.targets[0]?.key ?? "");
                }}
              >
                Execute drill
              </Button>
            </div>
          </article>
        ))}
      </section>

      <section className="ledger">
        <div className="panel__header">
          <h2>Recent Drill Runs</h2>
        </div>
        {data.runs.map((run) => (
          <div key={run.id} className="ledger__row">
            <strong>{run.requestedByName}</strong>
            <span className="mono-meta">{run.status}</span>
          </div>
        ))}
      </section>
    </div>
  </section>
);

// routes/admin.tsx
return (
  <main className="workspace workspace--narrow">
    <section className="panel control-panel">
      <p className="eyebrow">Admin</p>
      <h1>Disruptive Actions Gate</h1>
      <p className="mono-meta">{authPage.session?.user.email}</p>
      <p>Manual drill requests fail closed when this control is disabled.</p>
      <div className="toolbar">
        <Button onClick={() => toggleMutation.mutate(!enabled)}>
          {enabled ? "Disable disruptive actions" : "Enable disruptive actions"}
        </Button>
        <Button asChild variant="outline">
          <Link to="/drills">View drills</Link>
        </Button>
      </div>
    </section>
  </main>
);
```

- [ ] **Step 4: Run the drill test and app build**

Run: `pnpm --dir apps/dashboard test src/components/drill-catalog.test.tsx`
Expected: PASS with execute-target behavior intact

Run: `pnpm --dir apps/dashboard build`
Expected: PASS with drills/admin route imports and shell layout compiling

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/src/routes/drills.tsx apps/dashboard/src/components/drill-catalog.tsx apps/dashboard/src/components/drill-catalog.test.tsx apps/dashboard/src/routes/admin.tsx
git commit -m "feat: redesign drill and admin surfaces"
```

### Task 4: Rebuild Login And Setup As Instrument-Panel Forms

**Files:**
- Modify: `apps/dashboard/src/routes/login.tsx`
- Modify: `apps/dashboard/src/routes/setup.tsx`
- Modify: `apps/dashboard/src/components/ui/button.tsx`
- Modify: `apps/dashboard/src/components/ui/input.tsx`
- Modify: `apps/dashboard/src/components/ui/label.tsx`

- [ ] **Step 1: Tighten the shared form primitives to match the approved system**

```tsx
// components/ui/button.tsx
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-[6px] border text-[12px] font-semibold uppercase tracking-[0.08em] transition-colors disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "border-primary bg-primary text-white hover:bg-[#0048c1]",
        outline: "border-[color:var(--outline-variant)] bg-white text-[color:var(--foreground)] hover:bg-[color:var(--surface-container-low)]",
      },
      size: {
        default: "h-9 px-4",
        sm: "h-8 px-3",
      },
    },
  },
);

// components/ui/input.tsx
className={cn(
  "h-9 rounded-[6px] border border-[color:var(--outline-variant)] bg-white px-3 text-sm shadow-none outline-none focus-visible:border-[color:var(--primary)] focus-visible:ring-0",
  className,
)}

// components/ui/label.tsx
className={cn(
  "flex items-center text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--foreground-muted)]",
  className,
)}
```

- [ ] **Step 2: Rewrite the login and setup forms around the new auth-surface layout**

```tsx
// routes/login.tsx
return (
  <main className="auth-panel">
    <section className="panel auth-card">
      <p className="eyebrow">Login</p>
      <h1>Dashboard Sign In</h1>
      <p className="auth-card__meta">local account / better-auth / postgres</p>
      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="field">
          <Label htmlFor="email" className="field__label">Email</Label>
          <Input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </div>
        <div className="field">
          <Label htmlFor="password" className="field__label">Password</Label>
          <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        </div>
        {error ? <div className="alert-block">{error}</div> : null}
        <Button className="w-full" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </section>
  </main>
);

// routes/setup.tsx
return (
  <main className="auth-panel auth-panel--wide">
    <section className="panel auth-card">
      <p className="eyebrow">First Admin</p>
      <h1>Bootstrap Dashboard Admin</h1>
      <p className="auth-card__meta">restricted route / first user only</p>
      <form className="auth-grid" onSubmit={handleSubmit}>
        <div className="field field--full">
          <Label htmlFor="name" className="field__label">Full name</Label>
          <Input id="name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required />
        </div>
        <div className="field field--full">
          <Label htmlFor="email" className="field__label">Email</Label>
          <Input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </div>
        <div className="field">
          <Label htmlFor="password" className="field__label">Password</Label>
          <Input id="password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        </div>
        <div className="field">
          <Label htmlFor="confirm-password" className="field__label">Confirm password</Label>
          <Input id="confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
        </div>
        {error ? <div className="alert-block field--full">{error}</div> : null}
        <Button className="field--full" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating admin..." : "Create bootstrap admin"}
        </Button>
      </form>
    </section>
  </main>
);
```

- [ ] **Step 3: Run full verification for the redesign**

Run: `pnpm --dir apps/dashboard test`
Expected: PASS with updated `cluster-overview` and `drill-catalog` tests and no regressions in existing suite

Run: `pnpm --dir apps/dashboard build`
Expected: PASS with all routes compiling in light-only mode

Run: `pnpm --dir apps/dashboard check`
Expected: PASS with Biome formatting/linting clean

- [ ] **Step 4: Commit**

```bash
git add apps/dashboard/src/routes/login.tsx apps/dashboard/src/routes/setup.tsx apps/dashboard/src/components/ui/button.tsx apps/dashboard/src/components/ui/input.tsx apps/dashboard/src/components/ui/label.tsx
git commit -m "feat: redesign auth surfaces"
```
