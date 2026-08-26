import { describe, expect, it, vi } from "vitest";

import { getUnifiedCrmManagerExceptionQueue } from "@/server/services/unified-crm-manager-exception-queue-service";

const manager = {
  id: "manager-1",
  name: "Manager One",
  email: "manager@example.test",
  isActive: true,
  roles: ["General Manager"],
  duties: { all: [], direct: [], roleDefaults: [] }
};
const seller = {
  ...manager,
  id: "seller-1",
  roles: ["Salesperson"]
};
const now = new Date("2026-08-26T12:00:00.000Z");

describe("Unified CRM manager exception queue service", () => {
  it("returns explainable paginated manager exceptions", async () => {
    const repository = {
      listActiveOrganizationIds: vi.fn(async () => ["org-1"]),
      listExceptions: vi.fn(async () => [
        {
          detail: "Opportunity has no owner assigned.",
          href: "/crm/opportunities/opp-1",
          id: "opp-1",
          kind: "unassigned" as const,
          label: "Unassigned deal",
          ownerName: null,
          recommendedAction: "Assign an owner.",
          updatedAt: new Date("2026-08-25T12:00:00.000Z")
        },
        {
          detail: "Commercial approval is waiting for manager decision.",
          href: "/crm/quotes?quoteId=quote-1",
          id: "approval-1",
          kind: "approval" as const,
          label: "Q-100",
          ownerName: "Seller One",
          recommendedAction: "Review approval.",
          updatedAt: new Date("2026-08-26T10:00:00.000Z")
        },
        {
          detail: "Extra row proves pagination.",
          href: "/crm/opportunities/opp-2",
          id: "opp-2",
          kind: "overdue" as const,
          label: "Overdue deal",
          ownerName: "Seller One",
          recommendedAction: "Protect promise.",
          updatedAt: new Date("2026-08-26T11:00:00.000Z")
        }
      ]),
      summarize: vi.fn(async () => ({
        approval: 1,
        dispatchHandoff: 1,
        overdue: 1,
        stalled: 1,
        unassigned: 1
      }))
    };

    const model = await getUnifiedCrmManagerExceptionQueue(manager, { limit: 2, offset: 0 }, {
      now: () => now,
      repository
    });

    expect(repository.listExceptions).toHaveBeenCalledWith(expect.objectContaining({
      limit: 3,
      offset: 0,
      organizationId: "org-1"
    }));
    expect(model).toMatchObject({
      contractVersion: "ucrm.manager-exception-queue/v1",
      page: { hasMore: true, nextOffset: 2 },
      state: "READY",
      visibility: "organization"
    });
    expect(model.items).toHaveLength(2);
    expect(model.items[0]).toMatchObject({ ageLabel: "1d", ownerName: "Unassigned" });
  });

  it("rejects non-management users", async () => {
    await expect(getUnifiedCrmManagerExceptionQueue(seller, { limit: 2 })).rejects.toMatchObject({
      code: "MANAGER_EXCEPTION_NOT_AUTHORIZED"
    });
  });
});
