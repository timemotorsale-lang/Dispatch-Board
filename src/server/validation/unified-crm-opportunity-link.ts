import {
  type UnifiedCrmOpportunityAppointmentBridgeReceipt,
  type UnifiedCrmOpportunityAppointmentBridgeRequest,
  type UnifiedCrmOpportunityAppointmentReference,
  type UnifiedCrmOpportunityBridgeFailure,
  type UnifiedCrmOpportunityBridgeFailureCode,
  type UnifiedCrmOpportunityDispatchBridgeReceipt,
  type UnifiedCrmOpportunityDispatchBridgeRequest,
  type UnifiedCrmOpportunityDispatchReference,
  type UnifiedCrmOpportunityTaskReference
} from "@/server/unified-crm/opportunity-link-contract";
import { UnifiedCrmOpportunityError } from "@/server/unified-crm/opportunity-contract";
import {
  normalizeUnifiedCrmOpportunityBridgeRequest,
  normalizeUnifiedCrmOpportunityId
} from "@/server/validation/unified-crm-opportunity";

const REQUEST_KEYS = new Set([
  "contractVersion", "correlationId", "expectedVersion", "idempotencyKey", "intent",
  "opportunityId", "organizationId", "purpose", "source", "target", "targetType"
]);
const RECEIPT_KEYS = new Set([
  "contractVersion", "correlationId", "failure", "idempotencyKey", "opportunityId",
  "organizationId", "state", "target"
]);
const FAILURE_CODES = new Set<UnifiedCrmOpportunityBridgeFailureCode>([
  "TARGET_UNAVAILABLE",
  "TARGET_VERSION_CONFLICT",
  "IDEMPOTENCY_CONFLICT",
  "OWNER_COMMAND_UNAVAILABLE",
  "OWNER_COMMAND_REJECTED"
]);

function requiredText(value: unknown, field: string, max: number) {
  if (typeof value !== "string") {
    throw new UnifiedCrmOpportunityError("INVALID_OPPORTUNITY_REFERENCE", `${field} is required.`);
  }
  const normalized = value.trim();
  if (!normalized) {
    throw new UnifiedCrmOpportunityError("INVALID_OPPORTUNITY_REFERENCE", `${field} is required.`);
  }
  if (normalized.length > max) {
    throw new UnifiedCrmOpportunityError("INVALID_OPPORTUNITY_REFERENCE", `${field} must be ${max} characters or fewer.`);
  }
  return normalized;
}

function optionalText(value: unknown, max: number) {
  if (value == null) return null;
  if (typeof value !== "string") {
    throw new UnifiedCrmOpportunityError("INVALID_OPPORTUNITY_REFERENCE", "Reference is invalid.");
  }
  const normalized = value.trim();
  if (normalized.length > max) {
    throw new UnifiedCrmOpportunityError("INVALID_OPPORTUNITY_REFERENCE", `Reference must be ${max} characters or fewer.`);
  }
  return normalized || null;
}

function record(value: unknown, message: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new UnifiedCrmOpportunityError("INVALID_OPPORTUNITY_REFERENCE", message);
  }
  return value as Record<string, unknown>;
}

function exactKeys(input: Record<string, unknown>, allowed: ReadonlySet<string>, message: string) {
  if (Object.keys(input).some((key) => !allowed.has(key))) {
    throw new UnifiedCrmOpportunityError("INVALID_OPPORTUNITY_REFERENCE", message);
  }
}

function nonnegativeVersion(value: unknown, field: string) {
  if (!Number.isInteger(value) || Number(value) < 0) {
    throw new UnifiedCrmOpportunityError("INVALID_OPPORTUNITY_REFERENCE", `${field} is invalid.`);
  }
  return Number(value);
}

function stableId(value: unknown, field: string) {
  const normalized = requiredText(value, field, 120);
  if (!/^[A-Za-z0-9_-]{3,120}$/.test(normalized)) {
    throw new UnifiedCrmOpportunityError("INVALID_OPPORTUNITY_REFERENCE", `${field} is invalid.`);
  }
  return normalized;
}

function optionalStableId(value: unknown, field: string) {
  const normalized = optionalText(value, 120);
  if (normalized && !/^[A-Za-z0-9_-]{3,120}$/.test(normalized)) {
    throw new UnifiedCrmOpportunityError("INVALID_OPPORTUNITY_REFERENCE", `${field} is invalid.`);
  }
  return normalized;
}

function href(value: unknown, allowPattern: RegExp) {
  const normalized = requiredText(value, "Href", 500);
  if (!allowPattern.test(normalized)) {
    throw new UnifiedCrmOpportunityError("INVALID_OPPORTUNITY_REFERENCE", "Href is invalid.");
  }
  return normalized;
}

export function normalizeUnifiedCrmOpportunityTaskReference(value: unknown): UnifiedCrmOpportunityTaskReference {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new UnifiedCrmOpportunityError("INVALID_OPPORTUNITY_REFERENCE", "Task reference is invalid.");
  }
  const input = value as Record<string, unknown>;
  if (input.domain !== "TASKS") {
    throw new UnifiedCrmOpportunityError("INVALID_OPPORTUNITY_REFERENCE", "Task domain is invalid.");
  }
  return {
    domain: "TASKS",
    href: href(input.href, /^\/tasks\/[A-Za-z0-9_-]+(?:\?.*)?$/),
    taskId: requiredText(input.taskId, "Task", 120),
    taskNumber: optionalText(input.taskNumber, 120)
  };
}

export function normalizeUnifiedCrmOpportunityAppointmentReference(value: unknown): UnifiedCrmOpportunityAppointmentReference {
  const input = record(value, "Appointment reference is invalid.");
  exactKeys(input, new Set(["appointmentId", "appointmentNumber", "domain", "href", "organizationId", "version"]), "Appointment reference contains unsupported fields.");
  if (input.domain !== "APPOINTMENTS") {
    throw new UnifiedCrmOpportunityError("INVALID_OPPORTUNITY_REFERENCE", "Appointment domain is invalid.");
  }
  return {
    appointmentId: stableId(input.appointmentId, "Appointment"),
    appointmentNumber: requiredText(input.appointmentNumber, "Appointment number", 120),
    domain: "APPOINTMENTS",
    href: href(input.href, /^\/appointments(?:\?.*)?$/),
    organizationId: stableId(input.organizationId, "Organization"),
    version: nonnegativeVersion(input.version, "Appointment version")
  };
}

export function normalizeUnifiedCrmOpportunityDispatchReference(value: unknown): UnifiedCrmOpportunityDispatchReference {
  const input = record(value, "Dispatch reference is invalid.");
  exactKeys(input, new Set(["domain", "href", "organizationId", "repairJobId", "repairJobNumber", "repairOrderId", "repairOrderNumber", "version"]), "Dispatch reference contains unsupported fields.");
  if (input.domain !== "DISPATCH") {
    throw new UnifiedCrmOpportunityError("INVALID_OPPORTUNITY_REFERENCE", "Dispatch domain is invalid.");
  }
  const repairJobId = optionalStableId(input.repairJobId, "Repair job");
  const repairJobNumber = optionalText(input.repairJobNumber, 120);
  const repairOrderId = optionalStableId(input.repairOrderId, "Repair order");
  const repairOrderNumber = optionalText(input.repairOrderNumber, 120);
  const normalizedHref = href(input.href, /^\/vehicles\/(?:repair-workbench|shop-dispatch)(?:\?.*)?$/);
  if ((!repairJobId && !repairOrderId) || Boolean(repairJobId) !== Boolean(repairJobNumber) || Boolean(repairOrderId) !== Boolean(repairOrderNumber)) {
    throw new UnifiedCrmOpportunityError("INVALID_OPPORTUNITY_REFERENCE", "Dispatch reference must identify existing operational work.");
  }
  return {
    domain: "DISPATCH",
    href: normalizedHref,
    repairJobId,
    repairJobNumber,
    repairOrderId,
    repairOrderNumber,
    organizationId: stableId(input.organizationId, "Organization"),
    version: nonnegativeVersion(input.version, "Dispatch version")
  };
}

function requestBase(value: unknown, targetType: "APPOINTMENT" | "DISPATCH") {
  const input = record(value, "Opportunity bridge request is invalid.");
  exactKeys(input, REQUEST_KEYS, "Opportunity bridge request contains unsupported fields.");
  if (input.contractVersion !== "ucrm.opportunity/v1") {
    throw new UnifiedCrmOpportunityError("INVALID_OPPORTUNITY_REFERENCE", "Opportunity bridge contract version is invalid.");
  }
  if (input.targetType !== targetType) {
    throw new UnifiedCrmOpportunityError("INVALID_OPPORTUNITY_REFERENCE", "Opportunity bridge target type is invalid.");
  }
  const base = normalizeUnifiedCrmOpportunityBridgeRequest(input);
  if (base.source && base.source.organizationId !== base.organizationId) {
    throw new UnifiedCrmOpportunityError("INVALID_OPPORTUNITY_REFERENCE", "Opportunity bridge source organization is invalid.");
  }
  return { base, input };
}

export function normalizeUnifiedCrmOpportunityAppointmentBridgeRequest(value: unknown): UnifiedCrmOpportunityAppointmentBridgeRequest {
  const { base, input } = requestBase(value, "APPOINTMENT");
  if (input.intent === "CREATE_DRAFT_APPOINTMENT") {
    if (input.target != null) {
      throw new UnifiedCrmOpportunityError("INVALID_OPPORTUNITY_REFERENCE", "Draft appointment bridge cannot select an existing target.");
    }
    return { ...base, intent: input.intent, target: null, targetType: "APPOINTMENT" };
  }
  if (input.intent !== "LINK_EXISTING_APPOINTMENT") {
    throw new UnifiedCrmOpportunityError("INVALID_OPPORTUNITY_REFERENCE", "Appointment bridge intent is invalid.");
  }
  const target = record(input.target, "Appointment bridge target is required.");
  exactKeys(target, new Set(["appointmentId", "expectedTargetVersion"]), "Appointment bridge target contains unsupported fields.");
  return {
    ...base,
    intent: input.intent,
    target: {
      appointmentId: stableId(target.appointmentId, "Appointment"),
      expectedTargetVersion: nonnegativeVersion(target.expectedTargetVersion, "Appointment version")
    },
    targetType: "APPOINTMENT"
  };
}

export function normalizeUnifiedCrmOpportunityDispatchBridgeRequest(value: unknown): UnifiedCrmOpportunityDispatchBridgeRequest {
  const { base, input } = requestBase(value, "DISPATCH");
  if (input.intent === "OPEN_AUTHORITATIVE_DISPATCH") {
    if (input.target != null) {
      throw new UnifiedCrmOpportunityError("INVALID_OPPORTUNITY_REFERENCE", "Open dispatch bridge cannot select an existing target.");
    }
    return { ...base, intent: input.intent, target: null, targetType: "DISPATCH" };
  }
  const target = record(input.target, "Dispatch bridge target is required.");
  if (input.intent === "LINK_REPAIR_ORDER") {
    exactKeys(target, new Set(["expectedTargetVersion", "repairOrderId", "targetKind"]), "Repair-order bridge target contains unsupported fields.");
    if (target.targetKind !== "REPAIR_ORDER") {
      throw new UnifiedCrmOpportunityError("INVALID_OPPORTUNITY_REFERENCE", "Dispatch bridge target kind is invalid.");
    }
    return {
      ...base,
      intent: input.intent,
      target: {
        expectedTargetVersion: nonnegativeVersion(target.expectedTargetVersion, "Repair-order version"),
        repairOrderId: stableId(target.repairOrderId, "Repair order"),
        targetKind: "REPAIR_ORDER"
      },
      targetType: "DISPATCH"
    };
  }
  if (input.intent === "LINK_REPAIR_JOB") {
    exactKeys(target, new Set(["expectedTargetVersion", "repairJobId", "targetKind"]), "Repair-job bridge target contains unsupported fields.");
    if (target.targetKind !== "REPAIR_JOB") {
      throw new UnifiedCrmOpportunityError("INVALID_OPPORTUNITY_REFERENCE", "Dispatch bridge target kind is invalid.");
    }
    return {
      ...base,
      intent: input.intent,
      target: {
        expectedTargetVersion: nonnegativeVersion(target.expectedTargetVersion, "Repair-job version"),
        repairJobId: stableId(target.repairJobId, "Repair job"),
        targetKind: "REPAIR_JOB"
      },
      targetType: "DISPATCH"
    };
  }
  throw new UnifiedCrmOpportunityError("INVALID_OPPORTUNITY_REFERENCE", "Dispatch bridge intent is invalid.");
}

function normalizeFailure(value: unknown): UnifiedCrmOpportunityBridgeFailure {
  const input = record(value, "Opportunity bridge failure is invalid.");
  exactKeys(input, new Set(["code", "retryable"]), "Opportunity bridge failure contains unsupported fields.");
  if (typeof input.code !== "string" || !FAILURE_CODES.has(input.code as UnifiedCrmOpportunityBridgeFailureCode)) {
    throw new UnifiedCrmOpportunityError("INVALID_OPPORTUNITY_REFERENCE", "Opportunity bridge failure code is invalid.");
  }
  const code = input.code as UnifiedCrmOpportunityBridgeFailureCode;
  const retryable = code === "OWNER_COMMAND_UNAVAILABLE";
  if (input.retryable !== retryable) {
    throw new UnifiedCrmOpportunityError("INVALID_OPPORTUNITY_REFERENCE", "Opportunity bridge retryability is invalid.");
  }
  return { code, retryable };
}

function receiptBase(value: unknown) {
  const input = record(value, "Opportunity bridge receipt is invalid.");
  exactKeys(input, RECEIPT_KEYS, "Opportunity bridge receipt contains unsupported fields.");
  if (input.contractVersion !== "ucrm.opportunity/v1") {
    throw new UnifiedCrmOpportunityError("INVALID_OPPORTUNITY_REFERENCE", "Opportunity bridge contract version is invalid.");
  }
  if (!["ACCEPTED", "REQUESTED", "PENDING", "REJECTED", "FAILED"].includes(String(input.state))) {
    throw new UnifiedCrmOpportunityError("INVALID_OPPORTUNITY_REFERENCE", "Opportunity bridge receipt state is invalid.");
  }
  return {
    base: {
      contractVersion: "ucrm.opportunity/v1" as const,
      correlationId: requiredText(input.correlationId, "Correlation id", 200),
      idempotencyKey: requiredText(input.idempotencyKey, "Idempotency key", 200),
      opportunityId: normalizeUnifiedCrmOpportunityId(input.opportunityId),
      organizationId: stableId(input.organizationId, "Organization")
    },
    input,
    state: input.state as "ACCEPTED" | "REQUESTED" | "PENDING" | "REJECTED" | "FAILED"
  };
}

function normalizeReceipt<TReference>(value: unknown, targetNormalizer: (target: unknown) => TReference) {
  const { base, input, state } = receiptBase(value);
  if (state === "ACCEPTED") {
    if (input.failure != null) throw new UnifiedCrmOpportunityError("INVALID_OPPORTUNITY_REFERENCE", "Accepted bridge receipt cannot include a failure.");
    const target = targetNormalizer(input.target);
    if ((target as { organizationId?: string }).organizationId !== base.organizationId) {
      throw new UnifiedCrmOpportunityError("INVALID_OPPORTUNITY_REFERENCE", "Bridge receipt target organization is invalid.");
    }
    return { ...base, failure: null, state, target } as const;
  }
  if (state === "REQUESTED" || state === "PENDING") {
    if (input.target != null || input.failure != null) {
      throw new UnifiedCrmOpportunityError("INVALID_OPPORTUNITY_REFERENCE", "Incomplete bridge receipt cannot expose a target or failure.");
    }
    return { ...base, failure: null, state, target: null } as const;
  }
  if (input.target != null) throw new UnifiedCrmOpportunityError("INVALID_OPPORTUNITY_REFERENCE", "Unsuccessful bridge receipt cannot expose a target.");
  return { ...base, failure: normalizeFailure(input.failure), state, target: null } as const;
}

export function normalizeUnifiedCrmOpportunityAppointmentBridgeReceipt(value: unknown): UnifiedCrmOpportunityAppointmentBridgeReceipt {
  return normalizeReceipt(value, normalizeUnifiedCrmOpportunityAppointmentReference);
}

export function normalizeUnifiedCrmOpportunityDispatchBridgeReceipt(value: unknown): UnifiedCrmOpportunityDispatchBridgeReceipt {
  return normalizeReceipt(value, normalizeUnifiedCrmOpportunityDispatchReference);
}
