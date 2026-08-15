import type { AuthenticatedUser } from "@/server/auth/store";
import { UnifiedCrmQuoteError, type UnifiedCrmQuoteAccessContext } from "@/server/unified-crm/quote-contract";
import {
  UNIFIED_CRM_QUOTE_FOUNDATION_CONTRACT_VERSION,
  type UnifiedCrmQuoteFoundationItem,
  type UnifiedCrmQuoteFoundationModel
} from "@/server/unified-crm/quote-foundation-contract";
import { requireUnifiedCrmQuoteAccess } from "@/server/unified-crm/quote-access";
import type {
  UnifiedCrmQuoteFoundationRecord,
  UnifiedCrmQuoteFoundationRepository
} from "@/server/repositories/unified-crm-quote-foundation-repository";

type Dependencies = {
  accessContext?: UnifiedCrmQuoteAccessContext;
  mode?: unknown;
  nodeEnv?: string;
  now?: () => Date;
  repository?: UnifiedCrmQuoteFoundationRepository;
  scopeRepository?: {
    listActiveOrganizationIds(userId: string, now: Date): Promise<string[]>;
  };
};

function quoteVisibility(access: UnifiedCrmQuoteAccessContext) {
  return access.recordScope.kind === "ORGANIZATION" ? "organization" : "owned";
}

function toItem(record: UnifiedCrmQuoteFoundationRecord): UnifiedCrmQuoteFoundationItem {
  return {
    id: `quote-${record.quoteNumber}`,
    quoteNumber: record.quoteNumber,
    state: record.state,
    customerLabel: record.customerDisplayName && record.customerNumber
      ? `${record.customerDisplayName} · ${record.customerNumber}`
      : "Customer link not yet attached",
    opportunityLabel: record.opportunityNumber ?? "Opportunity link not yet attached",
    summary: record.state === "PRESENTED"
      ? "Presented evidence is retained as an immutable version. Follow-up edits must create a new version."
      : "Draft quote version history is retained without rewriting earlier evidence.",
    updatedAt: record.updatedAt.toISOString(),
    versionLabel: `v${record.latestVersionNumber}`
  };
}

function observationDetail(count: number, visibility: "organization" | "owned") {
  const visibilityLabel = visibility === "organization" ? "organization review" : "owned review";
  if (count > 0) {
    return `Only same-scope persisted quotes are listed here for ${visibilityLabel}. Drafting and presentation remain governed separately.`;
  }
  return `No same-scope persisted quote is visible right now for ${visibilityLabel}. Continue with held commercial review until one is available.`;
}

function observationFreshness(newestVisibleRecordUpdatedAt: string | null) {
  return newestVisibleRecordUpdatedAt
    ? `Newest visible persisted quote update observed at ${newestVisibleRecordUpdatedAt}.`
    : "No visible persisted quote update is available yet.";
}

export async function getUnifiedCrmQuoteFoundation(
  actor: AuthenticatedUser | null,
  dependencies: Dependencies = {}
): Promise<UnifiedCrmQuoteFoundationModel> {
  const access = dependencies.accessContext ?? await requireUnifiedCrmQuoteAccess(actor, dependencies);
  const generatedAt = (dependencies.now?.() ?? new Date()).toISOString();
  const repository = dependencies.repository ?? (await import("@/server/repositories/unified-crm-quote-foundation-repository"))
    .createUnifiedCrmQuoteFoundationRepository();
  const visibility = quoteVisibility(access);
  let records: UnifiedCrmQuoteFoundationRecord[];

  try {
    records = await repository.listRecentQuotes({
      limit: 5,
      organizationId: access.organizationId,
      recordScope: access.recordScope
    });
  } catch (error) {
    throw new UnifiedCrmQuoteError("QUOTE_OFF", "Quote foundation review is temporarily unavailable.", { cause: error });
  }

  const visibleQuotes = records.map(toItem);
  const newestVisibleRecordUpdatedAt = visibleQuotes.length
    ? new Date(Math.max(...visibleQuotes.map((record) => new Date(record.updatedAt).getTime()))).toISOString()
    : null;

  return {
    contractVersion: UNIFIED_CRM_QUOTE_FOUNDATION_CONTRACT_VERSION,
    generatedAt,
    headline: {
      title: "Review the quote foundation before commercial commands go live",
      detail: visibleQuotes.length
        ? `Versioned quote storage is now in place for ${visibility === "organization" ? "organization review" : "owned review"}, while draft edits, presentation, and approvals remain governed unlocks.`
        : `Versioned quote storage is now in place, while draft edits, presentation, and approvals remain governed unlocks for ${visibility === "organization" ? "organization review" : "owned review"}.`
    },
    readiness: [
      {
        id: "storage",
        label: "Versioned storage",
        detail: "Quote records now retain their current draft snapshot and separate immutable versions.",
        state: "READY"
      },
      {
        id: "presentation",
        label: "Presentation lock",
        detail: "Immutable presentation and later superseding versions remain held until dedicated command proof lands.",
        state: "HELD"
      },
      {
        id: "approvals",
        label: "Commercial approvals",
        detail: "Exact monetary and discount thresholds remain deferred and are not inferred by this slice.",
        state: "HELD"
      }
    ],
    liveObservation: {
      detail: observationDetail(visibleQuotes.length, visibility),
      freshnessLabel: observationFreshness(newestVisibleRecordUpdatedAt),
      newestVisibleRecordUpdatedAt,
      state: visibleQuotes.length ? "READY" : "EMPTY",
      visibleRecordCount: visibleQuotes.length
    },
    visibleQuotes,
    governance: [
      "No quote draft, presentation, approval, or conversion command is enabled by this slice.",
      "Presented evidence must remain immutable; later corrections create a new version rather than rewriting history.",
      "Commercial thresholds and exception authority remain separately governed and are not implied by stored data."
    ],
    nextUnlocks: [
      "Implement governed draft create and revise commands before any live seller workflow is enabled.",
      "Bind presentation to immutable version selection and audit before commercial review can proceed."
    ],
    source: {
      href: "/crm?view=more",
      label: "Unified CRM quote foundation",
      observedAt: generatedAt
    },
    state: "HELD_REVIEW",
    visibility
  };
}
