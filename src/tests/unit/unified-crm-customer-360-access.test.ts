import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import { requireUnifiedCrmCustomer360Access } from "@/server/unified-crm/customer-360-access";

const manager: AuthenticatedUser = {
  id: "manager-a",
  name: "CRM Manager",
  email: "manager@example.test",
  isActive: true,
  roles: ["General Manager"],
  duties: { direct: [], roleDefaults: [], all: [] }
};

describe("Unified CRM Customer 360 deep-route access", () => {
  it("requires both shell REVIEW and customer-read REVIEW", () => {
    expect(requireUnifiedCrmCustomer360Access(manager, {
      nodeEnv: "production",
      shellMode: "REVIEW",
      readMode: "REVIEW"
    })).toEqual({ recordScope: { kind: "ORGANIZATION" }, shellMode: "REVIEW", readMode: "REVIEW" });

    expect(() => requireUnifiedCrmCustomer360Access(manager, {
      shellMode: "OFF",
      readMode: "REVIEW"
    })).toThrow(expect.objectContaining({ code: "CUSTOMER_360_OFF" }));
    expect(() => requireUnifiedCrmCustomer360Access(manager, {
      shellMode: "REVIEW",
      readMode: "OFF"
    })).toThrow(expect.objectContaining({ code: "CUSTOMER_360_OFF" }));
  });

  it("defaults production closed when neither control is explicitly enabled", () => {
    expect(() => requireUnifiedCrmCustomer360Access(manager, { nodeEnv: "production" }))
      .toThrow(expect.objectContaining({ code: "CUSTOMER_360_OFF" }));
  });

  it("preserves authorization denial instead of treating it as feature-off", () => {
    expect(() => requireUnifiedCrmCustomer360Access({ ...manager, roles: ["Mechanic"] }, {
      shellMode: "REVIEW",
      readMode: "REVIEW"
    })).toThrow(expect.objectContaining({ code: "CUSTOMER_360_NOT_AUTHORIZED" }));
  });
});
