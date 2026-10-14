import { normalizeEnterpriseCommand } from "@/server/enterprise-command/domain";
import type { AuthenticatedUser } from "@/server/auth/store";
import {
  createUnifiedCrmCustomerReadRepository,
  type UnifiedCrmCustomerReadRepository
} from "@/server/repositories/unified-crm-customer-read-repository";
import {
  createUnifiedCrmCustomerInteractionRepository,
  type UnifiedCrmCustomerInteractionRepository
} from "@/server/repositories/unified-crm-customer-interaction-repository";
import {
  requireUnifiedCrmCustomerInteractionAccess,
  type UnifiedCrmCustomerInteractionAccessOptions
} from "@/server/unified-crm/customer-interaction-access";
import {
  UNIFIED_CRM_CUSTOMER_INTERACTION_COMMAND,
  UNIFIED_CRM_CUSTOMER_INTERACTION_CONTRACT_VERSION,
  UnifiedCrmCustomerInteractionError,
  type UnifiedCrmCustomerInteractionChannel,
  type UnifiedCrmCustomerInteractionCommand,
  type UnifiedCrmCustomerInteractionCommandInput,
  type UnifiedCrmCustomerInteractionCommandResult,
  type UnifiedCrmCustomerInteractionConsentState,
  type UnifiedCrmCustomerInteractionDirection
} from "@/server/unified-crm/customer-interaction-command";

type Dependencies = UnifiedCrmCustomerInteractionAccessOptions & {
  now?: () => Date;
  repository?: UnifiedCrmCustomerInteractionRepository;
  scopeRepository?: Pick<UnifiedCrmCustomerReadRepository, "listActiveOrganizationIds">;
};

const CHANNELS = ["PHONE", "TEXT", "EMAIL", "MEETING", "VISIT", "INTERNAL_NOTE"] as const;
const DIRECTIONS = ["INBOUND", "OUTBOUND", "INTERNAL"] as const;
const CONSENT_STATES = ["NOT_REQUIRED", "CONFIRMED", "UNKNOWN"] as const;

function normalizeCustomerId(value: unknown) {
  const result = typeof value === "string" ? value.trim() : "";
  if (!result || result.length > 200) {
    throw new UnifiedCrmCustomerInteractionError("INVALID_INTERACTION_COMMAND", "Customer identifier is invalid.");
  }
  return result;
}

function text(value: unknown, field: string, max: number, required = true) {
  const result = typeof value === "string" ? value.trim() : "";
  if (!result) {
    if (required) throw new UnifiedCrmCustomerInteractionError("INVALID_INTERACTION_COMMAND", `${field} is required.`);
    return null;
  }
  if (result.length > max) {
    throw new UnifiedCrmCustomerInteractionError("INVALID_INTERACTION_COMMAND", `${field} must be ${max} characters or fewer.`);
  }
  return result;
}

function enumValue<T extends readonly string[]>(value: unknown, field: string, options: T): T[number] {
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (!options.includes(normalized as T[number])) {
    throw new UnifiedCrmCustomerInteractionError("INVALID_INTERACTION_COMMAND", `${field} is invalid.`);
  }
  return normalized as T[number];
}

function timestamp(value: unknown, field: string, fallback?: Date) {
  if (value == null || value === "") {
    if (fallback) return fallback;
    throw new UnifiedCrmCustomerInteractionError("INVALID_INTERACTION_COMMAND", `${field} is required.`);
  }
  const result = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(result.getTime())) {
    throw new UnifiedCrmCustomerInteractionError("INVALID_INTERACTION_COMMAND", `${field} is invalid.`);
  }
  return result;
}

function flag(value: unknown) {
  return value === true || value === "true" || value === "on";
}

function normalizeCommand(value: UnifiedCrmCustomerInteractionCommandInput, now: Date): UnifiedCrmCustomerInteractionCommand {
  const channel = enumValue(value.channel, "Channel", CHANNELS) as UnifiedCrmCustomerInteractionChannel;
  const direction = enumValue(value.direction, "Direction", DIRECTIONS) as UnifiedCrmCustomerInteractionDirection;
  const consentState = enumValue(value.consentState, "Consent state", CONSENT_STATES) as UnifiedCrmCustomerInteractionConsentState;
  const occurredAt = timestamp(value.occurredAt, "Occurred time", now);
  const nextActionAt = value.nextActionAt == null || value.nextActionAt === "" ? null : timestamp(value.nextActionAt, "Next action time");
  const completeCurrentFollowUp = flag(value.completeCurrentFollowUp);
  if (nextActionAt && nextActionAt.getTime() < occurredAt.getTime()) {
    throw new UnifiedCrmCustomerInteractionError("INVALID_INTERACTION_COMMAND", "Next action time must be at or after the interaction time.");
  }
  if (completeCurrentFollowUp && nextActionAt) {
    throw new UnifiedCrmCustomerInteractionError("INVALID_INTERACTION_COMMAND", "Complete the current follow-up or schedule a new one, not both in the same interaction.");
  }
  const summary = text(value.summary, "Summary", 500)!;
  const outcome = text(value.outcome, "Outcome", 120, false);
  const nextStep = text(value.nextStep, "Next step", 240, false);
  const idempotencyKey = text(value.idempotencyKey, "Idempotency key", 200)!;
  const relatedDealId = text(value.relatedDealId, "Related deal", 200, false);
  const relatedRepairOrderId = text(value.relatedRepairOrderId, "Related repair order", 200, false);
  const relatedStaffMemberId = text(value.relatedStaffMemberId, "Related staff member", 200, false);
  const relatedVehicleId = text(value.relatedVehicleId, "Related vehicle", 200, false);
  if (direction === "OUTBOUND" && (channel === "PHONE" || channel === "TEXT" || channel === "EMAIL") && consentState !== "CONFIRMED") {
    throw new UnifiedCrmCustomerInteractionError("OUTBOUND_CONSENT_REQUIRED", "Outbound contact requires a confirmed consent state.");
  }
  if (channel === "INTERNAL_NOTE" && direction !== "INTERNAL") {
    throw new UnifiedCrmCustomerInteractionError("INVALID_INTERACTION_COMMAND", "Internal notes must use internal direction.");
  }
  return {
    channel,
    completeCurrentFollowUp,
    consentState,
    direction,
    idempotencyKey,
    nextActionAt,
    nextStep,
    occurredAt,
    outcome,
    relatedDealId,
    relatedRepairOrderId,
    relatedStaffMemberId,
    relatedVehicleId,
    reportWorthy: flag(value.reportWorthy),
    summary
  };
}

export async function logUnifiedCrmCustomerInteraction(
  actor: AuthenticatedUser | null,
  customerId: string,
  value: UnifiedCrmCustomerInteractionCommandInput,
  dependencies: Dependencies = {}
): Promise<UnifiedCrmCustomerInteractionCommandResult> {
  const access = requireUnifiedCrmCustomerInteractionAccess(actor, dependencies);
  const now = dependencies.now?.() ?? new Date();
  const normalizedCustomerId = normalizeCustomerId(customerId);
  const command = normalizeCommand(value, now);
  const scopeRepository = dependencies.scopeRepository ?? createUnifiedCrmCustomerReadRepository();
  const repository = dependencies.repository ?? createUnifiedCrmCustomerInteractionRepository();

  try {
    const organizationIds = await scopeRepository.listActiveOrganizationIds(actor!.id, now);
    if (organizationIds.length === 0) {
      throw new UnifiedCrmCustomerInteractionError("CUSTOMER_360_NOT_AUTHORIZED", "Customer interaction is not available for this viewer.");
    }
    if (organizationIds.length > 1) {
      throw new UnifiedCrmCustomerInteractionError("CUSTOMER_SOURCE_UNAVAILABLE", "Customer interaction requires one active organization scope.");
    }
    const organizationId = organizationIds[0];
    const normalized = normalizeEnterpriseCommand({
      actorUserId: actor!.id,
      commandType: UNIFIED_CRM_CUSTOMER_INTERACTION_COMMAND,
      domain: "UNIFIED_CRM",
      expectedVersion: 0,
      idempotencyKey: command.idempotencyKey,
      locationId: null,
      organizationId,
      payload: {
        channel: command.channel,
        consentState: command.consentState,
        direction: command.direction,
        nextActionAt: command.nextActionAt?.toISOString() ?? null,
        nextStep: command.nextStep,
        occurredAt: command.occurredAt.toISOString(),
        outcome: command.outcome,
        relatedDealId: command.relatedDealId,
        relatedRepairOrderId: command.relatedRepairOrderId,
        relatedStaffMemberId: command.relatedStaffMemberId,
        relatedVehicleId: command.relatedVehicleId,
        reportWorthy: command.reportWorthy,
        followUpCompleted: command.completeCurrentFollowUp,
        summary: command.summary
      },
      reason: `Record customer interaction: ${command.summary}`,
      subjectId: normalizedCustomerId,
      subjectType: "CUSTOMER"
    });

    const result = await repository.createInteraction({
      command: {
        actorUserId: actor!.id,
        channel: command.channel,
        commandType: normalized.commandType,
        completeCurrentFollowUp: command.completeCurrentFollowUp,
        consentState: command.consentState,
        correlationId: normalized.correlationId,
        customerId: normalizedCustomerId,
        direction: command.direction,
        domain: normalized.domain,
        idempotencyKey: normalized.idempotencyKey,
        nextActionAt: command.nextActionAt,
        nextStep: command.nextStep,
        occurredAt: command.occurredAt,
        organizationId,
        outcome: command.outcome,
        relatedDealId: command.relatedDealId,
        relatedRepairOrderId: command.relatedRepairOrderId,
        relatedStaffMemberId: command.relatedStaffMemberId,
        relatedVehicleId: command.relatedVehicleId,
        reason: normalized.reason,
        reportWorthy: command.reportWorthy,
        requestHash: normalized.requestHash,
        summary: command.summary
      },
      recordScope: access.recordScope
    });

    return {
      contractVersion: UNIFIED_CRM_CUSTOMER_INTERACTION_CONTRACT_VERSION,
      customerId: result.customerId,
      duplicate: result.duplicate,
      followUpCompleted: result.followUpCompleted,
      interactionId: result.interactionId,
      occurredAt: result.occurredAt.toISOString(),
      nextActionAt: result.nextActionAt?.toISOString() ?? null,
      version: result.version
    };
  } catch (error) {
    if (error instanceof UnifiedCrmCustomerInteractionError) throw error;
    if (error instanceof Error && error.message === "Customer not available.") {
      throw new UnifiedCrmCustomerInteractionError("CUSTOMER_NOT_AVAILABLE", "Customer details are not available.");
    }
    if (error instanceof Error && error.message === "Outbound canonical consent is required.") {
      throw new UnifiedCrmCustomerInteractionError("OUTBOUND_CONSENT_REQUIRED", "Outbound contact requires a confirmed consent state.");
    }
    if (error instanceof Error && "code" in error && String((error as { code?: string }).code) === "IDEMPOTENCY_KEY_REUSED") {
      throw new UnifiedCrmCustomerInteractionError("IDEMPOTENCY_KEY_REUSED", "Idempotency key was already used with a different customer interaction.");
    }
    throw new UnifiedCrmCustomerInteractionError("CUSTOMER_SOURCE_UNAVAILABLE", "Customer interaction could not be recorded safely.", { cause: error });
  }
}
