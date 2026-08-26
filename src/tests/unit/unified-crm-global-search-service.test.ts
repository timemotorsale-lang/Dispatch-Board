import { describe, expect, it, vi } from "vitest";

import { searchUnifiedCrm } from "@/server/services/unified-crm-global-search-service";
import { UnifiedCrmGlobalSearchError } from "@/server/unified-crm/global-search-contract";

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

describe("Unified CRM global search service", () => {
  it("returns deterministic grouped results without mutating CRM records", async () => {
    const repository = {
      listActiveOrganizationIds: vi.fn(async () => ["org-1"]),
      search: vi.fn(async () => [
        {
          entity: "customer" as const,
          href: "/crm/customers/customer-1",
          id: "customer-1",
          label: "Alex Morgan",
          matchedOn: "customer name",
          secondary: "C-100",
          updatedAt: new Date("2026-08-26T11:00:00.000Z")
        },
        {
          entity: "quote" as const,
          href: "/crm/quotes?quoteId=quote-1",
          id: "quote-1",
          label: "Q-100",
          matchedOn: "quote number",
          secondary: "OPP-100",
          updatedAt: new Date("2026-08-26T11:10:00.000Z")
        }
      ])
    };

    const model = await searchUnifiedCrm(manager, { q: "alex", limit: 10 }, {
      mode: "REVIEW",
      now: () => now,
      repository
    });

    expect(repository.search).toHaveBeenCalledWith(expect.objectContaining({
      limit: 10,
      organizationId: "org-1",
      q: "alex",
      recordScope: { kind: "ORGANIZATION" },
      viewerUserId: "manager-1"
    }));
    expect(model).toMatchObject({
      contractVersion: "ucrm.global-search/v1",
      resultCount: 2,
      state: "READY",
      visibility: "organization"
    });
    expect(model.groups.map((group) => group.entity)).toEqual(["customer", "quote"]);
    expect(model.groups[0].results[0]).toMatchObject({ label: "Alex Morgan", rank: 1 });
    expect(model.freshness.newestRecordUpdatedAt).toBe("2026-08-26T11:10:00.000Z");
  });

  it("passes owner scope to the repository so hidden records do not leak existence", async () => {
    const repository = {
      listActiveOrganizationIds: vi.fn(async () => ["org-1"]),
      search: vi.fn(async () => [])
    };

    const model = await searchUnifiedCrm(seller, { q: "private", limit: 5 }, {
      mode: "REVIEW",
      now: () => now,
      repository
    });

    expect(repository.search).toHaveBeenCalledWith(expect.objectContaining({
      recordScope: { kind: "OWNER", ownerUserId: "seller-1" },
      viewerUserId: "seller-1"
    }));
    expect(model).toMatchObject({ groups: [], resultCount: 0, state: "EMPTY", visibility: "owned" });
  });

  it("fails closed for short queries, disabled mode, and ambiguous organization scope", async () => {
    await expect(searchUnifiedCrm(manager, { q: "a" }, { mode: "REVIEW" })).rejects.toMatchObject({
      code: "INVALID_GLOBAL_SEARCH_QUERY"
    });

    await expect(searchUnifiedCrm(manager, { q: "alex" }, { mode: "OFF" })).rejects.toMatchObject({
      code: "GLOBAL_SEARCH_OFF"
    });

    await expect(searchUnifiedCrm(manager, { q: "alex" }, {
      mode: "REVIEW",
      repository: {
        listActiveOrganizationIds: vi.fn(async () => ["org-1", "org-2"]),
        search: vi.fn()
      }
    })).rejects.toBeInstanceOf(UnifiedCrmGlobalSearchError);
  });
});
