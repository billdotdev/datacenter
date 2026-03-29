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

## Build and test

```bash
pnpm test -- src/lib/auth-flow.test.ts
pnpm build
```

## Image

The repo publishes `ghcr.io/billdotdev/datacenter-dashboard:main` from GitHub Actions. Container startup now runs `pnpm db:migrate` before `pnpm start`, so the dashboard needs `DATABASE_URL`, `BETTER_AUTH_SECRET`, and `BETTER_AUTH_URL` in-cluster.
