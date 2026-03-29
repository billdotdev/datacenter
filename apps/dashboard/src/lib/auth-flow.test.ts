import { describe, expect, it } from "vitest";

import { resolveAuthAccess } from "./auth-flow";

describe("resolveAuthAccess", () => {
  it("redirects anonymous traffic to setup before the first admin exists", () => {
    expect(
      resolveAuthAccess({
        hasUsers: false,
        pathname: "/",
        role: null,
      })
    ).toEqual({
      allow: false,
      redirectTo: "/setup",
    });
  });

  it("redirects anonymous traffic to login after bootstrap", () => {
    expect(
      resolveAuthAccess({
        hasUsers: true,
        pathname: "/",
        role: null,
      })
    ).toEqual({
      allow: false,
      redirectTo: "/login",
    });
  });

  it("keeps authenticated users away from login and setup", () => {
    expect(
      resolveAuthAccess({
        hasUsers: true,
        pathname: "/login",
        role: "viewer",
      })
    ).toEqual({
      allow: false,
      redirectTo: "/",
    });

    expect(
      resolveAuthAccess({
        hasUsers: true,
        pathname: "/setup",
        role: "admin",
      })
    ).toEqual({
      allow: false,
      redirectTo: "/",
    });
  });

  it("blocks non-admin users from admin routes", () => {
    expect(
      resolveAuthAccess({
        hasUsers: true,
        pathname: "/admin",
        role: "viewer",
      })
    ).toEqual({
      allow: false,
      redirectTo: "/",
    });
  });

  it("allows admins into admin routes", () => {
    expect(
      resolveAuthAccess({
        hasUsers: true,
        pathname: "/admin",
        role: "admin",
      })
    ).toEqual({
      allow: true,
    });
  });
});
