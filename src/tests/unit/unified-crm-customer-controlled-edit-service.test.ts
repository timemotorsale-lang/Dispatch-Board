import { describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import { updateUnifiedCrmCustomerControlledEdit } from "@/server/services/unified-crm-customer-controlled-edit-service";

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

function repository(result = { changedFields: ["displayName", "email", "phoneNumber"], customerId: "customer-1", duplicate: false, version: 4 }) {
  return { updateCustomer: vi.fn(async () => result) };
}

describe("Unified CRM customer controlled edit", () => {
  it("normalizes approved customer/contact edits and records them through the repository", async () => {
    const repo = repository();
    const result = await updateUnifiedCrmCustomerControlledEdit(manager, " customer-1 ", {
      displayName: "  Maria Lane ",
      email: " MARIA@EXAMPLE.TEST ",
      expectedVersion: 3,
      idempotencyKey: "edit-1",
      phoneNumber: "(612) 555-1234",
      reason: "Correct customer contact after owner review"
    }, {
      now: () => new Date("2026-08-27T00:00:00.000Z"),
      repository: repo,
      scopeRepository: scopeRepository()
    });

    expect(result).toEqual({
      changedFields: ["displayName", "email", "phoneNumber"],
      contractVersion: "ucrm.customer-controlled-edit/v1",
      customerId: "customer-1",
      duplicate: false,
      version: 4
    });
    expect(repo.updateCustomer).toHaveBeenCalledWith(expect.objectContaining({
      command: expect.objectContaining({
        changedFields: ["displayName", "email", "phoneNumber"],
        customerId: "customer-1",
        email: "maria@example.test",
        expectedVersion: 3,
        normalizedEmail: "maria@example.test",
        normalizedPhoneNumber: "+16125551234",
        organizationId: "org-1",
        phoneNumber: "+16125551234"
      }),
      recordScope: { kind: "ORGANIZATION" }
    }));
  });

  it("uses owner scope for sales users and rejects stale repository results safely", async () => {
    const repo = {
      updateCustomer: vi.fn(async () => {
        throw Object.assign(new Error("Customer version is stale."), { code: "VERSION_CONFLICT" });
      })
    };

    await expect(updateUnifiedCrmCustomerControlledEdit(seller, "customer-1", {
      displayName: "Maria Lane",
      expectedVersion: 1,
      idempotencyKey: "edit-2",
      reason: "Correct spelling"
    }, {
      repository: repo,
      scopeRepository: scopeRepository()
    })).rejects.toMatchObject({ code: "STALE_CUSTOMER_VERSION" });

    expect(repo.updateCustomer).toHaveBeenCalledWith(expect.objectContaining({
      recordScope: { kind: "OWNER", ownerUserId: "seller-1" }
    }));
  });

  it("rejects commands without approved edited fields", async () => {
    await expect(updateUnifiedCrmCustomerControlledEdit(manager, "customer-1", {
      expectedVersion: 1,
      idempotencyKey: "edit-3",
      reason: "No-op correction"
    }, {
      repository: repository(),
      scopeRepository: scopeRepository()
    })).rejects.toMatchObject({ code: "INVALID_CUSTOMER_EDIT_COMMAND" });
  });
});
