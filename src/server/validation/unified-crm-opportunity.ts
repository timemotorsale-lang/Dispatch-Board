import type {
  UnifiedCrmOpportunityBridgeRequest,
  UnifiedCrmOpportunityId,
  UnifiedCrmOpportunitySourceReference
} from "@/server/unified-crm/opportunity-contract";
import { UnifiedCrmOpportunityError } from "@/server/unified-crm/opportunity-contract";

function text(value: unknown, field: string, max: number) {
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

export function normalizeUnifiedCrmOpportunityId(value: unknown): UnifiedCrmOpportunityId {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!/^[A-Za-z0-9_-]{6,120}$/.test(normalized)) {
    throw new UnifiedCrmOpportunityError("INVALID_OPPORTUNITY_ID", "Opportunity identifier is invalid.");
  }
  return normalized as UnifiedCrmOpportunityId;
}

export function normalizeUnifiedCrmOpportunitySourceReference(value: unknown): UnifiedCrmOpportunitySourceReference {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new UnifiedCrmOpportunityError("INVALID_OPPORTUNITY_REFERENCE", "Source reference is invalid.");
  }
  const input = value as Record<string, unknown>;
  if (input.sourceType !== "CUSTOMER_LEAD") {
    throw new UnifiedCrmOpportunityError("INVALID_OPPORTUNITY_REFERENCE", "Source reference type is invalid.");
  }
  return {
    sourceType: "CUSTOMER_LEAD",
    sourceRecordId: text(input.sourceRecordId, "Source record", 120),
    customerId: text(input.customerId, "Customer", 120),
    organizationId: text(input.organizationId, "Organization", 120),
    ownerUserId: typeof input.ownerUserId === "string" && input.ownerUserId.trim()
      ? input.ownerUserId.trim().slice(0, 120)
      : null
  };
}

export function normalizeUnifiedCrmOpportunityBridgeRequest(
  value: unknown
): UnifiedCrmOpportunityBridgeRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new UnifiedCrmOpportunityError("INVALID_OPPORTUNITY_REFERENCE", "Opportunity bridge request is invalid.");
  }
  const input = value as Record<string, unknown>;
  return {
    contractVersion: "ucrm.opportunity/v1",
    correlationId: text(input.correlationId, "Correlation id", 200),
    expectedVersion: Number.isInteger(input.expectedVersion) && Number(input.expectedVersion) >= 0
      ? Number(input.expectedVersion)
      : (() => {
          throw new UnifiedCrmOpportunityError("INVALID_OPPORTUNITY_REFERENCE", "Expected version is invalid.");
        })(),
    idempotencyKey: text(input.idempotencyKey, "Idempotency key", 200),
    opportunityId: normalizeUnifiedCrmOpportunityId(input.opportunityId),
    organizationId: text(input.organizationId, "Organization", 120),
    purpose: text(input.purpose, "Purpose", 240),
    source: input.source == null ? null : normalizeUnifiedCrmOpportunitySourceReference(input.source)
  };
}
