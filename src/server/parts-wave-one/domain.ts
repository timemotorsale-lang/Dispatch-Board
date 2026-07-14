export type JsonObject = Record<string, unknown>;

function object(value: unknown, label = "Request"): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  return value as JsonObject;
}

function required(value: unknown, label: string, max = 500) {
  const result = typeof value === "string" ? value.trim() : "";
  if (!result) throw new Error(`${label} is required.`);
  if (result.length > max) throw new Error(`${label} must be ${max} characters or fewer.`);
  return result;
}

function optional(value: unknown, max = 500) {
  if (value == null || value === "") return null;
  return required(value, "Value", max);
}

function integer(value: unknown, label: string, min = 0) {
  const result = Number(value);
  if (!Number.isInteger(result) || result < min) throw new Error(`${label} must be a whole number of at least ${min}.`);
  return result;
}

function optionalInteger(value: unknown, label: string, min = 0) {
  return value == null || value === "" ? null : integer(value, label, min);
}

function date(value: unknown, label: string) {
  const result = new Date(required(value, label, 100));
  if (Number.isNaN(result.getTime())) throw new Error(`${label} must be a valid date and time.`);
  return result;
}

function strings(value: unknown, label: string) {
  if (!Array.isArray(value)) throw new Error(`${label} must be a list.`);
  return [...new Set(value.map((item) => typeof item === "string" ? item.trim() : "").filter(Boolean))];
}

function base(raw: JsonObject) {
  return { idempotencyKey: required(raw.idempotencyKey, "Idempotency key", 200), reason: required(raw.reason, "Business reason", 500) };
}

export function normalizeCycleCountCreate(value: unknown) {
  const raw = object(value), type = required(raw.type, "Count type", 20).toUpperCase(), mode = required(raw.mode, "Count mode", 20).toUpperCase(), partIds = strings(raw.partIds, "Part IDs"), ledgerCutoffAt = date(raw.ledgerCutoffAt, "Ledger cutoff"), snapshotAt = date(raw.snapshotAt, "Snapshot time");
  if (!partIds.length) throw new Error("Cycle count requires at least one part.");
  if (!["FULL", "CYCLE", "SPOT"].includes(type)) throw new Error("Count type is invalid.");
  if (!["OBSERVE", "FREEZE"].includes(mode)) throw new Error("Count mode is invalid.");
  if (ledgerCutoffAt > snapshotAt) throw new Error("Ledger cutoff cannot follow the balance snapshot.");
  return { ...base(raw), assignedToUserId: optional(raw.assignedToUserId, 100), blindCount: raw.blindCount !== false, countNumber: required(raw.countNumber, "Count number", 100).toUpperCase(), ledgerCutoffAt, mode: mode as "OBSERVE" | "FREEZE", partIds, snapshotAt, stockLocationId: required(raw.stockLocationId, "Stock location ID", 100), type: type as "FULL" | "CYCLE" | "SPOT" };
}

export function normalizeCycleCountAction(value: unknown) {
  const raw = object(value);
  return { ...base(raw), occurredAt: date(raw.occurredAt, "Action time") };
}

export function normalizeCycleCountLine(value: unknown) {
  const raw = object(value), evidence = strings(raw.evidence ?? [], "Count evidence");
  return { ...base(raw), countedQuantity: integer(raw.countedQuantity, "Counted quantity"), evidence, lineId: required(raw.lineId, "Count line ID", 100), occurredAt: date(raw.occurredAt, "Count time"), reasonCode: optional(raw.reasonCode, 100)?.toUpperCase() ?? null };
}

export function normalizeInventoryPolicy(value: unknown) {
  const raw = object(value), abcClass = required(raw.abcClass, "ABC class", 1).toUpperCase(), effectiveFrom = date(raw.effectiveFrom, "Effective start"), effectiveTo = raw.effectiveTo ? date(raw.effectiveTo, "Effective end") : null;
  if (!["A", "B", "C"].includes(abcClass)) throw new Error("ABC class must be A, B, or C.");
  if (effectiveTo && effectiveTo <= effectiveFrom) throw new Error("Effective end must follow effective start.");
  const targetServiceBasisPoints = integer(raw.targetServiceBasisPoints, "Target service level");
  if (targetServiceBasisPoints > 10000) throw new Error("Target service level cannot exceed 10000 basis points.");
  const annualHoldingRateBasisPoints = integer(raw.annualHoldingRateBasisPoints, "Annual holding rate");
  if (annualHoldingRateBasisPoints > 10000) throw new Error("Annual holding rate cannot exceed 10000 basis points.");
  return { ...base(raw), abcClass, annualHoldingRateBasisPoints, economicOrderQuantity: optionalInteger(raw.economicOrderQuantity, "Economic order quantity", 1), effectiveFrom, effectiveTo, leadTimeDays: integer(raw.leadTimeDays, "Lead time", 0), maxStockQuantity: optionalInteger(raw.maxStockQuantity, "Maximum stock", 1), obsolescenceDays: integer(raw.obsolescenceDays, "Obsolescence days", 1), orderingCostCents: integer(raw.orderingCostCents, "Ordering cost"), partId: required(raw.partId, "Part ID", 100), reorderPointQuantity: optionalInteger(raw.reorderPointQuantity, "Reorder point"), reviewPeriodDays: integer(raw.reviewPeriodDays, "Review period", 1), safetyStockQuantity: integer(raw.safetyStockQuantity, "Safety stock"), stockLocationId: required(raw.stockLocationId, "Stock location ID", 100), targetServiceBasisPoints };
}

export function normalizeRecommendationRun(value: unknown) {
  const raw = object(value), windowStart = date(raw.windowStart, "Window start"), windowEnd = date(raw.windowEnd, "Window end");
  if (windowEnd <= windowStart) throw new Error("Recommendation window end must follow its start.");
  const days = Math.ceil((windowEnd.getTime() - windowStart.getTime()) / 86400000);
  if (days < 7 || days > 366) throw new Error("Recommendation window must cover 7 to 366 days.");
  return { ...base(raw), generatedAt: date(raw.generatedAt, "Generation time"), locationId: optional(raw.locationId, 100), windowEnd, windowStart };
}

export function normalizeRecommendationDecision(value: unknown) {
  const raw = object(value), status = required(raw.status, "Recommendation status", 30).toUpperCase();
  if (!["ACKNOWLEDGED", "DISMISSED"].includes(status)) throw new Error("Recommendation decision is invalid.");
  return { ...base(raw), occurredAt: date(raw.occurredAt, "Decision time"), status: status as "ACKNOWLEDGED" | "DISMISSED" };
}

export function normalizeBarcodeAlias(value: unknown) {
  const raw = object(value), type = required(raw.type, "Barcode type", 20).toUpperCase(), code = required(raw.code, "Barcode", 200).replaceAll(/\s/g, "").toUpperCase();
  if (!["GTIN", "UPC", "OEM", "INTERNAL", "VENDOR"].includes(type)) throw new Error("Barcode type is invalid.");
  if (code.length < 3) throw new Error("Barcode must contain at least three characters.");
  return { ...base(raw), code, partId: required(raw.partId, "Part ID", 100), sourceReference: optional(raw.sourceReference, 200), type: type as "GTIN" | "UPC" | "OEM" | "INTERNAL" | "VENDOR" };
}

export type RecommendationInput = {
  annualHoldingRateBasisPoints: number;
  availableQuantity: number;
  dailyDemand: number[];
  economicOrderQuantity: number | null;
  fallbackActivityAt: Date;
  lastIssueAt: Date | null;
  leadTimeDays: number;
  maxStockQuantity: number | null;
  now: Date;
  obsolescenceDays: number;
  onHandQuantity: number;
  orderedQuantity: number;
  orderingCostCents: number;
  reorderPointQuantity: number | null;
  safetyStockQuantity: number;
  standardCostCents: number;
};

export type InventoryRecommendationResult = {
  averageDailyDemandMilli: number;
  confidence: "LOW" | "MEDIUM" | "HIGH";
  daysSinceLastIssue: number | null;
  demandStdDevMilli: number;
  economicOrderQuantity: number;
  estimatedCostCents: number;
  evidence: Record<string, unknown>;
  reasonCodes: string[];
  recommendedQuantity: number;
  reorderPointQuantity: number;
  type: "REORDER" | "TRANSFER_REVIEW" | "OBSOLESCENCE_REVIEW" | "NO_ACTION";
};

export function calculateInventoryRecommendation(input: RecommendationInput): InventoryRecommendationResult {
  const demand = input.dailyDemand.map((value) => Math.max(0, value)), days = Math.max(1, demand.length), totalDemand = demand.reduce((sum, value) => sum + value, 0), average = totalDemand / days;
  const variance = demand.reduce((sum, value) => sum + Math.pow(value - average, 2), 0) / days, standardDeviation = Math.sqrt(variance), coefficientOfVariation = average > 0 ? standardDeviation / average : 0;
  const averageDailyDemandMilli = Math.round(average * 1000), demandStdDevMilli = Math.round(standardDeviation * 1000), xyzClass = totalDemand === 0 ? "Z" : coefficientOfVariation <= 0.5 ? "X" : coefficientOfVariation <= 1 ? "Y" : "Z";
  const reorderPointQuantity = input.reorderPointQuantity ?? Math.ceil(average * input.leadTimeDays) + input.safetyStockQuantity;
  const annualDemand = average * 365, holdingCostPerUnit = Math.max(1, Math.round(input.standardCostCents * input.annualHoldingRateBasisPoints / 10000));
  const calculatedEoq = annualDemand > 0 && input.orderingCostCents > 0 ? Math.max(1, Math.ceil(Math.sqrt(2 * annualDemand * input.orderingCostCents / holdingCostPerUnit))) : 1;
  const economicOrderQuantity = input.economicOrderQuantity ?? calculatedEoq, inventoryPosition = input.availableQuantity + input.orderedQuantity;
  const daysSinceLastIssue = input.lastIssueAt ? Math.max(0, Math.floor((input.now.getTime() - input.lastIssueAt.getTime()) / 86400000)) : null, daysWithoutIssue = Math.max(0, Math.floor((input.now.getTime() - (input.lastIssueAt ?? input.fallbackActivityAt).getTime()) / 86400000));
  const obsolete = input.onHandQuantity > 0 && daysWithoutIssue >= input.obsolescenceDays, reorder = !obsolete && inventoryPosition <= reorderPointQuantity;
  const targetQuantity = input.maxStockQuantity ?? reorderPointQuantity + economicOrderQuantity, recommendedQuantity = reorder ? Math.max(economicOrderQuantity, targetQuantity - inventoryPosition, 1) : 0;
  const activeDays = demand.filter((value) => value > 0).length, confidence = days >= 60 && activeDays >= 3 ? "HIGH" as const : days >= 30 && activeDays >= 1 ? "MEDIUM" as const : "LOW" as const;
  const type = obsolete ? "OBSOLESCENCE_REVIEW" as const : reorder ? "REORDER" as const : "NO_ACTION" as const;
  const reasonCodes = obsolete ? ["PART_OBSOLESCENCE_THRESHOLD_REACHED"] : reorder ? ["PART_INVENTORY_POSITION_AT_OR_BELOW_REORDER_POINT"] : ["PART_STOCK_WITHIN_POLICY"];
  return { averageDailyDemandMilli, confidence, daysSinceLastIssue, demandStdDevMilli, economicOrderQuantity, estimatedCostCents: recommendedQuantity * input.standardCostCents, evidence: { activeDemandDays: activeDays, coefficientOfVariationBasisPoints: Math.round(coefficientOfVariation * 10000), daysWithoutIssue, inventoryPosition, totalDemand, windowDays: days, xyzClass }, reasonCodes, recommendedQuantity, reorderPointQuantity, type };
}
