import { describe, expect, it } from "vitest";

import { developmentUserDefinitions, SHARED_DEVELOPMENT_PASSWORD } from "@/server/auth/dev-seed-data";
import {
  getLoginRouteRedirect,
  getProtectedRouteRedirect,
  getSafePostLoginRedirect
} from "@/server/auth/navigation";
import {
  AUTH_FAILURE_MESSAGE,
  loginWithPassword,
  normalizeEmail,
  logoutWithSessionToken,
  readAuthenticatedUser
} from "@/server/auth/service";
import { createTestAuthStore } from "@/tests/support/auth-test-store";

describe("auth service", () => {
  it("allows a valid seeded user to log in and returns a safe role and duty summary", async () => {
    const { store } = await createTestAuthStore();

    const result = await loginWithPassword(store, {
      email: "  MORGAN.MANAGER@LOCAL.TEST ",
      password: SHARED_DEVELOPMENT_PASSWORD
    });

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.user.email).toBe("morgan.manager@local.test");
    expect(result.user.roles).toEqual(["General Manager"]);
    expect(result.user.duties.all).toContain("Review today's dispatch board");
    expect("passwordHash" in result.user).toBe(false);
  });

  it("rejects invalid credentials without leaking whether email or password was wrong", async () => {
    const { store } = await createTestAuthStore();

    const result = await loginWithPassword(store, {
      email: "morgan.manager@local.test",
      password: "not-the-right-password"
    });

    expect(result).toEqual({
      ok: false,
      reason: "invalid_credentials",
      message: AUTH_FAILURE_MESSAGE
    });
  });

  it("rejects inactive users", async () => {
    const { store } = await createTestAuthStore();

    const result = await loginWithPassword(store, {
      email: "jamie.inactive@local.test",
      password: SHARED_DEVELOPMENT_PASSWORD
    });

    expect(result).toEqual({
      ok: false,
      reason: "inactive_user",
      message: AUTH_FAILURE_MESSAGE
    });
  });

  it("clears the session on logout", async () => {
    const { store } = await createTestAuthStore();
    const loginResult = await loginWithPassword(store, {
      email: "jordan.sales@local.test",
      password: SHARED_DEVELOPMENT_PASSWORD
    });

    expect(loginResult.ok).toBe(true);

    if (!loginResult.ok) {
      return;
    }

    const authenticatedBeforeLogout = await readAuthenticatedUser(store, loginResult.sessionToken);

    expect(authenticatedBeforeLogout?.email).toBe("jordan.sales@local.test");

    await logoutWithSessionToken(store, loginResult.sessionToken);

    const authenticatedAfterLogout = await readAuthenticatedUser(store, loginResult.sessionToken);

    expect(authenticatedAfterLogout).toBeNull();
  });

  it("redirects unauthenticated users away from protected routes", () => {
    expect(getProtectedRouteRedirect(null)).toBe("/login");
  });

  it("returns users to a safe local console after login", () => {
    expect(getSafePostLoginRedirect("/projects?view=board")).toBe("/projects?view=board");
    expect(getSafePostLoginRedirect("https://example.com/steal-session")).toBe("/board");
    expect(getSafePostLoginRedirect("//example.com/steal-session")).toBe("/board");
    expect(getSafePostLoginRedirect("/\\example.com/steal-session")).toBe("/board");
  });

  it("lets authenticated users stay on protected routes and redirects them away from login", async () => {
    const { store } = await createTestAuthStore();
    const loginResult = await loginWithPassword(store, {
      email: "casey.mechanic@local.test",
      password: SHARED_DEVELOPMENT_PASSWORD
    });

    expect(loginResult.ok).toBe(true);

    if (!loginResult.ok) {
      return;
    }

    const authenticatedUser = await readAuthenticatedUser(store, loginResult.sessionToken);

    expect(getProtectedRouteRedirect(authenticatedUser)).toBeNull();
    expect(getLoginRouteRedirect(authenticatedUser)).toBe("/board");
  });

  it("supports users with multiple roles", async () => {
    const { store } = await createTestAuthStore();
    const multiRoleDefinition = developmentUserDefinitions.find(
      (definition) => definition.email === "avery.ops@local.test"
    );

    expect(multiRoleDefinition?.roleNames.length).toBeGreaterThan(1);

    const result = await loginWithPassword(store, {
      email: "avery.ops@local.test",
      password: SHARED_DEVELOPMENT_PASSWORD
    });

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.user.roles).toEqual(
      expect.arrayContaining(["Marketing/Advertisement Manager", "Office Manager"])
    );
  });

  it("supports direct user duties in the authenticated summary", async () => {
    const { store } = await createTestAuthStore();
    const result = await loginWithPassword(store, {
      email: "casey.mechanic@local.test",
      password: SHARED_DEVELOPMENT_PASSWORD
    });

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.user.duties.direct).toContain("Review assigned repair and diagnostic tasks");
    expect(result.user.duties.all).toContain("Move finished repair work to Ready for Review");
  });

  it("normalizes email addresses for auth lookups", () => {
    expect(normalizeEmail("  TEAM@LOCAL.TEST ")).toBe("team@local.test");
  });
});
