export type AppRole = "admin" | "operator" | "viewer";

type ResolveAuthAccessInput = {
  hasUsers: boolean;
  pathname: string;
  role: AppRole | null;
};

type AuthAccessDecision =
  | {
      allow: true;
    }
  | {
      allow: false;
      redirectTo: "/setup" | "/login" | "/";
    };

export function resolveAuthAccess({
  hasUsers,
  pathname,
  role,
}: ResolveAuthAccessInput): AuthAccessDecision {
  if (!hasUsers) {
    if (pathname === "/setup") {
      return { allow: true };
    }

    return { allow: false, redirectTo: "/setup" };
  }

  if (!role) {
    if (pathname === "/login") {
      return { allow: true };
    }

    return { allow: false, redirectTo: "/login" };
  }

  if (pathname === "/login" || pathname === "/setup") {
    return { allow: false, redirectTo: "/" };
  }

  if (pathname.startsWith("/admin") && role !== "admin") {
    return { allow: false, redirectTo: "/" };
  }

  return { allow: true };
}
