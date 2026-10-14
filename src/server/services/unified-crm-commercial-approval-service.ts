import { EnterpriseCommandConflictError, normalizeEnterpriseCommand } from "@/server/enterprise-command/domain";
import type { AuthenticatedUser } from "@/server/auth/store";
import {
  createUnifiedCrmCommercialApprovalRepository,
  type UnifiedCrmCommercialApprovalRepository
} from "@/server/repositories/unified-crm-commercial-approval-repository";
import {
  UNIFIED_CRM_COMMERCIAL_APPROVAL_CONTRACT_VERSION,
  UNIFIED_CRM_COMMERCIAL_APPROVAL_DECISION_COMMAND,
  UNIFIED_CRM_COMMERCIAL_APPROVAL_REQUEST_COMMAND,
  UnifiedCrmCommercialApprovalError,
  type UnifiedCrmCommercialApprovalDecision,
  type UnifiedCrmCommercialApprovalDecisionInput,
  type UnifiedCrmCommercialApprovalRequestInput,
  type UnifiedCrmCommercialApprovalResult
} from "@/server/unified-crm/commercial-approval-command";
import { requireUnifiedCrmQuoteAccess } from "@/server/unified-crm/quote-access";
import { requireUnifiedCrmQuoteDraftAccess } from "@/server/unified-crm/quote-draft-access";
import { UnifiedCrmQuoteDraftError } from "@/server/unified-crm/quote-draft-command";
import { UnifiedCrmQuoteError } from "@/server/unified-crm/quote-contract";

type Dependencies = {
  mode?: unknown;
  nodeEnv?: string;
  repository?: UnifiedCrmCommercialApprovalRepository;
  scopeRepository?: {
    listActiveOrganizationIds(userId: string, now: Date): Promise<string[]>;
  };
};

function text(value: unknown, field: string, max: number) {
  const result = typeof value === "string" ? value.trim() : "";
  if (!result) throw new UnifiedCrmCommercialApprovalError("INVALID_COMMERCIAL_APPROVAL_COMMAND", `${field} is required.`);
  if (result.length > max) throw new UnifiedCrmCommercialApprovalError("INVALID_COMMERCIAL_APPROVAL_COMMAND", `${field} must be ${max} characters or fewer.`);
  return result;
}

function integer(value: unknown, field: string, options: { max?: number; min?: number } = {}) {
  const parsed = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN;
  if (!Number.isInteger(parsed)) throw new UnifiedCrmCommercialApprovalError("INVALID_COMMERCIAL_APPROVAL_COMMAND", `${field} must be a whole number.`);
  if (options.min !== undefined && parsed < options.min) throw new UnifiedCrmCommercialApprovalError("INVALID_COMMERCIAL_APPROVAL_COMMAND", `${field} must be at least ${options.min}.`);
  if (options.max !== undefined && parsed > options.max) throw new UnifiedCrmCommercialApprovalError("INVALID_COMMERCIAL_APPROVAL_COMMAND", `${field} must be ${options.max} or fewer.`);
  return parsed;
}

function decision(value: unknown): UnifiedCrmCommercialApprovalDecision {
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (normalized === "APPROVED" || normalized === "RETURNED" || normalized === "DENIED") return normalized;
  throw new UnifiedCrmCommercialApprovalError("INVALID_COMMERCIAL_APPROVAL_COMMAND", "Decision must be APPROVED, RETURNED, or DENIED.");
}

function canManageCommercialApprovals(actor: AuthenticatedUser | null) {
  const roles = actor?.roles ?? [];
  return roles.some((role) => ["GENERAL MANAGER", "SALES MANAGER"].includes(role.trim().toUpperCase()));
}

function mapAccessError(error: unknown): never {
  if (error instanceof UnifiedCrmCommercialApprovalError) throw error;
  if (error instanceof UnifiedCrmQuoteDraftError || error instanceof UnifiedCrmQuoteError) {
    if (error.code === "AUTHENTICATION_REQUIRED") throw new UnifiedCrmCommercialApprovalError("AUTHENTICATION_REQUIRED", "Commercial approvals require sign-in.", { cause: error });
    if (error.code === "ORGANIZATION_SCOPE_UNAVAILABLE") throw new UnifiedCrmCommercialApprovalError("ORGANIZATION_SCOPE_UNAVAILABLE", "Commercial approvals are not available for this viewer.", { cause: error });
    if (error.code === "ORGANIZATION_SCOPE_AMBIGUOUS") throw new UnifiedCrmCommercialApprovalError("ORGANIZATION_SCOPE_AMBIGUOUS", "Commercial approvals are temporarily unavailable.", { cause: error });
    if (error.code === "QUOTE_OFF" || error.code === "QUOTE_DRAFT_OFF") throw new UnifiedCrmCommercialApprovalError("COMMERCIAL_APPROVAL_OFF", "Commercial approvals are temporarily unavailable.", { cause: error });
    throw new UnifiedCrmCommercialApprovalError("UNAUTHORIZED_COMMERCIAL_APPROVAL", "Commercial approvals are not available for this viewer.", { cause: error });
  }
  throw new UnifiedCrmCommercialApprovalError("COMMERCIAL_APPROVAL_SOURCE_UNAVAILABLE", "Commercial approval could not be recorded safely.", { cause: error });
}

function mapRepositoryError(error: unknown): never {
  if (error instanceof UnifiedCrmCommercialApprovalError) throw error;
  if (error instanceof EnterpriseCommandConflictError) {
    throw new UnifiedCrmCommercialApprovalError(
      error.code === "VERSION_CONFLICT" ? "COMMERCIAL_APPROVAL_VERSION_CONFLICT" : "IDEMPOTENCY_KEY_REUSED",
      error.code === "VERSION_CONFLICT"
        ? "Commercial approval state changed. Refresh before trying again."
        : "Idempotency key was already used with a different commercial approval command.",
      { cause: error }
    );
  }
  if (error instanceof Error && error.message === "Quote not available.") {
    throw new UnifiedCrmCommercialApprovalError("QUOTE_NOT_AVAILABLE", "Quote is not available for this approval request.", { cause: error });
  }
  if (error instanceof Error && error.message === "Commercial approval request not available.") {
    throw new UnifiedCrmCommercialApprovalError("REQUEST_NOT_AVAILABLE", "Commercial approval request is not available.", { cause: error });
  }
  if (error instanceof Error && error.message === "Commercial approval request is not pending.") {
    throw new UnifiedCrmCommercialApprovalError("REQUEST_NOT_PENDING", "Commercial approval request is no longer pending.", { cause: error });
  }
  if (error instanceof Error && error.message === "Commercial approval requires a different authorized user than the requester.") {
    throw new UnifiedCrmCommercialApprovalError("SELF_APPROVAL_NOT_ALLOWED", "Commercial approval requires a different authorized user than the requester.", { cause: error });
  }
  if (error instanceof Error && error.message === "Commercial approval decision requires sales management authority.") {
    throw new UnifiedCrmCommercialApprovalError("UNAUTHORIZED_COMMERCIAL_APPROVAL", "Commercial approval decision requires sales management authority.", { cause: error });
  }
  throw new UnifiedCrmCommercialApprovalError("COMMERCIAL_APPROVAL_SOURCE_UNAVAILABLE", "Commercial approval could not be recorded safely.", { cause: error });
}

function toResult(record: Awaited<ReturnType<UnifiedCrmCommercialApprovalRepository["request"]>>): UnifiedCrmCommercialApprovalResult {
  return {
    amountCents: record.amountCents,
    contractVersion: UNIFIED_CRM_COMMERCIAL_APPROVAL_CONTRACT_VERSION,
    decision: record.decision,
    discountCents: record.discountCents,
    duplicate: record.duplicate,
    purpose: record.purpose,
    quoteId: record.quoteId,
    quoteNumber: record.quoteNumber,
    quoteVersionNumber: record.quoteVersionNumber,
    requestId: record.requestId,
    requestedByUserId: record.requestedByUserId,
    status: record.status,
    version: record.version
  };
}

export async function requestUnifiedCrmCommercialApproval(
  actor: AuthenticatedUser | null,
  quoteId: string,
  value: UnifiedCrmCommercialApprovalRequestInput,
  dependencies: Dependencies = {}
): Promise<UnifiedCrmCommercialApprovalResult> {
  try {
    const access = await requireUnifiedCrmQuoteDraftAccess(actor, {
      draftMode: dependencies.mode,
      nodeEnv: dependencies.nodeEnv,
      quoteMode: dependencies.mode,
      scopeRepository: dependencies.scopeRepository
    });
    const normalized = {
      amountCents: integer(value.amountCents, "Amount", { min: 0, max: 100_000_000 }),
      discountCents: integer(value.discountCents ?? 0, "Discount", { min: 0, max: 100_000_000 }),
      expectedQuoteVersion: integer(value.expectedQuoteVersion, "Expected quote version", { min: 1, max: 1_000_000 }),
      idempotencyKey: text(value.idempotencyKey, "Idempotency key", 200),
      purpose: text(value.purpose, "Purpose", 160),
      reason: text(value.reason, "Reason", 500)
    };
    const command = normalizeEnterpriseCommand({
      actorUserId: access.actorUserId,
      commandType: UNIFIED_CRM_COMMERCIAL_APPROVAL_REQUEST_COMMAND,
      domain: "UNIFIED_CRM",
      expectedVersion: normalized.expectedQuoteVersion,
      idempotencyKey: normalized.idempotencyKey,
      locationId: null,
      organizationId: access.organizationId,
      payload: {
        amountCents: normalized.amountCents,
        discountCents: normalized.discountCents,
        purpose: normalized.purpose,
        quoteId
      },
      reason: normalized.reason,
      subjectId: quoteId,
      subjectType: "COMMERCIAL_APPROVAL"
    });
    const repository = dependencies.repository ?? createUnifiedCrmCommercialApprovalRepository();
    return toResult(await repository.request({
      command: {
        actorUserId: access.actorUserId,
        amountCents: normalized.amountCents,
        commandType: command.commandType,
        correlationId: command.correlationId,
        discountCents: normalized.discountCents,
        domain: command.domain,
        expectedVersion: normalized.expectedQuoteVersion,
        idempotencyKey: normalized.idempotencyKey,
        organizationId: access.organizationId,
        purpose: normalized.purpose,
        quoteId,
        reason: normalized.reason,
        requestHash: command.requestHash
      },
      recordScope: access.recordScope
    }));
  } catch (error) {
    if (error instanceof UnifiedCrmQuoteDraftError || error instanceof UnifiedCrmQuoteError) mapAccessError(error);
    mapRepositoryError(error);
  }
}

export async function decideUnifiedCrmCommercialApproval(
  actor: AuthenticatedUser | null,
  requestId: string,
  value: UnifiedCrmCommercialApprovalDecisionInput,
  dependencies: Dependencies = {}
): Promise<UnifiedCrmCommercialApprovalResult> {
  try {
    const access = await requireUnifiedCrmQuoteAccess(actor, {
      mode: dependencies.mode,
      nodeEnv: dependencies.nodeEnv,
      scopeRepository: dependencies.scopeRepository
    });
    const normalized = {
      decision: decision(value.decision),
      expectedVersion: integer(value.expectedVersion, "Expected approval version", { min: 1, max: 1_000_000 }),
      idempotencyKey: text(value.idempotencyKey, "Idempotency key", 200),
      reason: text(value.reason, "Reason", 500)
    };
    const command = normalizeEnterpriseCommand({
      actorUserId: access.actorUserId,
      commandType: UNIFIED_CRM_COMMERCIAL_APPROVAL_DECISION_COMMAND,
      domain: "UNIFIED_CRM",
      expectedVersion: normalized.expectedVersion,
      idempotencyKey: normalized.idempotencyKey,
      locationId: null,
      organizationId: access.organizationId,
      payload: {
        decision: normalized.decision,
        requestId
      },
      reason: normalized.reason,
      subjectId: requestId,
      subjectType: "COMMERCIAL_APPROVAL"
    });
    const repository = dependencies.repository ?? createUnifiedCrmCommercialApprovalRepository();
    return toResult(await repository.decide({
      command: {
        actorUserId: access.actorUserId,
        commandType: command.commandType,
        correlationId: command.correlationId,
        decision: normalized.decision,
        domain: command.domain,
        expectedVersion: normalized.expectedVersion,
        idempotencyKey: normalized.idempotencyKey,
        organizationId: access.organizationId,
        reason: normalized.reason,
        requestHash: command.requestHash,
        requestId
      },
      decisionActorMayManage: canManageCommercialApprovals(actor)
    }));
  } catch (error) {
    if (error instanceof UnifiedCrmQuoteDraftError || error instanceof UnifiedCrmQuoteError) mapAccessError(error);
    mapRepositoryError(error);
  }
}
