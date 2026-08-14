import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import {
  evaluateUnifiedCrmCustomerReadPolicy,
  requireUnifiedCrmCustomerReadPolicy
} from "@/server/policies/unified-crm-customer-read";
import { UnifiedCrmCustomerReadError } from "@/server/unified-crm/customer-read-contract";

function user(roles: string[], overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: "user-1",
    name: "Customer Viewer",
    email: "customer-viewer@example.test",
    isActive: true,
    roles,
    duties: { direct: [], roleDefaults: [], all: [] },
    ...overrides
  };
}

describe("Unified CRM customer read policy", () => {
  it("grants Management organization scope", () => {
    expect(evaluateUnifiedCrmCustomerReadPolicy(user(["General Manager"]))).toEqual({
      allowed: true,
      reason: "ALLOWED",
      recordScope: { kind: "ORGANIZATION" }
    });
  });

  it.each([["Salesperson"], ["Sales Manager"]])("limits %s to own Customer records", (role) => {
    expect(evaluateUnifiedCrmCustomerReadPolicy(user([role]))).toMatchObject({
      allowed: true,
      recordScope: { kind: "OWNER", ownerUserId: "user-1" }
    });
  });

  it("fails closed for unrelated, inactive, and missing actors", () => {
    expect(evaluateUnifiedCrmCustomerReadPolicy(user(["Mechanic"]))).toMatchObject({
      allowed: false,
      reason: "CUSTOMER_READ_NOT_AUTHORIZED"
    });
    expect(evaluateUnifiedCrmCustomerReadPolicy(user(["Salesperson"], { isActive: false }))).toMatchObject({
      allowed: false,
      reason: "CUSTOMER_READ_NOT_AUTHORIZED"
    });
    expect(evaluateUnifiedCrmCustomerReadPolicy(null)).toMatchObject({
      allowed: false,
      reason: "AUTHENTICATION_REQUIRED"
    });
  });

  it("raises a stable typed denial", () => {
    expect(() => requireUnifiedCrmCustomerReadPolicy(user(["Parts"]))).toThrow(UnifiedCrmCustomerReadError);
    try {
      requireUnifiedCrmCustomerReadPolicy(user(["Parts"]));
    } catch (error) {
      expect(error).toMatchObject({ code: "CUSTOMER_READ_NOT_AUTHORIZED", httpStatus: 403 });
    }
  });
});
