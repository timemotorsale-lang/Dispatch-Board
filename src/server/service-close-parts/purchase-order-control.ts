import type { PurchaseLine } from "./domain";

export type PurchaseOrderDuplicateGateFact = {
  id: string;
  label: string;
  partId: string;
  type: "ACTIVE_DEMAND" | "OPEN_PURCHASE_ORDER" | "RECEIVED_UNISSUED" | "RECOVERY_OPEN";
};

export type PurchaseOrderDuplicateGateResult = {
  allowed: boolean;
  conflicts: PurchaseOrderDuplicateGateFact[];
  requiredOverride: boolean;
  summary: string;
};

export function evaluatePurchaseOrderDuplicateGate(input: {
  allowedDemandIds?: string[];
  duplicateOverrideReason?: string | null;
  facts: PurchaseOrderDuplicateGateFact[];
  lines: PurchaseLine[];
}): PurchaseOrderDuplicateGateResult {
  const partIds = new Set(input.lines.map((line) => line.partId));
  const allowedDemandIds = new Set(input.allowedDemandIds ?? []);
  const conflicts = input.facts.filter((fact) => {
    if (!partIds.has(fact.partId)) return false;
    return fact.type !== "ACTIVE_DEMAND" || !allowedDemandIds.has(fact.id);
  });
  const requiredOverride = conflicts.length > 0;
  const overrideProvided = Boolean(input.duplicateOverrideReason?.trim());
  const summary = conflicts.length
    ? conflicts.map((fact) => `${fact.type.replaceAll("_", " ").toLowerCase()}: ${fact.label}`).join("; ")
    : "No duplicate or existing-availability risk found.";

  return {
    allowed: !requiredOverride || overrideProvided,
    conflicts,
    requiredOverride,
    summary,
  };
}

export function assertPurchaseOrderDuplicateGate(input: {
  allowedDemandIds?: string[];
  duplicateOverrideReason?: string | null;
  facts: PurchaseOrderDuplicateGateFact[];
  lines: PurchaseLine[];
}) {
  const result = evaluatePurchaseOrderDuplicateGate(input);

  if (!result.allowed) {
    throw new Error(`Purchase order duplicate-control review required before ordering. Existing related parts found: ${result.summary}. Provide a duplicate override reason to continue.`);
  }

  return result;
}
