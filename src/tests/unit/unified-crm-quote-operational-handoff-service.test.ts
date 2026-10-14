import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/db/client", () => ({ prisma: {} }));

import type { AuthenticatedUser } from "@/server/auth/store";
import type { UnifiedCrmQuoteOperationalHandoffRepository } from "@/server/repositories/unified-crm-quote-operational-handoff-repository";
import { prepareUnifiedCrmQuoteOperationalHandoff } from "@/server/services/unified-crm-quote-operational-handoff-service";

const seller: AuthenticatedUser = {
  id: "seller-1",
  name: "Seller One",
  email: "seller@example.test",
  isActive: true,
  roles: ["Salesperson"],
  duties: { direct: [], roleDefaults: [], all: [] }
};

function scopeRepository() {
  return { async listActiveOrganizationIds() { return ["org-1"]; } };
}

function repository(record: Awaited<ReturnType<UnifiedCrmQuoteOperationalHandoffRepository["loadApprovedQuote"]>>): UnifiedCrmQuoteOperationalHandoffRepository {
  return {
    async loadApprovedQuote() {
      return record;
    }
  };
}

describe("Unified CRM quote operational handoff boundary", () => {
  it("prepares approved handoff context without enabling operational side effects", async () => {
    const model = await prepareUnifiedCrmQuoteOperationalHandoff(seller, "quote-1", {
      mode: "REVIEW",
      now: () => new Date("2026-08-26T21:30:00.000Z"),
      repository: repository({
        approvalAmountCents: 54331,
        approvalDiscountCents: 2500,
        approvalRequestId: "approval-1",
        approvalVersion: 2,
        customerDisplayName: "Alex Morgan",
        customerNumber: "CUS-1",
        latestVersionNumber: 2,
        opportunityNumber: "opp_1",
        quoteId: "quote-1",
        quoteNumber: "Q-1"
      }),
      scopeRepository: scopeRepository()
    });

    expect(model).toMatchObject({
      approval: { amountCents: 54331, status: "APPROVED" },
      contractVersion: "ucrm.quote-operational-handoff/v1",
      handoff: {
        customerLabel: "Alex Morgan · CUS-1",
        quoteId: "quote-1",
        quoteNumber: "Q-1",
        quoteVersionNumber: 2
      },
      state: "PREPARED_HELD"
    });
    expect(model.blockedEffects.map((item) => item.effect)).toEqual([
      "MARK_SOLD",
      "MARK_DELIVERED",
      "CREATE_INVOICE",
      "COMPLETE_DISPATCH"
    ]);
  });

  it("requires approval before preparing a handoff packet", async () => {
    await expect(prepareUnifiedCrmQuoteOperationalHandoff(seller, "quote-1", {
      mode: "REVIEW",
      repository: repository(null),
      scopeRepository: scopeRepository()
    })).rejects.toMatchObject({ code: "HANDOFF_APPROVAL_REQUIRED" });
  });
});
