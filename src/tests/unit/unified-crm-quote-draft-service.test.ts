import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import type { UnifiedCrmQuoteDraftRepository } from "@/server/repositories/unified-crm-quote-draft-repository";
import { saveUnifiedCrmQuoteDraft } from "@/server/services/unified-crm-quote-draft-service";

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
      return null;
    },
    async saveDraft() {
      return {
        duplicate: false,
        latestVersionNumber: 1,
        quoteId: "quote-1",
        quoteNumber: "Q-20260815-183000000",
        version: 1
      };
    },
    ...overrides
  };
}

describe("Unified CRM quote draft service", () => {
  it("creates a governed quote draft", async () => {
    let seenPriceSource = "";

    const result = await saveUnifiedCrmQuoteDraft(manager, {
      customerId: "customer-1",
      idempotencyKey: "quote-draft-1",
      lineItems: [{ description: "Brake repair", quantity: 2, taxable: true, unitPriceCents: 15000 }],
      priceSource: "Internal estimate",
      reason: "Create the first customer quote draft.",
      termsSummary: "Valid for 7 days."
    }, {
      accessContext,
      repository: repository({
        async saveDraft(input) {
          seenPriceSource = input.command.priceSource;
          return {
            duplicate: false,
            latestVersionNumber: 1,
            quoteId: "quote-1",
            quoteNumber: "Q-20260815-183000000",
            version: 1
          };
        }
      })
    });

    expect(result).toMatchObject({
      contractVersion: "ucrm.quote-draft/v1",
      duplicate: false,
      latestVersionNumber: 1,
      quoteId: "quote-1",
      quoteNumber: "Q-20260815-183000000",
      state: "DRAFT",
      version: 1
    });
    expect(seenPriceSource).toBe("Internal estimate");
  });

  it("rejects invalid quote commands before save", async () => {
    await expect(saveUnifiedCrmQuoteDraft(manager, {
      customerId: "customer-1",
      idempotencyKey: "quote-draft-2",
      lineItems: [],
      priceSource: "Internal estimate",
      reason: "Create the first customer quote draft.",
      termsSummary: "Valid for 7 days."
    }, {
      accessContext,
      repository: repository()
    })).rejects.toMatchObject({
      code: "INVALID_QUOTE_COMMAND",
      message: "At least one quote line item is required."
    });

    await expect(saveUnifiedCrmQuoteDraft(manager, {
      idempotencyKey: "quote-draft-3",
      lineItems: [{ description: "Brake repair", quantity: 1, taxable: true, unitPriceCents: 15000 }],
      priceSource: "Internal estimate",
      reason: "Create the first customer quote draft.",
      termsSummary: "Valid for 7 days."
    }, {
      accessContext,
      repository: repository()
    })).rejects.toMatchObject({
      code: "INVALID_QUOTE_COMMAND",
      message: "A visible customer or opportunity link is required."
    });
  });

  it("maps held and replay conflicts safely", async () => {
    await expect(saveUnifiedCrmQuoteDraft(manager, {
      customerId: "customer-1",
      idempotencyKey: "quote-draft-4",
      lineItems: [{ description: "Brake repair", quantity: 1, taxable: true, unitPriceCents: 15000 }],
      priceSource: "Internal estimate",
      quoteId: "quote-1",
      reason: "Revise the quote draft after customer review.",
      termsSummary: "Valid for 7 days."
    }, {
      accessContext,
      repository: repository({
        async saveDraft() {
          throw new Error("Presented quotes cannot be revised from the draft workflow.");
        }
      })
    })).rejects.toMatchObject({
      code: "QUOTE_MUTATION_HELD"
    });

    await expect(saveUnifiedCrmQuoteDraft(manager, {
      customerId: "customer-1",
      idempotencyKey: "quote-draft-5",
      lineItems: [{ description: "Brake repair", quantity: 1, taxable: true, unitPriceCents: 15000 }],
      priceSource: "Internal estimate",
      reason: "Create the first customer quote draft.",
      termsSummary: "Valid for 7 days."
    }, {
      accessContext,
      repository: repository({
        async saveDraft() {
          throw Object.assign(new Error("used"), { code: "IDEMPOTENCY_KEY_REUSED" });
        }
      })
    })).rejects.toMatchObject({
      code: "IDEMPOTENCY_KEY_REUSED"
    });
  });
});
