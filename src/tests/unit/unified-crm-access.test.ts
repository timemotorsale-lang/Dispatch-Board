import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import {
  evaluateUnifiedCrmCapability,
  getUnifiedCrmCapabilityMap,
  resolveUnifiedCrmWorkspace
} from "@/server/policies/unified-crm-access";

function user(
  roles: string[],
  duties: string[] = [],
  overrides: Partial<AuthenticatedUser> = {}
): AuthenticatedUser {
  return {
    id: "user-1",
    name: "CRM Test User",
    email: "crm-user@example.test",
    isActive: true,
    roles,
    duties: { direct: duties, roleDefaults: [], all: duties },
    ...overrides
  };
}

describe("Unified CRM foundation capability policy", () => {
  it("allows coarse console and customer access for Management and Sales workspaces", () => {
    const manager = user(["General Manager"]);
    const salesperson = user(["Salesperson"]);

    expect(resolveUnifiedCrmWorkspace(manager)).toBe("MANAGEMENT");
    expect(resolveUnifiedCrmWorkspace(salesperson)).toBe("SALES");
    expect(evaluateUnifiedCrmCapability(manager, "crm.console.access")).toMatchObject({
      allowed: true,
      fallbackHref: "/manager-workspace",
      reason: "ALLOWED",
      workspace: "MANAGEMENT"
    });
    expect(evaluateUnifiedCrmCapability(salesperson, "crm.customer.view")).toMatchObject({
      allowed: true,
      fallbackHref: "/tasks?department=SALES",
      reason: "ALLOWED",
      workspace: "SALES"
    });
  });

  it("reuses governed workspace duties and preserves Management precedence", () => {
    const delegatedManager = user(["Staff"], ["Delegated manager capabilities"]);
    const managerSeller = user(["Sales Manager", "General Manager"]);

    expect(resolveUnifiedCrmWorkspace(delegatedManager)).toBe("MANAGEMENT");
    expect(resolveUnifiedCrmWorkspace(managerSeller)).toBe("MANAGEMENT");
  });

  it("denies unknown and unrelated workspaces by default", () => {
    for (const actor of [
      user(["Mechanic"]),
      user(["Office Manager"]),
      user(["Marketing/Advertisement Manager"]),
      user(["Unknown Staff"])
    ]) {
      expect(evaluateUnifiedCrmCapability(actor, "crm.console.access")).toMatchObject({
        allowed: false,
        reason: "WORKSPACE_NOT_ELIGIBLE",
        workspace: null
      });
    }
  });

  it("fails closed for missing and inactive identities", () => {
    expect(evaluateUnifiedCrmCapability(null, "crm.console.access")).toMatchObject({
      allowed: false,
      fallbackHref: "/login",
      reason: "AUTHENTICATION_REQUIRED"
    });
    expect(
      evaluateUnifiedCrmCapability(user(["Salesperson"], [], { isActive: false }), "crm.console.access")
    ).toMatchObject({
      allowed: false,
      fallbackHref: "/login",
      reason: "INACTIVE_USER",
      workspace: null
    });
  });

  it("does not grant sensitive, mutation, export, or administration capabilities by role", () => {
    for (const actor of [user(["General Manager"]), user(["Sales Manager"]), user(["Salesperson"])]) {
      expect(getUnifiedCrmCapabilityMap(actor)).toEqual({
        "crm.console.access": true,
        "crm.customer.view": true,
        "crm.sensitive.view": false,
        "crm.mutate": false,
        "crm.export": false,
        "crm.admin": false
      });
      expect(evaluateUnifiedCrmCapability(actor, "crm.export").reason).toBe("CAPABILITY_NOT_GRANTED");
    }
  });
});
