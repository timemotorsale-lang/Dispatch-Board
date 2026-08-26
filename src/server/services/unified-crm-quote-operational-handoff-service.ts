import type { AuthenticatedUser } from "@/server/auth/store";
import {
  createUnifiedCrmQuoteOperationalHandoffRepository,
  type UnifiedCrmQuoteOperationalHandoffRepository
} from "@/server/repositories/unified-crm-quote-operational-handoff-repository";
import { requireUnifiedCrmQuoteAccess } from "@/server/unified-crm/quote-access";
import { UnifiedCrmQuoteError } from "@/server/unified-crm/quote-contract";
import {
  UNIFIED_CRM_QUOTE_OPERATIONAL_HANDOFF_CONTRACT_VERSION,
  UnifiedCrmQuoteOperationalHandoffError,
  type UnifiedCrmQuoteOperationalHandoffModel
} from "@/server/unified-crm/quote-operational-handoff-contract";

type Dependencies = {
  mode?: unknown;
  nodeEnv?: string;
  now?: () => Date;
  repository?: UnifiedCrmQuoteOperationalHandoffRepository;
  scopeRepository?: {
    listActiveOrganizationIds(userId: string, now: Date): Promise<string[]>;
  };
};

function mapAccessError(error: unknown): never {
  if (error instanceof UnifiedCrmQuoteOperationalHandoffError) throw error;
  if (error instanceof UnifiedCrmQuoteError) {
    if (error.code === "AUTHENTICATION_REQUIRED") throw new UnifiedCrmQuoteOperationalHandoffError("AUTHENTICATION_REQUIRED", "Quote handoff review requires sign-in.", { cause: error });
    if (error.code === "QUOTE_OFF") throw new UnifiedCrmQuoteOperationalHandoffError("HANDOFF_OFF", "Quote handoff review is temporarily unavailable.", { cause: error });
    throw new UnifiedCrmQuoteOperationalHandoffError("UNAUTHORIZED_HANDOFF", "Quote handoff review is not available for this viewer.", { cause: error });
  }
  throw new UnifiedCrmQuoteOperationalHandoffError("HANDOFF_SOURCE_UNAVAILABLE", "Quote handoff review could not be prepared safely.", { cause: error });
}

export async function prepareUnifiedCrmQuoteOperationalHandoff(
  actor: AuthenticatedUser | null,
  quoteId: string,
  dependencies: Dependencies = {}
): Promise<UnifiedCrmQuoteOperationalHandoffModel> {
  try {
    const access = await requireUnifiedCrmQuoteAccess(actor, dependencies);
    const repository = dependencies.repository ?? createUnifiedCrmQuoteOperationalHandoffRepository();
    const record = await repository.loadApprovedQuote({
      organizationId: access.organizationId,
      quoteId,
      recordScope: access.recordScope
    });
    if (!record) {
      throw new UnifiedCrmQuoteOperationalHandoffError("HANDOFF_APPROVAL_REQUIRED", "An approved commercial request is required before preparing quote handoff data.");
    }
    const generatedAt = (dependencies.now?.() ?? new Date()).toISOString();
    return {
      approval: {
        amountCents: record.approvalAmountCents,
        approvedVersion: record.approvalVersion,
        discountCents: record.approvalDiscountCents,
        requestId: record.approvalRequestId,
        status: "APPROVED"
      },
      blockedEffects: [
        { effect: "MARK_SOLD", reason: "CRM quote handoff does not sell inventory." },
        { effect: "MARK_DELIVERED", reason: "CRM quote handoff does not complete delivery." },
        { effect: "CREATE_INVOICE", reason: "CRM quote handoff does not create or settle invoices." },
        { effect: "COMPLETE_DISPATCH", reason: "CRM quote handoff does not close repair or dispatch work." }
      ],
      contractVersion: UNIFIED_CRM_QUOTE_OPERATIONAL_HANDOFF_CONTRACT_VERSION,
      generatedAt,
      handoff: {
        customerLabel: record.customerDisplayName && record.customerNumber
          ? `${record.customerDisplayName} · ${record.customerNumber}`
          : "Customer link not yet attached",
        opportunityNumber: record.opportunityNumber,
        quoteId: record.quoteId,
        quoteNumber: record.quoteNumber,
        quoteVersionNumber: record.latestVersionNumber,
        reviewHref: `/crm/quotes/${encodeURIComponent(record.quoteId)}/versions`
      },
      state: "PREPARED_HELD"
    };
  } catch (error) {
    if (error instanceof UnifiedCrmQuoteOperationalHandoffError) throw error;
    mapAccessError(error);
  }
}
