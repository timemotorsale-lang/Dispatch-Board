import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/db/client", () => ({ prisma: {} }));

import { createUnifiedCrmOpportunityPreviewRepository } from "@/server/repositories/unified-crm-opportunity-preview-repository";

describe("Unified CRM opportunity preview repository", () => {
  it("guards joined customer rows to the same organization before projecting preview detail", async () => {
    const captured: unknown[] = [];
    const repository = createUnifiedCrmOpportunityPreviewRepository({
      $queryRaw: vi.fn(async (query) => {
        captured.push(query);
        return [];
      })
    } as never);

    await repository.findPrimaryOpportunityPreview({
      organizationId: "org-a",
      recordScope: { kind: "ORGANIZATION" }
    });

    const query = captured[0] as { strings?: string[] };
    const sql = (query.strings ?? []).join(" ");
    expect(sql).toContain('customer."organizationId" = record."organizationId"');
  });

  it("returns the first mapped preview row", async () => {
    const repository = createUnifiedCrmOpportunityPreviewRepository({
      $queryRaw: vi.fn(async () => ([{
        opportunityNumber: "opp_123456",
        title: "Alex Morgan renewal review",
        summary: "Read-only preview",
        organizationId: "org-a",
        ownerUserId: "user-1",
        ownerUserName: "CRM Manager",
        customerId: "customer-1",
        customerDisplayName: "Alex Morgan",
        customerNumber: "CUS-18",
        updatedAt: new Date("2026-08-15T02:00:00.000Z")
      }]))
    } as never);

    const record = await repository.findPrimaryOpportunityPreview({
      organizationId: "org-a",
      recordScope: { kind: "ORGANIZATION" }
    });

    expect(record).toMatchObject({
      opportunityNumber: "opp_123456",
      title: "Alex Morgan renewal review",
      ownerUser: { id: "user-1", name: "CRM Manager" },
      customer: { id: "customer-1", displayName: "Alex Morgan", customerNumber: "CUS-18" }
    });
  });

  it("lists a bounded read-only preview collection in updated order", async () => {
    const repository = createUnifiedCrmOpportunityPreviewRepository({
      $queryRaw: vi.fn(async () => ([{
        opportunityNumber: "opp_123456",
        title: "First review",
        summary: "Newest",
        organizationId: "org-a",
        ownerUserId: "user-1",
        ownerUserName: "CRM Manager",
        customerId: "customer-1",
        customerDisplayName: "Alex Morgan",
        customerNumber: "CUS-18",
        updatedAt: new Date("2026-08-15T02:00:00.000Z")
      }, {
        opportunityNumber: "opp_123457",
        title: "Second review",
        summary: "Older",
        organizationId: "org-a",
        ownerUserId: "user-2",
        ownerUserName: "Seller",
        customerId: null,
        customerDisplayName: null,
        customerNumber: null,
        updatedAt: new Date("2026-08-15T01:00:00.000Z")
      }]))
    } as never);

    const records = await repository.listOpportunityPreviews({
      limit: 5,
      organizationId: "org-a",
      recordScope: { kind: "ORGANIZATION" }
    });

    expect(records).toHaveLength(2);
    expect(records[0]?.opportunityNumber).toBe("opp_123456");
    expect(records[1]?.opportunityNumber).toBe("opp_123457");
  });
});
