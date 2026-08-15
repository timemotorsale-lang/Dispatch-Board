import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/db/client", () => ({ prisma: {} }));

import { createUnifiedCrmCustomerTimelineRepository } from "@/server/repositories/unified-crm-customer-timeline-repository";

function database(interactions: unknown[] = []) {
  return {
    customerInteraction: { findMany: vi.fn(async () => interactions) },
    activityEvent: { findMany: vi.fn(async () => []) },
    appointmentHistoryEvent: { findMany: vi.fn(async () => []) },
    customerLead: { findMany: vi.fn(async () => []) },
    concernCase: { findMany: vi.fn(async () => []) },
    customerPromise: { findMany: vi.fn(async () => []) },
    enterpriseDomainEvent: { findMany: vi.fn(async () => []) }
  };
}

describe("Unified CRM customer timeline repository", () => {
  it("applies organization and owner scope to every source that can expose customer activity", async () => {
    const db = database();
    const repository = createUnifiedCrmCustomerTimelineRepository(db as never);

    await repository.listTimeline({
      customerId: "customer-a",
      organizationId: "org-a",
      limit: 20,
      recordScope: { kind: "OWNER", ownerUserId: "seller-a" }
    });

    expect(db.customerInteraction.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { customerId: "customer-a", customer: { organizationId: "org-a" } },
      take: 21
    }));
    expect(db.activityEvent.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        OR: [
          { task: { customerId: "customer-a", customer: { organizationId: "org-a" }, assignedUserId: "seller-a" } },
          { concernCase: { customerId: "customer-a", organizationId: "org-a", assignedOwnerId: "seller-a" } }
        ]
      },
      take: 21
    }));
    expect(db.appointmentHistoryEvent.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { appointment: { organizationId: "org-a", participants: { some: { customerId: "customer-a" } }, ownerUserId: "seller-a" } }
    }));
    expect(db.customerLead.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { customerId: "customer-a", organizationId: "org-a", ownerUserId: "seller-a" }
    }));
    expect(db.concernCase.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { customerId: "customer-a", organizationId: "org-a", assignedOwnerId: "seller-a" }
    }));
    expect(db.customerPromise.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        concernCase: { customerId: "customer-a", organizationId: "org-a", assignedOwnerId: "seller-a" },
        ownerUserId: "seller-a"
      }
    }));
    expect(db.enterpriseDomainEvent.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ organizationId: "org-a", aggregateId: "customer-a", aggregateType: "CUSTOMER" })
    }));
  });

  it("fetches one lookahead record, returns a bounded page, and reports more activity", async () => {
    const db = database([
      { id: "interaction-3" },
      { id: "interaction-2" },
      { id: "interaction-1" }
    ]);
    const repository = createUnifiedCrmCustomerTimelineRepository(db as never);

    const result = await repository.listTimeline({
      customerId: "customer-a",
      organizationId: "org-a",
      limit: 2,
      recordScope: { kind: "ORGANIZATION" }
    });

    expect(db.customerInteraction.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 3 }));
    expect(result.interactions).toHaveLength(2);
    expect(result.page).toEqual({ limit: 2, hasMore: true });
  });

  it("reports more activity when the merged source total exceeds the global timeline limit", async () => {
    const db = database([{ id: "interaction-2" }, { id: "interaction-1" }]);
    db.activityEvent.findMany.mockResolvedValueOnce([{ id: "activity-2" }, { id: "activity-1" }] as never);
    const repository = createUnifiedCrmCustomerTimelineRepository(db as never);

    const result = await repository.listTimeline({
      customerId: "customer-a",
      organizationId: "org-a",
      limit: 3,
      recordScope: { kind: "ORGANIZATION" }
    });

    expect(result.interactions).toHaveLength(2);
    expect(result.activityEvents).toHaveLength(2);
    expect(result.page.hasMore).toBe(true);
  });
});
