# Datacenter Dashboard

## Local dev

Copy `.env.example` to `.env.local`, fill `DATABASE_URL`, `BETTER_AUTH_SECRET`, and `BETTER_AUTH_URL`, then run:

```bash
pnpm install
pnpm db:migrate
pnpm dev
```

Generate a secret with:

```bash
pnpm dlx @better-auth/cli@latest secret
```

## Auth shape

- Better Auth email/password
- PostgreSQL-backed `user`, `session`, `account`, `verification`
- first-user bootstrap at `/setup`
- login at `/login`
- admin-only placeholder at `/admin`

The app mounts Better Auth at `/api/auth/*` and stores a `role` field on the Better Auth `user` row. First bootstrap user is promoted to `admin`; later users default to `viewer`.

## Phase 3 Read APIs

The homepage now reads cluster state through the app backend using
`@kubernetes/client-node`.

Current live slice:

- cluster summary
- node list
- Argo CD application list

Refresh behavior:

- initial SSR load
- client polling every 20 seconds

## Phase 4 Drill Execution

The dashboard now exposes a dedicated `/drills` route for the first controlled
write path.

Current drill slice:

- one seeded drill: `pod-delete-dashboard`
- `viewer` can read catalog and run history only
- `operator` and `admin` can execute when disruptive actions are enabled
- `admin` can toggle the global disruptive actions safety gate

Execution backend:

- app-owned PostgreSQL drill definitions, runs, and audit log
- backend-created Chaos Mesh `PodChaos`
- fixed allowlist target: dashboard pods in namespace `dashboard`

## Build and test

```bash
pnpm test -- src/lib/auth-flow.test.ts
pnpm test -- src/lib/cluster/derive-cluster-snapshot.test.ts
pnpm test -- src/lib/cluster/read-cluster-snapshot.test.ts
pnpm test -- src/lib/drills/policy.test.ts
pnpm test -- src/lib/drills/chaos-client.test.ts
pnpm test -- src/lib/drills/service.test.ts
pnpm test -- src/components/cluster-overview.test.tsx
pnpm test -- src/components/drill-catalog.test.tsx
pnpm build
```

## Image

The repo publishes `ghcr.io/billdotdev/datacenter-dashboard:main` from GitHub Actions. Container startup now runs `pnpm db:migrate` before `pnpm start`, so the dashboard needs `DATABASE_URL`, `BETTER_AUTH_SECRET`, and `BETTER_AUTH_URL` in-cluster.
