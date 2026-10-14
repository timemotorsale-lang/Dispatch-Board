import { normalizeEnterpriseCommand, EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
import type { AuthenticatedUser } from "@/server/auth/store";
import {
  createUnifiedCrmQuoteDraftRepository,
  type UnifiedCrmQuoteDraftRepository
} from "@/server/repositories/unified-crm-quote-draft-repository";
import { requireUnifiedCrmQuoteDraftAccess } from "@/server/unified-crm/quote-draft-access";
import {
  UNIFIED_CRM_QUOTE_DRAFT_WORKSPACE_CONTRACT_VERSION,
  type UnifiedCrmQuoteDraftWorkspaceModel
} from "@/server/unified-crm/quote-draft-contract";
import {
  UNIFIED_CRM_QUOTE_DRAFT_COMMAND,
  UNIFIED_CRM_QUOTE_DRAFT_CONTRACT_VERSION,
  UnifiedCrmQuoteDraftError,
  type UnifiedCrmQuoteDraftCommand,
  type UnifiedCrmQuoteDraftCommandInput,
  type UnifiedCrmQuoteDraftCommandResult,
  type UnifiedCrmQuoteDraftLineItem
} from "@/server/unified-crm/quote-draft-command";
import {
  UNIFIED_CRM_QUOTE_VERSION_REVIEW_CONTRACT_VERSION,
  type UnifiedCrmQuoteVersionReviewModel
} from "@/server/unified-crm/quote-version-review-contract";
import type { UnifiedCrmQuoteAccessContext } from "@/server/unified-crm/quote-contract";
import { requireUnifiedCrmQuoteAccess } from "@/server/unified-crm/quote-access";

type Dependencies = {
  accessContext?: UnifiedCrmQuoteAccessContext;
  mode?: unknown;
  nodeEnv?: string;
  now?: () => Date;
  repository?: UnifiedCrmQuoteDraftRepository;
  scopeRepository?: {
    listActiveOrganizationIds(userId: string, now: Date): Promise<string[]>;
  };
};

type SaveDraftArguments = [AuthenticatedUser | null, UnifiedCrmQuoteDraftCommandInput, Dependencies?]
  | [AuthenticatedUser | null, string | null, UnifiedCrmQuoteDraftCommandInput, Dependencies?];

function text(value: unknown, field: string, max: number) {
  const result = typeof value === "string" ? value.trim() : "";
  if (!result) throw new UnifiedCrmQuoteDraftError("INVALID_QUOTE_COMMAND", `${field} is required.`);
  if (result.length > max) throw new UnifiedCrmQuoteDraftError("INVALID_QUOTE_COMMAND", `${field} must be ${max} characters or fewer.`);
  return result;
}

function optionalId(value: unknown, field: string) {
  if (value === null || value === undefined || value === "") return null;
  const result = typeof value === "string" ? value.trim() : "";
  if (!result || result.length > 200) throw new UnifiedCrmQuoteDraftError("INVALID_QUOTE_COMMAND", `${field} is invalid.`);
  return result;
}

function integer(value: unknown, field: string, options: { max?: number; min?: number } = {}) {
  const parsed = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN;
  if (!Number.isInteger(parsed)) throw new UnifiedCrmQuoteDraftError("INVALID_QUOTE_COMMAND", `${field} must be a whole number.`);
  if (options.min !== undefined && parsed < options.min) throw new UnifiedCrmQuoteDraftError("INVALID_QUOTE_COMMAND", `${field} must be at least ${options.min}.`);
  if (options.max !== undefined && parsed > options.max) throw new UnifiedCrmQuoteDraftError("INVALID_QUOTE_COMMAND", `${field} must be ${options.max} or fewer.`);
  return parsed;
}

function lineItems(value: unknown): UnifiedCrmQuoteDraftLineItem[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new UnifiedCrmQuoteDraftError("INVALID_QUOTE_COMMAND", "At least one quote line item is required.");
  }
  return value.map((entry, index) => {
    if (!entry || typeof entry !== "object") {
      throw new UnifiedCrmQuoteDraftError("INVALID_QUOTE_COMMAND", `Line item ${index + 1} is invalid.`);
    }
    const record = entry as Record<string, unknown>;
    return {
      description: text(record.description, `Line item ${index + 1} description`, 160),
      quantity: integer(record.quantity, `Line item ${index + 1} quantity`, { min: 1, max: 999 }),
      taxable: Boolean(record.taxable),
      unitPriceCents: integer(record.unitPriceCents, `Line item ${index + 1} unit price`, { min: 0, max: 50_000_000 })
    };
  });
}

function normalizeQuoteDraftCommand(value: UnifiedCrmQuoteDraftCommandInput): UnifiedCrmQuoteDraftCommand {
  const normalized: UnifiedCrmQuoteDraftCommand = {
    customerId: optionalId(value.customerId, "Customer"),
    discountCents: integer(value.discountCents ?? 0, "Discount", { min: 0, max: 50_000_000 }),
    expectedVersion: integer(value.expectedVersion ?? 0, "Expected version", { min: 0, max: 1_000_000 }),
    idempotencyKey: text(value.idempotencyKey, "Idempotency key", 200),
    lineItems: lineItems(value.lineItems),
    opportunityId: optionalId(value.opportunityId, "Opportunity"),
    priceSource: text(value.priceSource, "Price source", 120),
    quoteId: optionalId(value.quoteId, "Quote"),
    reason: text(value.reason, "Reason", 400),
    taxRateBasisPoints: integer(value.taxRateBasisPoints ?? 0, "Tax rate basis points", { min: 0, max: 10_000 }),
    termsSummary: text(value.termsSummary, "Terms summary", 500)
  };
  if (!normalized.customerId && !normalized.opportunityId) {
    throw new UnifiedCrmQuoteDraftError("INVALID_QUOTE_COMMAND", "A visible customer or opportunity link is required.");
  }
  return normalized;
}

function visibility(access: UnifiedCrmQuoteAccessContext) {
  return access.recordScope.kind === "ORGANIZATION" ? "organization" : "owned";
}

function formFromEditable(record: Awaited<ReturnType<UnifiedCrmQuoteDraftRepository["getDraftWorkspace"]>>["editableQuote"]) {
  if (!record) {
    return {
      customerId: "",
      discountCents: 0,
      expectedVersion: 0,
      lineItems: [{ description: "", quantity: 1, taxable: true, unitPriceCents: 0 }],
      mode: "create" as const,
      opportunityId: "",
      priceSource: "",
      quoteId: null,
      quoteNumber: null,
      taxRateBasisPoints: 0,
      termsSummary: ""
    };
  }
  return {
    customerId: record.customerId ?? "",
    discountCents: record.latestDraftSnapshot.discountCents,
    expectedVersion: Math.max(record.latestVersionNumber, 0),
    lineItems: record.latestDraftSnapshot.lineItems.length
      ? record.latestDraftSnapshot.lineItems
      : [{ description: "", quantity: 1, taxable: true, unitPriceCents: 0 }],
    mode: "update" as const,
    opportunityId: record.opportunityId ?? "",
    priceSource: record.latestDraftSnapshot.priceSource,
    quoteId: record.quoteId,
    quoteNumber: record.quoteNumber,
    taxRateBasisPoints: record.latestDraftSnapshot.taxRateBasisPoints,
    termsSummary: record.latestDraftSnapshot.termsSummary
  };
}

export async function getUnifiedCrmQuoteDraftWorkspace(
  actor: AuthenticatedUser | null,
  quoteId: string | null,
  dependencies: Dependencies = {}
): Promise<UnifiedCrmQuoteDraftWorkspaceModel> {
  const access = dependencies.accessContext ?? await requireUnifiedCrmQuoteAccess(actor, { ...dependencies, mode: dependencies.mode });
  const generatedAt = (dependencies.now?.() ?? new Date()).toISOString();
  const repository = dependencies.repository ?? createUnifiedCrmQuoteDraftRepository();
  const workspaceData = await repository.getDraftWorkspace({
    organizationId: access.organizationId,
    quoteId,
    recordScope: access.recordScope
  });
  const canDraft = access.capabilities.draft;
  const currentVisibility = visibility(access);

  return {
    action: canDraft
      ? {
          detail: "Draft save is active for visible quote records. Presentation, approval, and operational conversion remain separately governed.",
          label: workspaceData.editableQuote ? "Save quote draft revision" : "Create quote draft",
          state: "READY"
        }
      : {
          detail: "Draft save stays fail-closed until quote create authority is granted for this viewer.",
          label: "Quote draft save",
          state: "HELD"
        },
    contractVersion: UNIFIED_CRM_QUOTE_DRAFT_WORKSPACE_CONTRACT_VERSION,
    generatedAt,
    governance: [
      "Only visible customer and opportunity records may be linked to a quote draft from this workspace.",
      "Saving a draft records command ledger, audit evidence, aggregate version changes, and a new draft version snapshot.",
      "Quote presentation, approvals, and operational conversion remain governed separately and do not activate here."
    ],
    headline: {
      title: workspaceData.editableQuote
        ? `Revise ${workspaceData.editableQuote.quoteNumber} without touching immutable evidence`
        : "Create the first governed quote draft",
      detail: canDraft
        ? "This workspace saves real persisted quote drafts, recalculates totals deterministically, and records audit evidence before anything can be presented."
        : "This workspace shows the exact governed draft path, but draft save remains fail-closed for this viewer."
    },
    nextUnlocks: [
      "Add presented-version lock proof before any commercial presentation command is enabled.",
      "Keep approval thresholds and independent manager decisions held until the deferred pricing authority decision is completed."
    ],
    source: {
      href: "/crm/quotes",
      label: "Unified CRM quote draft workspace",
      observedAt: generatedAt
    },
    state: canDraft ? "LIVE_DRAFT" : "HELD_REVIEW",
    form: formFromEditable(workspaceData.editableQuote),
    visibility: currentVisibility,
    visibleDrafts: workspaceData.visibleDrafts.map((item) => ({
      customerLabel: item.customerLabel,
      editHref: `/crm/quotes/draft?quoteId=${encodeURIComponent(item.quoteId)}`,
      latestVersionLabel: `v${item.latestVersionNumber}`,
      quoteId: item.quoteId,
      quoteNumber: item.quoteNumber,
      totalCents: item.latestDraftSnapshot.totalCents,
      updatedAt: item.updatedAt.toISOString()
    }))
  };
}

export async function saveUnifiedCrmQuoteDraft(...args: SaveDraftArguments): Promise<UnifiedCrmQuoteDraftCommandResult> {
  const actor = args[0];
  const quoteId = typeof args[1] === "string" || args[1] === null ? args[1] : null;
  const value = (typeof args[1] === "string" || args[1] === null ? args[2] : args[1]) as UnifiedCrmQuoteDraftCommandInput;
  const dependencies = ((typeof args[1] === "string" || args[1] === null ? args[3] : args[2]) ?? {}) as Dependencies;
  const access = dependencies.accessContext ?? await requireUnifiedCrmQuoteDraftAccess(actor, {
    draftMode: dependencies.mode,
    nodeEnv: dependencies.nodeEnv,
    quoteMode: dependencies.mode,
    scopeRepository: dependencies.scopeRepository
  });
  const repository = dependencies.repository ?? createUnifiedCrmQuoteDraftRepository();
  const normalized = normalizeQuoteDraftCommand(quoteId ? { ...(value ?? {}), quoteId } : (value ?? {}));

  try {
    const command = normalizeEnterpriseCommand({
      actorUserId: access.actorUserId,
      commandType: UNIFIED_CRM_QUOTE_DRAFT_COMMAND,
      domain: "UNIFIED_CRM",
      expectedVersion: normalized.expectedVersion,
      idempotencyKey: normalized.idempotencyKey,
      locationId: null,
      organizationId: access.organizationId,
      payload: {
        customerId: normalized.customerId,
        discountCents: normalized.discountCents,
        lineItems: normalized.lineItems,
        opportunityId: normalized.opportunityId,
        priceSource: normalized.priceSource,
        quoteId: normalized.quoteId,
        taxRateBasisPoints: normalized.taxRateBasisPoints,
        termsSummary: normalized.termsSummary
      },
      reason: normalized.reason,
      subjectId: normalized.quoteId ?? `new-quote:${access.actorUserId}`,
      subjectType: "QUOTE"
    });

    const result = await repository.saveDraft({
      command: {
        actorUserId: access.actorUserId,
        correlationId: command.correlationId,
        customerId: normalized.customerId,
        discountCents: normalized.discountCents,
        domain: command.domain,
        expectedVersion: normalized.expectedVersion,
        idempotencyKey: normalized.idempotencyKey,
        lineItems: normalized.lineItems,
        opportunityId: normalized.opportunityId,
        organizationId: access.organizationId,
        priceSource: normalized.priceSource,
        quoteId: normalized.quoteId,
        reason: normalized.reason,
        requestHash: command.requestHash,
        taxRateBasisPoints: normalized.taxRateBasisPoints,
        termsSummary: normalized.termsSummary
      },
      recordScope: access.recordScope
    });

    return {
      contractVersion: UNIFIED_CRM_QUOTE_DRAFT_CONTRACT_VERSION,
      duplicate: result.duplicate,
      latestVersionNumber: result.latestVersionNumber,
      quoteId: result.quoteId,
      quoteNumber: result.quoteNumber,
      state: "DRAFT",
      version: result.version,
      versionNumber: result.latestVersionNumber
    };
  } catch (error) {
    if (error instanceof UnifiedCrmQuoteDraftError) throw error;
    if (error instanceof EnterpriseCommandConflictError) {
      throw new UnifiedCrmQuoteDraftError(
        error.code === "VERSION_CONFLICT" ? "QUOTE_VERSION_CONFLICT" : "IDEMPOTENCY_KEY_REUSED",
        error.code === "VERSION_CONFLICT"
          ? "Quote draft is stale. Refresh before saving again."
          : "Idempotency key was already used with a different quote draft.",
        { cause: error }
      );
    }
    if (error instanceof Error && error.message === "Stale quote draft.") {
      throw new UnifiedCrmQuoteDraftError("QUOTE_VERSION_CONFLICT", "This quote changed before your draft could be saved.", { cause: error });
    }
    if (error instanceof Error && error.message === "Customer not available.") {
      throw new UnifiedCrmQuoteDraftError("QUOTE_NOT_AVAILABLE", "Customer is not available for this quote draft.");
    }
    if (error instanceof Error && error.message === "Opportunity not available.") {
      throw new UnifiedCrmQuoteDraftError("QUOTE_NOT_AVAILABLE", "Opportunity is not available for this quote draft.");
    }
    if (error instanceof Error && error.message === "Quote not available.") {
      throw new UnifiedCrmQuoteDraftError("QUOTE_NOT_AVAILABLE", "Quote draft is not available for this viewer.");
    }
    if (error instanceof Error && error.message === "Presented quotes cannot be revised from the draft workflow.") {
      throw new UnifiedCrmQuoteDraftError("QUOTE_MUTATION_HELD", "Presented quote revisions remain held until the immutable presentation workflow is completed.");
    }
    if (error instanceof Error && error.message === "Quote draft requires a visible customer or opportunity.") {
      throw new UnifiedCrmQuoteDraftError("INVALID_QUOTE_COMMAND", "A visible customer or opportunity link is required.");
    }
    if (error instanceof Error && "code" in error && String((error as { code?: string }).code) === "IDEMPOTENCY_KEY_REUSED") {
      throw new UnifiedCrmQuoteDraftError("IDEMPOTENCY_KEY_REUSED", "Idempotency key was already used with a different quote draft.");
    }
    throw new UnifiedCrmQuoteDraftError("QUOTE_SOURCE_UNAVAILABLE", "Quote draft could not be recorded safely.", { cause: error });
  }
}

export async function getUnifiedCrmQuoteVersionReview(
  actor: AuthenticatedUser | null,
  quoteId: string,
  dependencies: Dependencies = {}
): Promise<UnifiedCrmQuoteVersionReviewModel> {
  const access = dependencies.accessContext ?? await requireUnifiedCrmQuoteAccess(actor, dependencies);
  const generatedAt = (dependencies.now?.() ?? new Date()).toISOString();
  const repository = dependencies.repository ?? createUnifiedCrmQuoteDraftRepository();
  const review = await repository.getVersionReview({
    organizationId: access.organizationId,
    quoteId,
    recordScope: access.recordScope
  });
  if (!review) {
    throw new UnifiedCrmQuoteDraftError("QUOTE_NOT_AVAILABLE", "Quote version review is not available for this viewer.");
  }
  const currentVisibility = visibility(access);

  return {
    contractVersion: UNIFIED_CRM_QUOTE_VERSION_REVIEW_CONTRACT_VERSION,
    generatedAt,
    governance: [
      "Presented quote evidence is immutable and remains visible as version history rather than being rewritten.",
      "Any future revise-after-presentation flow must create a new draft version instead of overwriting presented evidence.",
      "Presentation authority remains held until the quote issue boundary is independently proven."
    ],
    headline: {
      title: `Review version history for ${review.quoteNumber}`,
      detail: review.state === "PRESENTED"
        ? "Presented evidence is visible as immutable history. This surface does not unlock presentation, approval, or self-approval."
        : "Draft history is visible here first so version identity is clear before the presentation boundary goes live."
    },
    liveObservation: {
      detail: review.presentedVersionNumber
        ? `Presented version v${review.presentedVersionNumber} remains immutable. Later revisions must supersede it rather than rewrite it.`
        : "No presented version is visible yet. Draft history is shown without claiming a live presentation command.",
      presentedVersionLabel: review.presentedVersionNumber ? `v${review.presentedVersionNumber}` : null,
      state: review.presentedVersionNumber ? "IMMUTABLE_PRESENTED" : "DRAFT_ONLY"
    },
    presentAction: {
      detail: "Quote presentation stays fail-closed until the immutable lock and approval boundary are fully proven together.",
      label: "Present quote",
      state: "HELD"
    },
    quote: {
      customerLabel: review.customerLabel,
      opportunityLabel: review.opportunityLabel,
      quoteId: review.quoteId,
      quoteNumber: review.quoteNumber,
      state: review.state,
      updatedAt: review.updatedAt.toISOString()
    },
    source: {
      href: "/crm/quotes",
      label: "Unified CRM quote version review",
      observedAt: generatedAt
    },
    state: "HELD_REVIEW",
    versions: review.versions.map((version) => ({
      createdAt: version.createdAt.toISOString(),
      immutableNote: version.state === "PRESENTED"
        ? "This presented version is immutable evidence."
        : version.state === "SUPERSEDED"
          ? "This version was superseded and remains visible for audit history."
          : "This draft version remains reviewable without any presentation claim.",
      lineItemCount: version.lineItemCount,
      presentedAt: version.presentedAt?.toISOString() ?? null,
      state: version.state,
      subtotalCents: version.subtotalCents,
      totalCents: version.totalCents,
      versionId: version.versionId,
      versionLabel: `v${version.versionNumber}`
    })),
    visibility: currentVisibility
  };
}
