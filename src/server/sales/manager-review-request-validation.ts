export type NormalizedSalesManagerReviewRequest = {
  assignedManagerUserId: string;
  customerId: string;
  dealId: string;
  idempotencyKey: string;
  reason: string;
  sourceSnapshot: Record<string, unknown>;
  urgency: "high" | "normal" | "urgent";
  vehicleId: string;
};

const urgencyValues = ["high", "normal", "urgent"] as const;

function readRecord(value: unknown, label: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }

  return value as Record<string, unknown>;
}

function requiredString(value: unknown, label: string, maxLength = 200) {
  if (typeof value !== "string") {
    throw new Error(`${label} is required.`);
  }

  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${label} is required.`);
  }

  if (normalized.length > maxLength) {
    throw new Error(`${label} must be ${maxLength} characters or fewer.`);
  }

  return normalized;
}

function normalizeUrgency(value: unknown) {
  const normalized = requiredString(value, "Urgency", 20).toLowerCase();

  if (!urgencyValues.includes(normalized as (typeof urgencyValues)[number])) {
    throw new Error("Urgency must be normal, high, or urgent.");
  }

  return normalized as NormalizedSalesManagerReviewRequest["urgency"];
}

export function normalizeSalesManagerReviewRequest(value: unknown): NormalizedSalesManagerReviewRequest {
  const record = readRecord(value, "Manager review request");
  const sourceSnapshot = readRecord(record.sourceSnapshot, "Source snapshot");

  return {
    assignedManagerUserId: requiredString(record.assignedManagerUserId, "Assigned manager user ID"),
    customerId: requiredString(record.customerId, "Customer ID"),
    dealId: requiredString(record.dealId, "Deal ID"),
    idempotencyKey: requiredString(record.idempotencyKey, "Idempotency key"),
    reason: requiredString(record.reason, "Reason", 500),
    sourceSnapshot,
    urgency: normalizeUrgency(record.urgency),
    vehicleId: requiredString(record.vehicleId, "Vehicle ID")
  };
}

export function salesManagerReviewRequestValidationRequiresSourceSnapshot(value: unknown) {
  try {
    return Boolean(normalizeSalesManagerReviewRequest(value).sourceSnapshot);
  } catch {
    return false;
  }
}

export function salesManagerReviewRequestValidationBlocksMissingBackendFields() {
  try {
    normalizeSalesManagerReviewRequest({
      customerId: "cust-1",
      dealId: "deal-1",
      reason: "Review terms",
      urgency: "normal",
      vehicleId: "veh-1"
    });
    return false;
  } catch {
    return true;
  }
}
