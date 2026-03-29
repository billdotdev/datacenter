# Dashboard Auth Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add real Better Auth email/password authentication to the dashboard using PostgreSQL-backed users and sessions, plus first-admin bootstrap and role-aware session enforcement.

**Architecture:** Keep Better Auth as the auth boundary inside `apps/dashboard/`, back it with PostgreSQL through Drizzle, and expose only app-server auth routes to the browser. Introduce a small app-owned auth schema for roles/bootstrap state, use Better Auth tables for users/sessions/accounts, and gate dashboard pages through server-side session checks before any cluster APIs or admin UI are added.

**Tech Stack:** TanStack Start, Better Auth, PostgreSQL, Drizzle ORM, drizzle-kit, TypeScript, React

---

### Task 1: Replace Scaffold DB Schema With Auth-Capable App Schema

**Files:**

- Modify: `apps/dashboard/src/db/schema.ts`
- Modify: `apps/dashboard/src/db/index.ts`
- Create: `apps/dashboard/drizzle/0000_auth_schema.sql`
- Create: `tests/dashboard/test_auth_schema.sh`

- [ ] **Step 1: Write the failing test**

```bash
#!/usr/bin/env bash
set -euo pipefail

test -f apps/dashboard/src/db/schema.ts
test -f apps/dashboard/drizzle/0000_auth_schema.sql

grep -q "users" apps/dashboard/src/db/schema.ts
grep -q "user_roles" apps/dashboard/src/db/schema.ts
grep -q "bootstrap_state" apps/dashboard/src/db/schema.ts
grep -q "role" apps/dashboard/src/db/schema.ts
grep -q "CREATE TABLE" apps/dashboard/drizzle/0000_auth_schema.sql
grep -q "user_roles" apps/dashboard/drizzle/0000_auth_schema.sql
grep -q "bootstrap_state" apps/dashboard/drizzle/0000_auth_schema.sql
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bash tests/dashboard/test_auth_schema.sh`
Expected: FAIL because the current schema still contains the scaffold `todos` table only.

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/dashboard/src/db/schema.ts
import {
  boolean,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["admin", "operator", "viewer"]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    emailIdx: uniqueIndex("users_email_idx").on(table.email),
  })
);

export const userRoles = pgTable("user_roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  role: roleEnum("role").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const bootstrapState = pgTable("bootstrap_state", {
  id: uuid("id").defaultRandom().primaryKey(),
  adminCreated: boolean("admin_created").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
```

```sql
-- apps/dashboard/drizzle/0000_auth_schema.sql
CREATE TYPE role AS ENUM ('admin', 'operator', 'viewer');

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX users_email_idx ON users(email);

CREATE TABLE user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE bootstrap_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_created boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bash tests/dashboard/test_auth_schema.sh`
Expected: PASS with no output.

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/src/db/schema.ts apps/dashboard/src/db/index.ts apps/dashboard/drizzle/0000_auth_schema.sql tests/dashboard/test_auth_schema.sh
git commit -m "feat: add dashboard auth schema"
```

### Task 2: Wire Better Auth To PostgreSQL And Real Server Routes

**Files:**

- Modify: `apps/dashboard/src/lib/auth.ts`
- Modify: `apps/dashboard/src/lib/auth-client.ts`
- Create: `apps/dashboard/src/routes/api/auth/$.ts`
- Create: `apps/dashboard/src/lib/session.ts`
- Create: `tests/dashboard/test_auth_server_files.sh`

- [ ] **Step 1: Write the failing test**

```bash
#!/usr/bin/env bash
set -euo pipefail

test -f apps/dashboard/src/routes/api/auth/\$.ts
test -f apps/dashboard/src/lib/session.ts

grep -q "database:" apps/dashboard/src/lib/auth.ts
grep -q "db:" apps/dashboard/src/lib/auth.ts
grep -q "BETTER_AUTH_SECRET" apps/dashboard/src/lib/auth.ts
grep -q "createAuthClient" apps/dashboard/src/lib/auth-client.ts
grep -q "baseURL" apps/dashboard/src/lib/auth-client.ts
grep -q "auth.handler" apps/dashboard/src/routes/api/auth/\$.ts
grep -q "getSession" apps/dashboard/src/lib/session.ts
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bash tests/dashboard/test_auth_server_files.sh`
Expected: FAIL because Better Auth is not yet connected to PostgreSQL and the API route/session helper are incomplete or missing.

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/dashboard/src/lib/auth.ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { db } from "#/db";

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [tanstackStartCookies()],
});
```

```ts
// apps/dashboard/src/lib/auth-client.ts
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: "/",
});
```

```ts
// apps/dashboard/src/routes/api/auth/$.ts
import { createFileRoute } from "@tanstack/react-router";
import { auth } from "#/lib/auth";

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request }) => auth.handler(request),
      POST: ({ request }) => auth.handler(request),
    },
  },
});
```

```ts
// apps/dashboard/src/lib/session.ts
import { auth } from "#/lib/auth";

export async function getSession(request: Request) {
  return auth.api.getSession({
    headers: request.headers,
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bash tests/dashboard/test_auth_server_files.sh`
Expected: PASS with no output.

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/src/lib/auth.ts apps/dashboard/src/lib/auth-client.ts apps/dashboard/src/routes/api/auth/\$.ts apps/dashboard/src/lib/session.ts tests/dashboard/test_auth_server_files.sh
git commit -m "feat: wire dashboard better auth"
```

### Task 3: Add Environment Contract And First-Admin Bootstrap Flow

**Files:**

- Modify: `apps/dashboard/README.md`
- Create: `apps/dashboard/.env.example`
- Create: `apps/dashboard/src/lib/bootstrap-admin.ts`
- Create: `apps/dashboard/src/routes/setup.tsx`
- Create: `tests/dashboard/test_auth_bootstrap_files.sh`

- [ ] **Step 1: Write the failing test**

```bash
#!/usr/bin/env bash
set -euo pipefail

test -f apps/dashboard/.env.example
test -f apps/dashboard/src/lib/bootstrap-admin.ts
test -f apps/dashboard/src/routes/setup.tsx

grep -q '^DATABASE_URL=' apps/dashboard/.env.example
grep -q '^BETTER_AUTH_SECRET=' apps/dashboard/.env.example
grep -q '^BETTER_AUTH_URL=' apps/dashboard/.env.example
grep -q 'bootstrap admin' apps/dashboard/src/routes/setup.tsx
grep -q 'adminCreated' apps/dashboard/src/lib/bootstrap-admin.ts
grep -q 'BETTER_AUTH_SECRET' apps/dashboard/README.md
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bash tests/dashboard/test_auth_bootstrap_files.sh`
Expected: FAIL because the app lacks an app-local env example and bootstrap-admin flow.

- [ ] **Step 3: Write minimal implementation**

```env
DATABASE_URL=postgres://datacenter:<password>@datacenter-postgres-rw.database.svc.cluster.local:5432/datacenter
BETTER_AUTH_SECRET=replace-with-generated-secret
BETTER_AUTH_URL=https://dashboard.datacenter.lan
```

```ts
// apps/dashboard/src/lib/bootstrap-admin.ts
import { db } from "#/db";
import { bootstrapState, userRoles } from "#/db/schema";

export async function isAdminBootstrapped() {
  const rows = await db.select().from(bootstrapState);
  return rows.some((row) => row.adminCreated);
}

export async function markAdminBootstrapped(userId: string) {
  await db.insert(userRoles).values({
    userId,
    role: "admin",
  });

  await db.insert(bootstrapState).values({
    adminCreated: true,
  });
}
```

```tsx
// apps/dashboard/src/routes/setup.tsx
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/setup")({
  component: SetupPage,
});

function SetupPage() {
  return (
    <main>
      <h1>bootstrap admin</h1>
      <p>First-run admin bootstrap lives here.</p>
    </main>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bash tests/dashboard/test_auth_bootstrap_files.sh`
Expected: PASS with no output.

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/.env.example apps/dashboard/src/lib/bootstrap-admin.ts apps/dashboard/src/routes/setup.tsx apps/dashboard/README.md tests/dashboard/test_auth_bootstrap_files.sh
git commit -m "feat: add dashboard auth bootstrap flow"
```

### Task 4: Add Session-Aware Header And Login/Logout Screens

**Files:**

- Modify: `apps/dashboard/src/components/Header.tsx`
- Modify: `apps/dashboard/src/integrations/better-auth/header-user.tsx`
- Create: `apps/dashboard/src/routes/login.tsx`
- Create: `apps/dashboard/src/routes/logout.tsx`
- Create: `tests/dashboard/test_auth_ui_files.sh`

- [ ] **Step 1: Write the failing test**

```bash
#!/usr/bin/env bash
set -euo pipefail

test -f apps/dashboard/src/routes/login.tsx
test -f apps/dashboard/src/routes/logout.tsx

grep -q 'BetterAuthHeader' apps/dashboard/src/components/Header.tsx
grep -q 'useSession' apps/dashboard/src/integrations/better-auth/header-user.tsx
grep -q 'signIn.email' apps/dashboard/src/routes/login.tsx
grep -q 'signOut' apps/dashboard/src/routes/logout.tsx
grep -q '/login' apps/dashboard/src/components/Header.tsx
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bash tests/dashboard/test_auth_ui_files.sh`
Expected: FAIL because the live shell currently removed auth UI wiring.

- [ ] **Step 3: Write minimal implementation**

```tsx
// apps/dashboard/src/components/Header.tsx
import BetterAuthHeader from "../integrations/better-auth/header-user";
```

```tsx
// apps/dashboard/src/routes/login.tsx
import { createFileRoute } from "@tanstack/react-router";
import { authClient } from "#/lib/auth-client";
```

```tsx
// apps/dashboard/src/routes/logout.tsx
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { authClient } from "#/lib/auth-client";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bash tests/dashboard/test_auth_ui_files.sh`
Expected: PASS with no output.

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/src/components/Header.tsx apps/dashboard/src/integrations/better-auth/header-user.tsx apps/dashboard/src/routes/login.tsx apps/dashboard/src/routes/logout.tsx tests/dashboard/test_auth_ui_files.sh
git commit -m "feat: add dashboard auth ui"
```

### Task 5: Enforce Session Gates On Dashboard Pages

**Files:**

- Modify: `apps/dashboard/src/routes/__root.tsx`
- Modify: `apps/dashboard/src/routes/index.tsx`
- Modify: `apps/dashboard/src/routes/about.tsx`
- Create: `apps/dashboard/src/routes/_authed.tsx`
- Create: `tests/dashboard/test_auth_route_guards.sh`

- [ ] **Step 1: Write the failing test**

```bash
#!/usr/bin/env bash
set -euo pipefail

test -f apps/dashboard/src/routes/_authed.tsx

grep -q 'beforeLoad' apps/dashboard/src/routes/_authed.tsx
grep -q 'redirect' apps/dashboard/src/routes/_authed.tsx
grep -q '/login' apps/dashboard/src/routes/_authed.tsx
grep -q '/setup' apps/dashboard/src/routes/_authed.tsx
grep -q 'createFileRoute' apps/dashboard/src/routes/index.tsx
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bash tests/dashboard/test_auth_route_guards.sh`
Expected: FAIL because the current shell is publicly accessible.

- [ ] **Step 3: Write minimal implementation**

```tsx
// apps/dashboard/src/routes/_authed.tsx
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed")({
  beforeLoad: async ({ location }) => {
    const isSetup = location.pathname === "/setup";
    const isLogin = location.pathname === "/login";

    if (isSetup || isLogin) {
      return;
    }

    throw redirect({
      to: "/login",
    });
  },
  component: Outlet,
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bash tests/dashboard/test_auth_route_guards.sh`
Expected: PASS with no output.

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/src/routes/__root.tsx apps/dashboard/src/routes/index.tsx apps/dashboard/src/routes/about.tsx apps/dashboard/src/routes/_authed.tsx tests/dashboard/test_auth_route_guards.sh
git commit -m "feat: gate dashboard routes behind auth"
```

### Task 6: Verify Auth Slice End To End

**Files:**

- Modify: `apps/dashboard/README.md`

- [ ] **Step 1: Run dashboard auth file checks**

Run: `bash tests/dashboard/test_auth_schema.sh && bash tests/dashboard/test_auth_server_files.sh && bash tests/dashboard/test_auth_bootstrap_files.sh && bash tests/dashboard/test_auth_ui_files.sh && bash tests/dashboard/test_auth_route_guards.sh`
Expected: PASS with no output.

- [ ] **Step 2: Run application build**

Run: `pnpm build`
Expected: PASS and emit client/server bundles.

- [ ] **Step 3: Render deployment manifests**

Run: `kubectl kustomize apps/dashboard/k8s >/dev/null && kubectl kustomize clusters/datacenter >/dev/null`
Expected: PASS with no output.

- [ ] **Step 4: Verify auth env contract**

Run: `rg -n '^DATABASE_URL=|^BETTER_AUTH_SECRET=|^BETTER_AUTH_URL=' apps/dashboard/.env.example`
Expected: all required auth env vars present.

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/README.md apps/dashboard/.env.example
git commit -m "docs: verify dashboard auth phase 2"
```
