import { normalizeEnterpriseCommand } from "@/server/enterprise-command/domain";
import type { AuthenticatedUser } from "@/server/auth/store";
import type { UnifiedCrmCustomerReadRepository } from "@/server/repositories/unified-crm-customer-read-repository";
import {
  createUnifiedCrmOpportunityCreateRepository,
  type UnifiedCrmOpportunityCreateRepository
} from "@/server/repositories/unified-crm-opportunity-create-repository";
import { getUnifiedCrmOpportunityAccessContext } from "@/server/unified-crm/opportunity-access";
import {
  UNIFIED_CRM_OPPORTUNITY_CREATE_COMMAND,
  UNIFIED_CRM_OPPORTUNITY_CREATE_COMMAND_CONTRACT_VERSION,
  UnifiedCrmOpportunityCreateError,
  type UnifiedCrmOpportunityCreateCommandInput,
  type UnifiedCrmOpportunityCreateCommandResult
} from "@/server/unified-crm/opportunity-create-command";
import type { UnifiedCrmOpportunityAccessContext } from "@/server/unified-crm/opportunity-contract";
import { type UnifiedCrmOpportunityStage } from "@/server/unified-crm/opportunity-lifecycle";

type Dependencies = {
  accessContext?: UnifiedCrmOpportunityAccessContext;
  mode?: unknown;
  nodeEnv?: string;
  now?: () => Date;
  repository?: UnifiedCrmOpportunityCreateRepository;
  scopeRepository?: Pick<UnifiedCrmCustomerReadRepository, "listActiveOrganizationIds">;
};

type NormalizedCreateCommand = {
  customerId: string | null;
  estimatedValueCents: number | null;
  expectedCloseAt: Date | null;
  idempotencyKey: string;
  nextActionDueAt: Date;
  nextActionLabel: string;
  ownerUserId: string;
  sourceLeadId: string | null;
  stage: UnifiedCrmOpportunityStage;
  summary: string | null;
  title: string;
};

function text(value: unknown, field: string, max: number, required = true) {
  const result = typeof value === "string" ? value.trim() : "";
  if (!result) {
    if (required) throw new UnifiedCrmOpportunityCreateError("INVALID_OPPORTUNITY_COMMAND", `${field} is required.`);
    return null;
  }
  if (result.length > max) {
    throw new UnifiedCrmOpportunityCreateError("INVALID_OPPORTUNITY_COMMAND", `${field} must be ${max} characters or fewer.`);
  }
  return result;
}

function timestamp(value: unknown, field: string, now: Date, required = true) {
  if (value == null || value === "") {
    if (required) throw new UnifiedCrmOpportunityCreateError("INVALID_OPPORTUNITY_COMMAND", `${field} is required.`);
    return null;
  }
  const result = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(result.getTime())) {
    throw new UnifiedCrmOpportunityCreateError("INVALID_OPPORTUNITY_COMMAND", `${field} is invalid.`);
  }
  if (result.getTime() < now.getTime() - 60_000) {
    throw new UnifiedCrmOpportunityCreateError("INVALID_OPPORTUNITY_COMMAND", `${field} must be current or future.`);
  }
  return result;
}

function money(value: unknown) {
  if (value == null || value === "") return null;
  const result = typeof value === "number" ? value : Number(String(value));
  if (!Number.isInteger(result) || result < 0 || result > 100_000_000_00) {
    throw new UnifiedCrmOpportunityCreateError("INVALID_OPPORTUNITY_COMMAND", "Estimated value must be a non-negative whole cent amount.");
  }
  return result;
}

function normalizeCommand(input: UnifiedCrmOpportunityCreateCommandInput, now: Date): NormalizedCreateCommand {
  const customerId = text(input.customerId, "Customer", 200, false);
  const sourceLeadId = text(input.sourceLeadId, "Source lead", 200, false);
  if (!customerId && !sourceLeadId) {
    throw new UnifiedCrmOpportunityCreateError("INVALID_OPPORTUNITY_COMMAND", "Customer or source lead context is required.");
  }
  return {
    customerId,
    estimatedValueCents: money(input.estimatedValueCents),
    expectedCloseAt: timestamp(input.expectedCloseAt, "Expected close", now, false),
    idempotencyKey: text(input.idempotencyKey, "Idempotency key", 200)!,
    nextActionDueAt: timestamp(input.nextActionDueAt, "Next action due time", now)!,
    nextActionLabel: text(input.nextActionLabel, "Next action", 240)!,
    ownerUserId: text(input.ownerUserId, "Owner", 200)!,
    sourceLeadId,
    stage: "NEW_INQUIRY",
    summary: text(input.summary, "Summary", 1000, false),
    title: text(input.title, "Title", 160)!
  };
}

function opportunityNumber(now: Date) {
  const stamp = now.toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  return `OPP-${stamp}`;
}

export async function createUnifiedCrmOpportunity(
  actor: AuthenticatedUser | null,
  input: UnifiedCrmOpportunityCreateCommandInput,
  dependencies: Dependencies = {}
): Promise<UnifiedCrmOpportunityCreateCommandResult> {
  try {
    const now = dependencies.now?.() ?? new Date();
    const access = dependencies.accessContext ?? await getUnifiedCrmOpportunityAccessContext(actor, "create", {
      mode: dependencies.mode,
      nodeEnv: dependencies.nodeEnv,
      now: () => now,
      scopeRepository: dependencies.scopeRepository
    });
    const normalized = normalizeCommand(input, now);
    const command = normalizeEnterpriseCommand({
      actorUserId: actor!.id,
      commandType: UNIFIED_CRM_OPPORTUNITY_CREATE_COMMAND,
      domain: "UNIFIED_CRM",
      expectedVersion: 0,
      idempotencyKey: normalized.idempotencyKey,
      locationId: null,
      organizationId: access.organizationId,
      payload: {
        customerId: normalized.customerId,
        estimatedValueCents: normalized.estimatedValueCents,
        expectedCloseAt: normalized.expectedCloseAt?.toISOString() ?? null,
        nextActionDueAt: normalized.nextActionDueAt.toISOString(),
        nextActionLabel: normalized.nextActionLabel,
        ownerUserId: normalized.ownerUserId,
        sourceLeadId: normalized.sourceLeadId,
        stage: normalized.stage,
        summary: normalized.summary,
        title: normalized.title
      },
      reason: `Create CRM opportunity: ${normalized.title}`,
      subjectId: opportunityNumber(now),
      subjectType: "OPPORTUNITY"
    });

    const repository = dependencies.repository ?? createUnifiedCrmOpportunityCreateRepository();
    const result = await repository.createOpportunity({
      command: {
        actorUserId: actor!.id,
        commandType: command.commandType,
        correlationId: command.correlationId,
        customerId: normalized.customerId,
        estimatedValueCents: normalized.estimatedValueCents,
        expectedCloseAt: normalized.expectedCloseAt,
        idempotencyKey: command.idempotencyKey,
        nextActionDueAt: normalized.nextActionDueAt,
        nextActionLabel: normalized.nextActionLabel,
        opportunityNumber: command.subjectId,
        organizationId: access.organizationId,
        ownerUserId: normalized.ownerUserId,
        reason: command.reason,
        requestHash: command.requestHash,
        sourceLeadId: normalized.sourceLeadId,
        stage: normalized.stage,
        summary: normalized.summary,
        title: normalized.title
      },
      recordScope: access.recordScope
    });

    return {
      contractVersion: UNIFIED_CRM_OPPORTUNITY_CREATE_COMMAND_CONTRACT_VERSION,
      duplicate: result.duplicate,
      opportunity: {
        customerId: result.customerId,
        estimatedValueCents: result.estimatedValueCents,
        expectedCloseAt: result.expectedCloseAt?.toISOString() ?? null,
        href: `/crm/opportunities/${encodeURIComponent(result.opportunityNumber)}`,
        id: result.id,
        nextActionDueAt: result.nextActionDueAt.toISOString(),
        nextActionLabel: result.nextActionLabel,
        opportunityNumber: result.opportunityNumber,
        ownerUserId: result.ownerUserId,
        sourceLeadId: result.sourceLeadId,
        stage: result.stage,
        summary: result.summary,
        title: result.title,
        version: result.version
      }
    };
  } catch (error) {
    if (error instanceof UnifiedCrmOpportunityCreateError) throw error;
    if (error instanceof Error && "code" in error && String((error as { code?: string }).code) === "IDEMPOTENCY_KEY_REUSED") {
      throw new UnifiedCrmOpportunityCreateError("IDEMPOTENCY_KEY_REUSED", "Idempotency key was already used with a different opportunity create request.");
    }
    if (error instanceof Error && error.message === "Customer not available.") {
      throw new UnifiedCrmOpportunityCreateError("CUSTOMER_NOT_AVAILABLE", "Customer details are not available.");
    }
    if (error instanceof Error && error.message === "Owner not available.") {
      throw new UnifiedCrmOpportunityCreateError("OWNER_NOT_AVAILABLE", "Opportunity owner is not available.");
    }
    if (error instanceof Error && error.message === "Source lead not available.") {
      throw new UnifiedCrmOpportunityCreateError("SOURCE_LEAD_NOT_AVAILABLE", "Source lead is not available.");
    }
    if (error instanceof Error && "code" in error) {
      const code = String((error as { code?: string }).code);
      if (code === "AUTHENTICATION_REQUIRED" || code === "OPPORTUNITY_NOT_AUTHORIZED" || code === "OPPORTUNITY_OFF" || code === "ORGANIZATION_SCOPE_AMBIGUOUS" || code === "ORGANIZATION_SCOPE_UNAVAILABLE") {
        throw new UnifiedCrmOpportunityCreateError(code, error.message);
      }
      if (code === "OPPORTUNITY_MUTATION_HELD") {
        throw new UnifiedCrmOpportunityCreateError("OPPORTUNITY_CREATE_NOT_AUTHORIZED", "Opportunity create is not available for this viewer.");
      }
    }
    throw new UnifiedCrmOpportunityCreateError("OPPORTUNITY_SOURCE_UNAVAILABLE", "Opportunity could not be created safely.", { cause: error });
  }
}
