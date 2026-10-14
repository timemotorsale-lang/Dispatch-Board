import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import type { UnifiedCrmQuoteDraftRepository } from "@/server/repositories/unified-crm-quote-draft-repository";
import { getUnifiedCrmQuoteVersionReview } from "@/server/services/unified-crm-quote-draft-service";

const manager: AuthenticatedUser = {
  id: "manager-1",
  name: "CRM Manager",
  email: "manager@example.test",
  isActive: true,
  roles: ["General Manager"],
  duties: { direct: [], roleDefaults: [], all: [] }
};

const accessContext = {
  actorUserId: "manager-1",
  capabilities: { read: true, draft: true, present: false, approve: false },
  draftMode: "REVIEW" as const,
  fallbackHref: "/manager-workspace",
  mode: "REVIEW" as const,
  organizationId: "org-1",
  recordScope: { kind: "ORGANIZATION" as const },
  workspace: "MANAGEMENT" as const
};

function repository(overrides: Partial<UnifiedCrmQuoteDraftRepository> = {}): UnifiedCrmQuoteDraftRepository {
  return {
    async getDraftWorkspace() {
      return { editableQuote: null, visibleDrafts: [] };
    },
    async getVersionReview() {
      return {
        customerLabel: "Alex Morgan · CUS-18",
        opportunityLabel: "opp_123456",
        presentedVersionNumber: 2,
        quoteId: "quote-1",
        quoteNumber: "Q-1001",
        state: "PRESENTED" as const,
        updatedAt: new Date("2026-08-15T18:15:00.000Z"),
        versions: [
          {
            createdAt: new Date("2026-08-15T18:05:00.000Z"),
            lineItemCount: 2,
            presentedAt: new Date("2026-08-15T18:10:00.000Z"),
            state: "PRESENTED" as const,
            subtotalCents: 25000,
            totalCents: 26750,
            versionId: "version-2",
            versionNumber: 2
          },
          {
            createdAt: new Date("2026-08-15T17:55:00.000Z"),
            lineItemCount: 2,
            presentedAt: null,
            state: "DRAFT" as const,
            subtotalCents: 24000,
            totalCents: 25680,
            versionId: "version-1",
            versionNumber: 1
          }
        ]
      };
    },
    async saveDraft() {
      return {
        duplicate: false,
        latestVersionNumber: 1,
        quoteId: "quote-1",
        quoteNumber: "Q-1001",
        version: 1
      };
    },
    ...overrides
  };
}

describe("Unified CRM quote version review service", () => {
  it("builds immutable version review honestly", async () => {
    const model = await getUnifiedCrmQuoteVersionReview(manager, "quote-1", {
      accessContext,
      now: () => new Date("2026-08-15T18:20:00.000Z"),
      repository: repository()
    });

    expect(model).toMatchObject({
      contractVersion: "ucrm.quote-version-review/v1",
      quote: {
        quoteId: "quote-1",
        quoteNumber: "Q-1001",
        state: "PRESENTED"
      },
      liveObservation: {
        presentedVersionLabel: "v2",
        state: "IMMUTABLE_PRESENTED"
      },
      presentAction: {
        state: "HELD"
      },
      versions: [
        expect.objectContaining({
          versionLabel: "v2",
          state: "PRESENTED",
          immutableNote: "This presented version is immutable evidence."
        }),
        expect.objectContaining({
          versionLabel: "v1",
          state: "DRAFT"
        })
      ]
    });
  });

  it("fails closed when the visible quote is missing", async () => {
    await expect(getUnifiedCrmQuoteVersionReview(manager, "quote-1", {
      accessContext,
      repository: repository({
        async getVersionReview() {
          return null;
        }
      })
    })).rejects.toMatchObject({
      code: "QUOTE_NOT_AVAILABLE",
      message: "Quote version review is not available for this viewer."
    });
  });
});
