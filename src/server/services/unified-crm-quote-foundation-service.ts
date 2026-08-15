import type { AuthenticatedUser } from "@/server/auth/store";
import { UnifiedCrmQuoteError, type UnifiedCrmQuoteAccessContext } from "@/server/unified-crm/quote-contract";
import {
  UNIFIED_CRM_QUOTE_FOUNDATION_CONTRACT_VERSION,
  type UnifiedCrmQuoteFoundationItem,
  type UnifiedCrmQuoteDraftWorkspaceModel,
  type UnifiedCrmQuoteFoundationModel
} from "@/server/unified-crm/quote-foundation-contract";
import { resolveUnifiedCrmQuoteDraftMode } from "@/server/unified-crm/quote-draft-command";
import { requireUnifiedCrmQuoteAccess } from "@/server/unified-crm/quote-access";
import type {
  UnifiedCrmQuoteFoundationRecord,
  UnifiedCrmQuoteFoundationRepository,
  UnifiedCrmQuoteVisibleDraftWorkspace
} from "@/server/repositories/unified-crm-quote-foundation-repository";

type Dependencies = {
  accessContext?: UnifiedCrmQuoteAccessContext;
  draftMode?: unknown;
  mode?: unknown;
  nodeEnv?: string;
  now?: () => Date;
  repository?: UnifiedCrmQuoteFoundationRepository;
  selectedQuoteId?: string | null;
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
    recordId: record.id,
    quoteNumber: record.quoteNumber,
    state: record.state,
    customerId: record.customerId,
    customerLabel: record.customerDisplayName && record.customerNumber
      ? `${record.customerDisplayName} · ${record.customerNumber}`
      : "Customer link not yet attached",
    opportunityId: record.opportunityId,
    opportunityLabel: record.opportunityNumber ?? "Opportunity link not yet attached",
    summary: record.state === "PRESENTED"
      ? "Presented evidence is retained as an immutable version. Follow-up edits must create a new version."
      : "Draft quote version history is retained without rewriting earlier evidence.",
    updatedAt: record.updatedAt.toISOString(),
    versionLabel: `v${record.latestVersionNumber}`
  };
}

function objectValue(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function numberValue(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function buildDraftWorkspace(
  selected: UnifiedCrmQuoteVisibleDraftWorkspace | null,
  canDraft: boolean
): UnifiedCrmQuoteDraftWorkspaceModel {
  if (!selected) {
    return {
      currency: "USD",
      customerId: null,
      customerLabel: "Optional customer link",
      detail: canDraft
        ? "Start with one factual line item and clear terms. Saving a draft does not present it to the customer."
        : "Draft creation stays review only here right now. Quote presentation and approvals remain governed separately.",
      expectedVersionNumber: 0,
      lineItems: [{ description: "", id: "new-line-1", lineTotalCents: 0, quantity: 1, unitPriceCents: 0 }],
      mode: "CREATE",
      opportunityId: null,
      opportunityLabel: "Optional opportunity link",
      priceSource: "",
      quoteId: null,
      quoteNumber: null,
      state: canDraft ? "READY" : "REVIEW_ONLY",
      subtotalCents: 0,
      termsSummary: "",
      versions: []
    };
  }

  const snapshot = objectValue(selected.latestDraftSnapshot);
  const totals = objectValue(snapshot.totals);
  const lineItems = Array.isArray(snapshot.lineItems)
    ? snapshot.lineItems.map((item, index) => {
        const row = objectValue(item);
        const quantity = numberValue(row.quantity, 1);
        const unitPriceCents = numberValue(row.unitPriceCents, 0);
        return {
          description: stringValue(row.description),
          id: `line-${index + 1}`,
          lineTotalCents: quantity * unitPriceCents,
          quantity,
          unitPriceCents
        };
      })
    : [{ description: "", id: "new-line-1", lineTotalCents: 0, quantity: 1, unitPriceCents: 0 }];
  const versions = selected.versions.map((version) => {
    const totalsSnapshot = objectValue(version.totalsSnapshot);
    const lineItemSnapshot = Array.isArray(version.lineItemsSnapshot) ? version.lineItemsSnapshot : [];
    return {
      createdAt: version.createdAt.toISOString(),
      lineItemCount: lineItemSnapshot.length,
      presentedAt: version.presentedAt?.toISOString() ?? null,
      state: version.state,
      totalCents: numberValue(totalsSnapshot.totalCents, 0),
      versionNumber: version.versionNumber
    };
  });

  return {
    currency: selected.currency,
    customerId: selected.customerId,
    customerLabel: selected.customerDisplayName && selected.customerNumber
      ? `${selected.customerDisplayName} · ${selected.customerNumber}`
      : "Customer link not yet attached",
    detail: canDraft
      ? `Revising ${selected.quoteNumber} creates a new draft version and keeps any previously presented evidence intact.`
      : `You can review ${selected.quoteNumber} here, but drafting remains fail-closed for this viewer right now.`,
    expectedVersionNumber: selected.latestVersionNumber,
    lineItems,
    mode: "REVISE",
    opportunityId: selected.opportunityId,
    opportunityLabel: selected.opportunityNumber ?? "Opportunity link not yet attached",
    priceSource: selected.priceSource,
    quoteId: selected.id,
    quoteNumber: selected.quoteNumber,
    state: canDraft ? "READY" : "REVIEW_ONLY",
    subtotalCents: numberValue(totals.subtotalCents, lineItems.reduce((sum, item) => sum + item.lineTotalCents, 0)),
    termsSummary: stringValue(objectValue(selected.termsSnapshot).termsText ?? objectValue(selected.termsSnapshot).summary),
    versions
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
  const draftMode = resolveUnifiedCrmQuoteDraftMode({ mode: dependencies.draftMode, nodeEnv: dependencies.nodeEnv });
  let records: UnifiedCrmQuoteFoundationRecord[];
  let selectedDraft: UnifiedCrmQuoteVisibleDraftWorkspace | null = null;

  try {
    records = await repository.listRecentQuotes({
      limit: 5,
      organizationId: access.organizationId,
      recordScope: access.recordScope
    });
    selectedDraft = await repository.loadVisibleDraftWorkspace({
      organizationId: access.organizationId,
      quoteId: dependencies.selectedQuoteId ?? null,
      recordScope: access.recordScope
    });
  } catch (error) {
    throw new UnifiedCrmQuoteError("QUOTE_OFF", "Quote foundation review is temporarily unavailable.", { cause: error });
  }

  const visibleQuotes = records.map(toItem);
  const canDraft = access.capabilities.draft && draftMode === "REVIEW";
  const newestVisibleRecordUpdatedAt = visibleQuotes.length
    ? new Date(Math.max(...visibleQuotes.map((record) => new Date(record.updatedAt).getTime()))).toISOString()
    : null;

  return {
    commands: {
      draft: {
        available: canDraft,
        detail: canDraft
          ? "Draft create and revise are available from this workspace. Saving a draft does not present it or request approval."
          : "Drafting is review only from this workspace right now. Continue to review visible commercial history and wait for governed authority to unlock draft commands.",
        state: canDraft ? "READY" : "REVIEW_ONLY"
      },
      present: {
        available: false,
        detail: "Presentation remains held. Immutable versioning is required, but commercial presentation activation still depends on the deferred authority thresholds and later approval slices.",
        state: "HELD"
      }
    },
    contractVersion: UNIFIED_CRM_QUOTE_FOUNDATION_CONTRACT_VERSION,
    draftWorkspace: buildDraftWorkspace(selectedDraft, canDraft),
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
