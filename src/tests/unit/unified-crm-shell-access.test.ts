import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import {
  resolveUnifiedCrmShellAccess,
  resolveUnifiedCrmShellMode
} from "@/server/unified-crm/shell-access";

function user(roles: string[], overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: "user-1",
    name: "CRM Shell User",
    email: "crm-shell@example.test",
    isActive: true,
    roles,
    duties: { direct: [], roleDefaults: [], all: [] },
    ...overrides
  };
}

describe("Unified CRM shell access", () => {
  it("defaults production to OFF and safe nonproduction environments to REVIEW", () => {
    expect(resolveUnifiedCrmShellMode({ nodeEnv: "production" })).toBe("OFF");
    expect(resolveUnifiedCrmShellMode({ nodeEnv: "test" })).toBe("REVIEW");
    expect(resolveUnifiedCrmShellMode({ nodeEnv: "development" })).toBe("REVIEW");
  });

  it("honors only an explicit REVIEW value and fails invalid configuration closed", () => {
    expect(resolveUnifiedCrmShellMode({ nodeEnv: "production", shellMode: "REVIEW" })).toBe("REVIEW");
    expect(resolveUnifiedCrmShellMode({ nodeEnv: "test", shellMode: "OFF" })).toBe("OFF");
    expect(resolveUnifiedCrmShellMode({ nodeEnv: "test", shellMode: "enabled" })).toBe("OFF");
    expect(resolveUnifiedCrmShellMode({ nodeEnv: "test", shellMode: true })).toBe("OFF");
  });

  it("opens REVIEW only for an eligible Management or Sales actor", () => {
    expect(resolveUnifiedCrmShellAccess(user(["General Manager"]), { shellMode: "REVIEW" })).toMatchObject({
      allowed: true,
      contractVersion: "ucrm-shell-access/v1",
      fallbackHref: "/manager-workspace",
      mode: "REVIEW",
      reason: "ALLOWED",
      workspace: "MANAGEMENT"
    });
    expect(resolveUnifiedCrmShellAccess(user(["Salesperson"]), { shellMode: "REVIEW" })).toMatchObject({
      allowed: true,
      fallbackHref: "/tasks?department=SALES",
      workspace: "SALES"
    });
  });

  it("returns a safe OFF result without granting shell access", () => {
    expect(resolveUnifiedCrmShellAccess(user(["Sales Manager"]), { shellMode: "OFF" })).toMatchObject({
      allowed: false,
      fallbackHref: "/tasks?department=SALES",
      mode: "OFF",
      reason: "SHELL_OFF",
      workspace: "SALES"
    });
  });

  it("keeps an ineligible actor denied even when REVIEW is enabled", () => {
    const result = resolveUnifiedCrmShellAccess(user(["Mechanic"]), { shellMode: "REVIEW" });

    expect(result).toMatchObject({
      allowed: false,
      fallbackHref: "/my-tasks",
      mode: "REVIEW",
      reason: "WORKSPACE_NOT_ELIGIBLE",
      workspace: null
    });
    expect(result.capabilities).toEqual({
      "crm.console.access": false,
      "crm.customer.view": false,
      "crm.sensitive.view": false,
      "crm.mutate": false,
      "crm.export": false,
      "crm.admin": false
    });
  });

  it("returns the login fallback for a missing identity", () => {
    expect(resolveUnifiedCrmShellAccess(null, { shellMode: "REVIEW" })).toMatchObject({
      allowed: false,
      fallbackHref: "/login",
      reason: "AUTHENTICATION_REQUIRED",
      workspace: null
    });
  });
});
