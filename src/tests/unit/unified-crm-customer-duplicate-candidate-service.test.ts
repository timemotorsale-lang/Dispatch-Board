import { describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import { getUnifiedCrmCustomerDuplicateCandidates } from "@/server/services/unified-crm-customer-duplicate-candidate-service";

const manager: AuthenticatedUser = {
  id: "manager-1",
  name: "Manager One",
  email: "manager@example.test",
  isActive: true,
  roles: ["General Manager"],
  duties: { all: [], direct: [], roleDefaults: [] }
};

const seller: AuthenticatedUser = { ...manager, id: "seller-1", roles: ["Salesperson"] };

function scopeRepository(organizationIds = ["org-1"]) {
  return { listActiveOrganizationIds: vi.fn(async () => organizationIds) };
}

describe("Unified CRM customer duplicate candidates", () => {
  it("returns warning-only duplicate candidates with masked contact details and explanations", async () => {
    const repository = {
      findDuplicateCandidates: vi.fn(async () => [{
        id: "customer-2",
        displayName: "Maria Lane",
        email: "maria@example.test",
        phoneNumber: "+16125551234",
        contactPoints: []
      }])
    };

    const result = await getUnifiedCrmCustomerDuplicateCandidates(manager, "customer-1", {
      displayName: " maria  lane ",
      email: "MARIA@EXAMPLE.TEST",
      phoneNumber: "(612) 555-1234"
    }, {
      now: () => new Date("2026-08-27T00:00:00.000Z"),
      repository,
      scopeRepository: scopeRepository()
    });

    expect(result).toMatchObject({
      contractVersion: "ucrm.customer-duplicate-candidates/v1",
      customerId: "customer-1",
      state: "WARNING",
      warningOnly: true
    });
    expect(result.candidates[0]).toMatchObject({
      candidateCustomerId: "customer-2",
      maskedEmail: "m•••@e•••.test",
      maskedPhone: "••••1234",
      sourceHref: "/crm/customers/customer-2"
    });
    expect(result.candidates[0].explanation).toEqual([
      "Email matches after normalization.",
      "Phone matches after normalization.",
      "Display name matches after spacing and case normalization."
    ]);
  });

  it("uses owner scope for sales users and never returns an automatic merge action", async () => {
    const repository = {
      findDuplicateCandidates: vi.fn(async () => [])
    };

    const result = await getUnifiedCrmCustomerDuplicateCandidates(seller, "customer-1", {
      email: "seller@example.test"
    }, {
      repository,
      scopeRepository: scopeRepository()
    });

    expect(result.state).toBe("NO_CANDIDATES");
    expect(result.warningOnly).toBe(true);
    expect(JSON.stringify(result)).not.toContain("merge");
    expect(repository.findDuplicateCandidates).toHaveBeenCalledWith(expect.objectContaining({
      recordScope: { kind: "OWNER", ownerUserId: "seller-1" }
    }));
  });

  it("fails closed when the duplicate warning mode is off", async () => {
    await expect(getUnifiedCrmCustomerDuplicateCandidates(manager, "customer-1", {
      email: "maria@example.test"
    }, {
      duplicateMode: "OFF",
      repository: { findDuplicateCandidates: vi.fn() },
      scopeRepository: scopeRepository()
    })).rejects.toMatchObject({ code: "CUSTOMER_DUPLICATE_WARNING_OFF" });
  });
});
