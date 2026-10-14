import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/db/client", () => ({ prisma: {} }));

import { createUnifiedCrmCustomer360Repository } from "@/server/repositories/unified-crm-customer-360-repository";

describe("Unified CRM Customer 360 repository", () => {
  it("applies organization, record, archive, and merge scope in the record query", async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const repository = createUnifiedCrmCustomer360Repository({ $queryRaw: vi.fn(), customer: { findFirst } } as never);
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
    const repository = createUnifiedCrmCustomer360Repository({ $queryRaw: vi.fn(), customer: { findFirst } } as never);
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
    expect(select.unifiedCrmOpportunities.select).toMatchObject({ opportunityNumber: true, stage: true });
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

  it("scopes opportunity dispatch link reads by organization, customer, and owner", async () => {
    const queryRaw = vi.fn().mockResolvedValue([]);
    const repository = createUnifiedCrmCustomer360Repository({ $queryRaw: queryRaw, customer: { findFirst: vi.fn() } } as never);
    await repository.listOpportunityDispatchLinks({
      customerId: "customer-a",
      organizationId: "org-a",
      recordScope: { kind: "OWNER", ownerUserId: "seller-a" }
    });

    const query = queryRaw.mock.calls[0][0] as { strings?: string[]; values?: unknown[] };
    const sql = (query.strings ?? []).join(" ");
    expect(sql).toContain('opportunity."customerId" =');
    expect(sql).toContain('opportunity."organizationId" =');
    expect(sql).toContain('opportunity."ownerUserId" =');
    expect(sql).toContain('"UnifiedCrmOpportunityDispatchLink"');
  });
});
