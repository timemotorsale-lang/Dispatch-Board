import { describe, expect, it } from "vitest";
import { buildCapitalComposition, buildCrossLaneDependencies, buildLifecycleHealth, buildLifecycleStageFlow } from "@/server/inventory-control-tower/lifecycle-projections";

const now = new Date("2026-07-18T12:00:00Z");
describe("Inventory lifecycle connected projections", () => {
  it("calculates 30-day entry/exit and median/p90 stage clocks with operating reconciliation", () => {
    const result = buildLifecycleStageFlow(["INSPECTION", "RECONDITIONING"], [{ id: "u1", lifecycleStage: "RECONDITIONING", stageStartedAt: new Date("2026-07-14T12:00:00Z"), operatingState: "BLOCKED", targetAt: new Date("2026-07-17T12:00:00Z"), exposureCents: 500_000, ownerUserId: "owner-1" }], [{ inventoryUnitId: "u1", fromStage: null, toStage: "INSPECTION", occurredAt: new Date("2026-07-10T12:00:00Z") }, { inventoryUnitId: "u1", fromStage: "INSPECTION", toStage: "RECONDITIONING", occurredAt: new Date("2026-07-14T12:00:00Z") }], now);
    expect(result.find((item) => item.stage === "INSPECTION")).toMatchObject({ entries30d: 1, exits30d: 1, medianDays: 4, p90Days: 4, sampleSize: 1 });
    expect(result.find((item) => item.stage === "RECONDITIONING")).toMatchObject({ blocked: 1, breached: 1, exposureCents: 500_000, ownerCount: 1 });
  });

  it("separates customer repairs and derives Parts ETA, readiness confidence, and QC handoff", () => {
    const result = buildCrossLaneDependencies([{ id: "ro1", inventoryUnitId: "u1", origin: "INVENTORY_RECON", operatingState: "WAITING", stage: "REPAIR", repairJobs: [{ status: "READY_FOR_REPAIR" }], partDemands: [{ quantityRequired: 4, quantityReserved: 1, status: "PARTIALLY_RESERVED", requiredAt: now, requisitions: [{ selectedOffer: { estimatedArrivalAt: new Date("2026-07-20T12:00:00Z") } }] }] }], 3);
    expect(result).toMatchObject({ activeOrders: 1, waitingPartDemands: 1, unreservedPartUnits: 3, customerRepairOrdersExcluded: 3, readinessConfidence: "MEDIUM", qcHandoffReady: false, earliestEstimatedArrivalAt: "2026-07-20T12:00:00.000Z" });
  });

  it("reconciles capital components and reports actionable health without inventing recovery", () => {
    expect(buildCapitalComposition([{ amountCents: 100_000, category: "ACQUISITION", confidence: "HIGH", currency: "USD", status: "POSTED" }, { amountCents: 20_000, category: "RECON", confidence: "MEDIUM", currency: "USD", status: "ESTIMATED" }, { amountCents: 50_000, category: "OTHER", confidence: "LOW", currency: "CAD", status: "POSTED" }])).toMatchObject({ actualCents: 100_000, estimatedCents: 20_000, reconciliationCents: 120_000, excludedEntries: 1 });
    expect(buildLifecycleHealth({ checkpoints: [{ projectionCode: "INVENTORY", lagSeconds: 600, lastFailureAt: now, lastError: "timeout" }], conflicts: [{ id: "c1", systemCode: "DMS", summary: "Stage mismatch", ownerUserId: null }], deadLetters: 2 })).toMatchObject({ status: "ATTENTION", deadLetters: 2, openConflicts: 1, affectedPanels: ["External handoffs", "Integration reconciliation", "Projection freshness"] });
  });
});
