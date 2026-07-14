import { describe, expect, it } from "vitest";
import { calculateInventoryRecommendation, normalizeBarcodeAlias, normalizeCycleCountCreate, normalizeInventoryPolicy, normalizeRecommendationDecision } from "@/server/parts-wave-one/domain";

const base = { idempotencyKey: "command-1", reason: "Record governed enterprise parts evidence." };
const recommendationBase = { annualHoldingRateBasisPoints: 2500, availableQuantity: 2, dailyDemand: Array.from({ length: 90 }, (_, index) => index % 10 === 0 ? 1 : 0), economicOrderQuantity: null, fallbackActivityAt: new Date("2026-07-01T00:00:00Z"), lastIssueAt: new Date("2026-07-10T00:00:00Z"), leadTimeDays: 5, maxStockQuantity: 20, now: new Date("2026-07-14T00:00:00Z"), obsolescenceDays: 180, onHandQuantity: 2, orderedQuantity: 0, orderingCostCents: 1000, reorderPointQuantity: 5, safetyStockQuantity: 2, standardCostCents: 500 };

describe("enterprise parts Wave 1 domain", () => {
  it("requires a count snapshot at or after its ledger cutoff", () => {
    expect(() => normalizeCycleCountCreate({ ...base, countNumber: "cc-1", ledgerCutoffAt: "2026-07-14T12:01:00Z", mode: "OBSERVE", partIds: ["part"], snapshotAt: "2026-07-14T12:00:00Z", stockLocationId: "bin", type: "CYCLE" })).toThrow("cutoff cannot follow");
  });

  it("calculates a deterministic reorder recommendation", () => {
    const result = calculateInventoryRecommendation(recommendationBase);
    expect(result.type).toBe("REORDER");
    expect(result.recommendedQuantity).toBeGreaterThan(0);
    expect(result.reasonCodes).toContain("PART_INVENTORY_POSITION_AT_OR_BELOW_REORDER_POINT");
  });

  it("prioritizes obsolescence review over replenishment", () => {
    const result = calculateInventoryRecommendation({ ...recommendationBase, dailyDemand: Array(90).fill(0), lastIssueAt: new Date("2025-01-01T00:00:00Z"), onHandQuantity: 8 });
    expect(result).toMatchObject({ recommendedQuantity: 0, type: "OBSOLESCENCE_REVIEW" });
  });

  it("returns no action when stock remains above policy", () => {
    const result = calculateInventoryRecommendation({ ...recommendationBase, availableQuantity: 12, onHandQuantity: 12 });
    expect(result).toMatchObject({ recommendedQuantity: 0, type: "NO_ACTION" });
  });

  it("validates effective policy rates and classes", () => {
    expect(() => normalizeInventoryPolicy({ ...base, abcClass: "D", annualHoldingRateBasisPoints: 2500, effectiveFrom: "2026-07-14T00:00:00Z", leadTimeDays: 3, obsolescenceDays: 180, orderingCostCents: 1000, partId: "part", reviewPeriodDays: 7, safetyStockQuantity: 1, stockLocationId: "bin", targetServiceBasisPoints: 9500 })).toThrow("ABC class");
    expect(() => normalizeInventoryPolicy({ ...base, abcClass: "A", annualHoldingRateBasisPoints: 2500, effectiveFrom: "2026-07-14T00:00:00Z", leadTimeDays: 3, obsolescenceDays: 180, orderingCostCents: 1000, partId: "part", reviewPeriodDays: 7, safetyStockQuantity: 1, stockLocationId: "bin", targetServiceBasisPoints: 10001 })).toThrow("cannot exceed");
  });

  it("normalizes scanner aliases and restricts recommendation decisions", () => {
    expect(normalizeBarcodeAlias({ ...base, code: "  ab 123 ", partId: "part", type: "internal" })).toMatchObject({ code: "AB123", type: "INTERNAL" });
    expect(() => normalizeRecommendationDecision({ ...base, occurredAt: "2026-07-14T00:00:00Z", status: "CONVERTED" })).toThrow("invalid");
  });
});
