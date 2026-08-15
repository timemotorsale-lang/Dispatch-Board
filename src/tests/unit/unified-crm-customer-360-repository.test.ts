import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/db/client", () => ({ prisma: {} }));

import { createUnifiedCrmCustomer360Repository } from "@/server/repositories/unified-crm-customer-360-repository";

describe("Unified CRM Customer 360 repository", () => {
  it("applies organization, record, archive, and merge scope in the record query", async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const repository = createUnifiedCrmCustomer360Repository({ customer: { findFirst } } as never);
    await repository.findCustomer({
      customerId: "customer-a",
      organizationId: "org-a",
      recordScope: { kind: "OWNER", ownerUserId: "seller-a" }
    });

    const query = findFirst.mock.calls[0][0];
    expect(query.where).toEqual({
      id: "customer-a",
      organizationId: "org-a",
      archivedAt: null,
      mergedIntoCustomerId: null,
      ownerUserId: "seller-a",
      status: { in: ["ACTIVE", "INACTIVE", "RETIRED"] }
    });
    expect(query.select.leads.where).toEqual({ organizationId: "org-a", ownerUserId: "seller-a" });
    expect(query.select.concernCases.where).toEqual({ organizationId: "org-a", assignedOwnerId: "seller-a" });
  });

  it("independently scopes every exposed nested source by organization", async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const repository = createUnifiedCrmCustomer360Repository({ customer: { findFirst } } as never);
    await repository.findCustomer({
      customerId: "customer-a",
      organizationId: "org-a",
      recordScope: { kind: "ORGANIZATION" }
    });

    const select = findFirst.mock.calls[0][0].select;
    expect(select.vehicleRelationships.where).toEqual({ vehicle: { organizationId: "org-a" } });
    expect(select.appointmentParticipants.where).toEqual({ appointment: { organizationId: "org-a" } });
    expect(select.leads.where).toEqual({ organizationId: "org-a" });
    expect(select.concernCases.where).toEqual({ organizationId: "org-a" });
    expect(select).not.toHaveProperty("tasks");
    expect(select).not.toHaveProperty("address");
    expect(select).not.toHaveProperty("documentRequirements");
    expect(select).not.toHaveProperty("mergedIntoCustomerId");
    expect(select.notes.select).toEqual({
      id: true,
      body: true,
      createdAt: true,
      visibility: true,
      authorUser: {
        select: {
          name: true
        }
      }
    });
    expect(select.contactPoints.select).not.toHaveProperty("normalizedValue");
    expect(select.contactPoints.select).not.toHaveProperty("consentStatus");
  });
});
