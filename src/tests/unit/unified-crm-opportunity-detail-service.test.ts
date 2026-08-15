import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/db/client", () => ({ prisma: {} }));

import type { AuthenticatedUser } from "@/server/auth/store";
import { getUnifiedCrmOpportunityDetail } from "@/server/services/unified-crm-opportunity-detail-service";

const manager: AuthenticatedUser = {
  id: "manager-a",
  name: "CRM Manager",
  email: "manager@example.test",
  isActive: true,
  roles: ["General Manager"],
  duties: { direct: [], roleDefaults: [], all: [] }
};

const seller: AuthenticatedUser = {
  ...manager,
  id: "seller-a",
  email: "seller@example.test",
  roles: ["Salesperson"]
};

const now = new Date("2026-08-14T18:00:00.000Z");

describe("Unified CRM opportunity detail service", () => {
  it("returns a held, read-only detail model without operational record data", async () => {
    const model = await getUnifiedCrmOpportunityDetail(manager, "review01", {
      now: () => now,
      mode: "REVIEW",
      shellMode: "REVIEW",
      scopeRepository: { async listActiveOrganizationIds() { return ["org-a"]; } }
    });

    expect(model).toMatchObject({
      contractVersion: "ucrm.opportunity-detail/v1",
      state: "HELD",
      generatedAt: now.toISOString(),
      requestedOpportunityId: "review01",
      visibility: "organization",
      source: {
        authority: "UNIFIED_CRM",
        href: "/crm?view=pipeline",
        readMode: "HELD_REVIEW"
      },
      freshness: {
        status: "CURRENT",
        observedAt: now.toISOString(),
        sourceRecordUpdatedAt: null
      },
      identity: {
        lifecycleStatus: "HELD",
        title: "Opportunity detail review"
      }
    });

    const serialized = JSON.stringify(model);
    expect(serialized).not.toContain("amount");
    expect(serialized).not.toContain("forecast");
    expect(serialized).not.toContain("customerId");
  });

  it("rejects invalid identifiers before returning review detail", async () => {
    await expect(getUnifiedCrmOpportunityDetail(manager, " bad ", {
      mode: "REVIEW",
      shellMode: "REVIEW",
      scopeRepository: { async listActiveOrganizationIds() { return ["org-a"]; } }
    })).rejects.toMatchObject({ code: "INVALID_OPPORTUNITY_ID" });
  });

  it("returns only an owned held projection for a Sales viewer", async () => {
    const model = await getUnifiedCrmOpportunityDetail(seller, "review01", {
      now: () => now,
      mode: "REVIEW",
      shellMode: "REVIEW",
      scopeRepository: { async listActiveOrganizationIds() { return ["org-a"]; } }
    });

    expect(model).toMatchObject({
      state: "HELD",
      visibility: "owned",
      identity: { ownerScopeLabel: "Owned review scope" }
    });
    expect(JSON.stringify(model)).not.toMatch(/stageId|probability|valueCents|repairJobId|appointmentId/);
  });

  it("does not return review detail when the shell defaults off in production", async () => {
    const listActiveOrganizationIds = vi.fn();

    await expect(getUnifiedCrmOpportunityDetail(manager, "review01", {
      mode: "REVIEW",
      nodeEnv: "production",
      scopeRepository: { listActiveOrganizationIds }
    })).rejects.toMatchObject({ code: "OPPORTUNITY_OFF" });
    expect(listActiveOrganizationIds).not.toHaveBeenCalled();
  });
});
