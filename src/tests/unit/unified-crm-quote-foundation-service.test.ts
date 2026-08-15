import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/db/client", () => ({ prisma: {} }));

import type { AuthenticatedUser } from "@/server/auth/store";
import type { UnifiedCrmQuoteFoundationRepository } from "@/server/repositories/unified-crm-quote-foundation-repository";
import { getUnifiedCrmQuoteFoundation } from "@/server/services/unified-crm-quote-foundation-service";

const manager: AuthenticatedUser = {
  id: "manager-1",
  name: "CRM Manager",
  email: "manager@example.test",
  isActive: true,
  roles: ["General Manager"],
  duties: { direct: [], roleDefaults: [], all: [] }
};

function accessContext(scope: "organization" | "owned") {
  return {
    actorUserId: scope === "organization" ? "manager-1" : "seller-1",
    capabilities: { read: true, draft: false, present: false, approve: false },
    fallbackHref: scope === "organization" ? "/manager-workspace" : "/tasks?department=SALES",
    mode: "REVIEW" as const,
    organizationId: "org-a",
    recordScope: scope === "organization"
      ? { kind: "ORGANIZATION" as const }
      : { kind: "OWNER" as const, ownerUserId: "seller-1" },
    workspace: scope === "organization" ? "MANAGEMENT" as const : "SALES" as const
  };
}

function repository(overrides: Partial<UnifiedCrmQuoteFoundationRepository> = {}): UnifiedCrmQuoteFoundationRepository {
  return {
    async listRecentQuotes() {
      return [];
    },
    ...overrides
  };
}

describe("Unified CRM quote foundation service", () => {
  it("returns a held commercial foundation with no visible quotes when storage is empty", async () => {
    const model = await getUnifiedCrmQuoteFoundation(null, {
      accessContext: accessContext("organization"),
      repository: repository(),
      now: () => new Date("2026-08-15T16:10:00.000Z")
    });

    expect(model).toMatchObject({
      contractVersion: "ucrm.quote-foundation/v1",
      generatedAt: "2026-08-15T16:10:00.000Z",
      state: "HELD_REVIEW",
      visibility: "organization",
      source: { href: "/crm?view=more" },
      liveObservation: {
        detail: expect.stringContaining("No same-scope persisted quote is visible right now"),
        freshnessLabel: "No visible persisted quote update is available yet.",
        newestVisibleRecordUpdatedAt: null,
        state: "EMPTY",
        visibleRecordCount: 0
      }
    });
    expect(model.readiness.map((item) => item.id)).toEqual(["storage", "presentation", "approvals"]);
    expect(model.readiness.filter((item) => item.state === "READY")).toHaveLength(1);
  });

  it("surfaces visible quotes without overstating live draft or presentation commands", async () => {
    const model = await getUnifiedCrmQuoteFoundation(null, {
      accessContext: accessContext("organization"),
      repository: repository({
        async listRecentQuotes() {
          return [{
            quoteNumber: "Q-1001",
            state: "DRAFT",
            latestVersionNumber: 2,
            organizationId: "org-a",
            opportunityNumber: "opp_123456",
            customerDisplayName: "Alex Morgan",
            customerNumber: "CUS-18",
            updatedAt: new Date("2026-08-15T15:55:00.000Z")
          }, {
            quoteNumber: "Q-1002",
            state: "PRESENTED",
            latestVersionNumber: 3,
            organizationId: "org-a",
            opportunityNumber: null,
            customerDisplayName: null,
            customerNumber: null,
            updatedAt: new Date("2026-08-15T15:45:00.000Z")
          }];
        }
      }),
      now: () => new Date("2026-08-15T16:10:00.000Z")
    });

    expect(model.visibleQuotes).toHaveLength(2);
    expect(model.liveObservation).toMatchObject({
      detail: expect.stringContaining("Only same-scope persisted quotes are listed here"),
      freshnessLabel: "Newest visible persisted quote update observed at 2026-08-15T15:55:00.000Z.",
      newestVisibleRecordUpdatedAt: "2026-08-15T15:55:00.000Z",
      state: "READY",
      visibleRecordCount: 2
    });
    expect(model.visibleQuotes[0]).toMatchObject({
      quoteNumber: "Q-1001",
      customerLabel: "Alex Morgan · CUS-18",
      opportunityLabel: "opp_123456",
      versionLabel: "v2"
    });
    expect(JSON.stringify(model)).not.toMatch(/"canDraft"|"canPresent"|"canApprove"/);
  });

  it("preserves owner-only review visibility for sales access", async () => {
    await expect(getUnifiedCrmQuoteFoundation(manager, {
      accessContext: accessContext("owned"),
      repository: repository(),
      now: () => new Date("2026-08-15T16:10:00.000Z")
    })).resolves.toMatchObject({
      state: "HELD_REVIEW",
      visibility: "owned",
      headline: { detail: expect.stringContaining("owned review") }
    });
  });

  it("wraps repository failures in a safe unavailable error", async () => {
    await expect(getUnifiedCrmQuoteFoundation(manager, {
      accessContext: accessContext("organization"),
      repository: repository({
        async listRecentQuotes() {
          throw new Error("private quote foundation backend detail");
        }
      })
    })).rejects.toMatchObject({
      code: "QUOTE_OFF",
      message: "Quote foundation review is temporarily unavailable."
    });
  });
});
