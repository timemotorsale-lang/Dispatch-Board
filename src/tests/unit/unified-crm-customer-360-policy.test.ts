import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import {
  evaluateUnifiedCrmCustomer360Policy,
  requireUnifiedCrmCustomer360Policy
} from "@/server/policies/unified-crm-customer-360";

function user(roles: string[], overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: "viewer-1",
    name: "Customer Viewer",
    email: "viewer@example.test",
    isActive: true,
    roles,
    duties: { direct: [], roleDefaults: [], all: [] },
    ...overrides
  };
}

describe("Unified CRM Customer 360 policy", () => {
  it("preserves Management organization scope", () => {
    expect(evaluateUnifiedCrmCustomer360Policy(user(["General Manager"]))).toEqual({
      allowed: true,
      reason: "ALLOWED",
      recordScope: { kind: "ORGANIZATION" }
    });
  });

  it.each(["Salesperson", "Sales Manager"])("preserves owner-only scope for %s", (role) => {
    expect(evaluateUnifiedCrmCustomer360Policy(user([role]))).toMatchObject({
      allowed: true,
      recordScope: { kind: "OWNER", ownerUserId: "viewer-1" }
    });
  });

  it("fails closed for missing, inactive, and unrelated actors", () => {
    expect(evaluateUnifiedCrmCustomer360Policy(null).reason).toBe("AUTHENTICATION_REQUIRED");
    expect(evaluateUnifiedCrmCustomer360Policy(user(["Salesperson"], { isActive: false })).reason)
      .toBe("CUSTOMER_360_NOT_AUTHORIZED");
    expect(evaluateUnifiedCrmCustomer360Policy(user(["Mechanic"])).reason)
      .toBe("CUSTOMER_360_NOT_AUTHORIZED");
    expect(() => requireUnifiedCrmCustomer360Policy(user(["Mechanic"]))).toThrow(
      "Customer details are not available for this viewer."
    );
  });
});
