import {
  type UnifiedCrmOpportunityAppointmentReference,
  type UnifiedCrmOpportunityDispatchReference,
  type UnifiedCrmOpportunityTaskReference
} from "@/server/unified-crm/opportunity-link-contract";
import { UnifiedCrmOpportunityError } from "@/server/unified-crm/opportunity-contract";

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
  return normalized ? normalized.slice(0, max) : null;
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
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new UnifiedCrmOpportunityError("INVALID_OPPORTUNITY_REFERENCE", "Appointment reference is invalid.");
  }
  const input = value as Record<string, unknown>;
  if (input.domain !== "APPOINTMENTS") {
    throw new UnifiedCrmOpportunityError("INVALID_OPPORTUNITY_REFERENCE", "Appointment domain is invalid.");
  }
  return {
    appointmentId: requiredText(input.appointmentId, "Appointment", 120),
    appointmentNumber: requiredText(input.appointmentNumber, "Appointment number", 120),
    domain: "APPOINTMENTS",
    href: href(input.href, /^\/appointments(?:\?.*)?$/)
  };
}

export function normalizeUnifiedCrmOpportunityDispatchReference(value: unknown): UnifiedCrmOpportunityDispatchReference {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new UnifiedCrmOpportunityError("INVALID_OPPORTUNITY_REFERENCE", "Dispatch reference is invalid.");
  }
  const input = value as Record<string, unknown>;
  if (input.domain !== "DISPATCH") {
    throw new UnifiedCrmOpportunityError("INVALID_OPPORTUNITY_REFERENCE", "Dispatch domain is invalid.");
  }
  return {
    domain: "DISPATCH",
    href: href(input.href, /^\/vehicles\/(?:repair-workbench|shop-dispatch)(?:\?.*)?$/),
    repairJobId: optionalText(input.repairJobId, 120),
    repairJobNumber: optionalText(input.repairJobNumber, 120),
    repairOrderId: optionalText(input.repairOrderId, 120),
    repairOrderNumber: optionalText(input.repairOrderNumber, 120)
  };
}
