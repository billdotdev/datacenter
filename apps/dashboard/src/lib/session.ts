import { count, eq } from "drizzle-orm";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

import { db } from "#/db";
import { user } from "#/db/schema";
import { auth } from "#/lib/auth";
import { readClusterSnapshot } from "#/lib/cluster/read-cluster-snapshot";
import { resolveAuthAccess, type AppRole } from "#/lib/auth-flow";

type AuthPageInput = {
  pathname: string;
};

type BootstrapAdminInput = {
  email: string;
  name: string;
  password: string;
};

function coerceRole(role: string | null | undefined): AppRole | null {
  if (role === "admin" || role === "operator" || role === "viewer") {
    return role;
  }

  return null;
}

async function getAuthSnapshot(request: Request) {
  const [{ totalUsers }] = await db.select({ totalUsers: count() }).from(user);
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  const role = coerceRole(session?.user.role);

  return {
    hasUsers: totalUsers > 0,
    role,
    session: session
      ? {
          session: session.session,
          user: {
            email: session.user.email,
            id: session.user.id,
            name: session.user.name,
            role,
          },
        }
      : null,
  };
}

export const readAuthPage = createServerFn({ method: "GET" })
  .inputValidator((data: AuthPageInput) => data)
  .handler(async ({ data }) => {
    const snapshot = await getAuthSnapshot(getRequest());
    const decision = resolveAuthAccess({
      hasUsers: snapshot.hasUsers,
      pathname: data.pathname,
      role: snapshot.role,
    });

    return {
      ...snapshot,
      decision,
    };
  });

export const bootstrapAdmin = createServerFn({ method: "POST" })
  .inputValidator((data: BootstrapAdminInput) => data)
  .handler(async ({ data }) => {
    const request = getRequest();
    const snapshot = await getAuthSnapshot(request);

    if (snapshot.hasUsers) {
      throw new Error("Bootstrap already completed");
    }

    const result = await auth.api.signUpEmail({
      body: {
        email: data.email,
        name: data.name,
        password: data.password,
      },
      headers: request.headers,
    });

    await db
      .update(user)
      .set({
        role: "admin",
      })
      .where(eq(user.id, result.user.id));

    return {
      ok: true,
    };
  });

export const readDashboardHome = createServerFn({ method: "GET" }).handler(
  async () => {
    const snapshot = await getAuthSnapshot(getRequest());

    if (!snapshot.session) {
      throw new Error("Unauthenticated");
    }

    return {
      cluster: await readClusterSnapshot(),
      session: snapshot.session,
    };
  },
);
