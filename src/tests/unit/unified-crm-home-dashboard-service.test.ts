import { describe, expect, it, vi } from "vitest";

import { getUnifiedCrmHomeDashboard } from "@/server/services/unified-crm-home-dashboard-service";

const now = new Date("2026-08-26T12:00:00.000Z");
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
  name: "Seller One",
  roles: ["Salesperson"]
};

describe("Unified CRM home dashboard service", () => {
  it("builds drill-through metrics from scoped live counts", async () => {
    const repository = {
      listActiveOrganizationIds: vi.fn(async () => ["org-1"]),
      loadCounts: vi.fn(async () => ({
        dispatchHandoffCount: 2,
        newestRecordUpdatedAt: new Date("2026-08-26T11:30:00.000Z"),
        openOpportunityCount: 4,
        overdueFollowUpCount: 1,
        quoteCount: 3
      }))
    };

    const model = await getUnifiedCrmHomeDashboard(seller, { now: () => now, repository });

    expect(repository.loadCounts).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      recordScope: { kind: "OWNER", ownerUserId: "seller-1" },
      viewerUserId: "seller-1"
    }));
    expect(model).toMatchObject({
      contractVersion: "ucrm.home-dashboard/v1",
      freshness: { newestRecordUpdatedAt: "2026-08-26T11:30:00.000Z" },
      state: "READY",
      visibility: "owned"
    });
    expect(model.metrics.map((metric) => [metric.id, metric.value, metric.href])).toEqual([
      ["ownedWork", 4, "/crm?view=work"],
      ["overdueFollowUp", 1, "/crm/opportunities/queue?crmReturnTo=%2Fcrm"],
      ["pipeline", 4, "/crm?view=pipeline"],
      ["quotes", 3, "/crm/quotes?crmReturnTo=%2Fcrm"],
      ["dispatchHandoffs", 2, "/crm/opportunities?crmReturnTo=%2Fcrm"]
    ]);
  });

  it("requires one authorized organization", async () => {
    await expect(getUnifiedCrmHomeDashboard(manager, {
      repository: {
        listActiveOrganizationIds: vi.fn(async () => ["org-1", "org-2"]),
        loadCounts: vi.fn()
      }
    })).rejects.toMatchObject({ code: "ORGANIZATION_SCOPE_AMBIGUOUS" });
  });
});
