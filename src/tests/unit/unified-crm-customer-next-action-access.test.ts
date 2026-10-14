import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/db/client", () => ({ prisma: {} }));

import type { AuthenticatedUser } from "@/server/auth/store";
import {
  evaluateUnifiedCrmCustomerNextActionAccess,
  requireUnifiedCrmCustomerNextActionAccess
} from "@/server/unified-crm/customer-next-action-access";

const manager: AuthenticatedUser = {
  id: "manager-a",
  name: "CRM Manager",
  email: "manager@example.test",
  isActive: true,
  roles: ["General Manager"],
  duties: { direct: [], roleDefaults: [], all: [] }
};

describe("Unified CRM customer next-action access", () => {
  it("requires shell, customer-read, and command review modes together", () => {
    expect(requireUnifiedCrmCustomerNextActionAccess(manager, {
      commandMode: "REVIEW",
      nodeEnv: "production",
      readMode: "REVIEW",
      shellMode: "REVIEW"
    })).toEqual({
      commandMode: "REVIEW",
      mutationAuthority: "CUSTOMER_NEXT_ACTION_REVIEW_COMMAND",
      readMode: "REVIEW",
      recordScope: { kind: "ORGANIZATION" },
      shellMode: "REVIEW"
    });

    expect(() => requireUnifiedCrmCustomerNextActionAccess(manager, {
      commandMode: "OFF",
      readMode: "REVIEW",
      shellMode: "REVIEW"
    })).toThrow(expect.objectContaining({ code: "CUSTOMER_360_OFF" }));
    expect(() => requireUnifiedCrmCustomerNextActionAccess(manager, {
      commandMode: "REVIEW",
      readMode: "OFF",
      shellMode: "REVIEW"
    })).toThrow(expect.objectContaining({ code: "CUSTOMER_360_OFF" }));
    expect(() => requireUnifiedCrmCustomerNextActionAccess(manager, {
      commandMode: "REVIEW",
      readMode: "REVIEW",
      shellMode: "OFF"
    })).toThrow(expect.objectContaining({ code: "CUSTOMER_360_OFF" }));
  });

  it("evaluates denial reasons without promoting feature-off to authorization", () => {
    expect(evaluateUnifiedCrmCustomerNextActionAccess(null, {
      commandMode: "REVIEW",
      readMode: "REVIEW",
      shellMode: "REVIEW"
    })).toMatchObject({
      allowed: false,
      reason: "AUTHENTICATION_REQUIRED",
      recordScope: null
    });

    expect(evaluateUnifiedCrmCustomerNextActionAccess({ ...manager, roles: ["Mechanic"] }, {
      commandMode: "REVIEW",
      readMode: "REVIEW",
      shellMode: "REVIEW"
    })).toMatchObject({
      allowed: false,
      reason: "CUSTOMER_360_NOT_AUTHORIZED",
      recordScope: null
    });

    expect(evaluateUnifiedCrmCustomerNextActionAccess(manager, {
      commandMode: "OFF",
      readMode: "REVIEW",
      shellMode: "REVIEW"
    })).toMatchObject({
      allowed: false,
      reason: "CUSTOMER_360_OFF",
      recordScope: { kind: "ORGANIZATION" }
    });
  });
});
