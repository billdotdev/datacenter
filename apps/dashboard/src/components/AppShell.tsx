import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { authClient } from "#/lib/auth-client";

const REAL_NAV = [
	{ label: "Overview", to: "/" },
	{ label: "Drills", to: "/drills" },
	{ label: "Admin", to: "/admin" },
] as const;

const PLACEHOLDER_NAV = [
	"Telemetry",
	"Security",
	"Logs",
	"Deployment",
] as const;

const SECTION_META = {
	"/": {
		title: "Overview",
		tabs: ["Systems", "Assets", "Safety"],
	},
	"/admin": {
		title: "Admin",
		tabs: ["Policy", "Safety", "Access"],
	},
	"/drills": {
		title: "Drills",
		tabs: ["Catalog", "Runs", "Safety"],
	},
} as const;

type AppShellProps = {
	children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
	const pathname = useRouterState({
		select: (state) => state.location.pathname,
	});
	const isAuthSurface = pathname === "/login" || pathname === "/setup";
	const sectionMeta =
		SECTION_META[pathname as keyof typeof SECTION_META] ?? SECTION_META["/"];

	async function handleSignOut() {
		await authClient.signOut();
		window.location.href = "/login";
	}

	if (isAuthSurface) {
		return <div className="auth-layout">{children}</div>;
	}

	return (
		<div className="app-shell">
			<aside className="app-rail">
				<div className="app-rail__brand">
					<span aria-hidden="true" className="app-rail__mark" />
					<div>
						<p className="app-rail__title">Architect</p>
						<p className="app-rail__meta">cluster-ops / stable</p>
					</div>
				</div>

				<nav aria-label="Primary" className="app-rail__nav">
					{REAL_NAV.map((item) => (
						<Link
							key={item.to}
							to={item.to}
							className="app-rail__link"
							activeProps={{ className: "app-rail__link is-active" }}
						>
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
					<span>Docs</span>
					<span>Support</span>
					<button
						type="button"
						className="app-rail__signout"
						onClick={handleSignOut}
					>
						Sign Out
					</button>
				</div>
			</aside>

			<div className="app-shell__main">
				<header className="topbar">
					<div className="topbar__section">
						<p className="topbar__eyebrow">Dashboard</p>
						<h1 className="topbar__title">{sectionMeta.title}</h1>
					</div>

					<div className="topbar__tabs" aria-hidden="true">
						{sectionMeta.tabs.map((tab, index) => (
							<span
								key={tab}
								className={
									index === 0 ? "topbar__tab is-active" : "topbar__tab"
								}
							>
								{tab}
							</span>
						))}
					</div>

					<div className="topbar__status">Safety: nominal</div>
				</header>

				{children}
			</div>
		</div>
	);
}
