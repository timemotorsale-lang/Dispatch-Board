import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { InventoryControlTower } from "@/features/inventory/inventory-control-tower";
import { InventoryLifecycleLanding } from "@/features/inventory/inventory-lifecycle-landing";
import { buildInventoryControlTowerProjection, type InventoryControlTowerProjection, type InventoryControlTowerSourceUnit } from "@/server/inventory-control-tower/service";

const now = new Date("2026-07-18T15:00:00.000Z");
const units: InventoryControlTowerSourceUnit[] = [
  {
    id: "unit-blocked", inventoryNumber: "INV-100", lifecycleStage: "RECONDITIONING", operatingState: "BLOCKED",
    targetAt: new Date("2026-07-17T15:00:00.000Z"), stageStartedAt: new Date("2026-07-15T15:00:00.000Z"), financialAcquiredAt: new Date("2026-06-28T15:00:00.000Z"), nextAction: "Resolve brake-parts constraint", stateReason: "Awaiting verified ETA", locationId: "loc-a",
    location: { code: "NORTH", name: "North Store" }, vehicle: { vehicleNumber: "V-100", stockNumber: "S100", year: 2021, make: "Toyota", model: "Camry", vin: "VIN100" }, ownerUser: { id: "user-a", name: "Avery" }, costEntries: [{ amountCents: 1_250_000, currency: "USD", status: "POSTED" }, { amountCents: 50_000, currency: "USD", status: "VOID" }]
  },
  {
    id: "unit-ready", inventoryNumber: "INV-200", lifecycleStage: "FRONTLINE_READY", operatingState: "ACTIVE",
    targetAt: new Date("2026-07-20T15:00:00.000Z"), stageStartedAt: new Date("2026-07-17T15:00:00.000Z"), financialAcquiredAt: new Date("2026-07-13T15:00:00.000Z"), nextAction: "Verify frontline merchandising", stateReason: null, locationId: "loc-b",
    location: { code: "SOUTH", name: "South Store" }, vehicle: { vehicleNumber: "V-200", stockNumber: "S200", year: 2022, make: "Honda", model: "Accord", vin: "VIN200" }, ownerUser: { id: "user-b", name: "Blair" }, costEntries: [{ amountCents: 1_500_000, currency: "USD", status: "POSTED" }]
  }
];

describe("R3 inventory lifecycle projection", () => {
  it("reconciles fixed-fixture stage, aging, priority, and exposure populations", () => {
    const projection = buildInventoryControlTowerProjection(units, now, { inventoryUnitId: "unit-ready" });
    expect(projection.reconciliation).toEqual({ status: "RECONCILED", scopedUnits: 2, stageUnits: 2, excludedCurrencyEntries: 0 });
    expect(projection.totals).toMatchObject({ units: 2, overdue: 1, blocked: 1, exposureCents: 2_750_000 });
    expect(projection.byStage.find((stage) => stage.stage === "RECONDITIONING")).toMatchObject({ count: 1, overdue: 1, blocked: 1, averageStageAgeDays: 3 });
    expect(projection.agingBands.map((band) => band.count)).toEqual([1, 1, 0, 0, 0]);
    expect(projection.priorityWork[0].id).toBe("unit-blocked");
    expect(projection.selectedAsset?.id).toBe("unit-ready");
  });

  it("distinguishes dependent-source unavailability from zero", () => {
    const projection = buildInventoryControlTowerProjection(units, now);
    expect(projection.dependentSources.shopRecon.status).toBe("UNAVAILABLE");
    expect(projection.dependentSources.parts.status).toBe("UNAVAILABLE");
    expect(projection.dependentSources.reviewsApprovals.status).toBe("UNAVAILABLE");
    expect(projection.dependentSources.recommendations.status).toBe("UNAVAILABLE");
  });

  it("excludes non-USD costs instead of silently combining currencies", () => {
    const mixedCurrencyUnits = [{ ...units[0], costEntries: [...units[0].costEntries, { amountCents: 900_000, currency: "CAD", status: "POSTED" }] }, units[1]];
    const projection = buildInventoryControlTowerProjection(mixedCurrencyUnits, now);
    expect(projection.totals.exposureCents).toBe(2_750_000);
    expect(projection.freshness).toBe("PARTIAL");
    expect(projection.reconciliation.excludedCurrencyEntries).toBe(1);
    expect(projection.partialReasons[0]).toContain("non-USD");
  });
});

describe("R3 Inventory Lifecycle UI", () => {
  const projection = buildInventoryControlTowerProjection(units, now);

  it("renders the focused landing and explicit deeper transition", () => {
    const markup = renderToStaticMarkup(<InventoryLifecycleLanding projection={projection} controlTowerHref="/vehicles/control-tower?returnTo=%2Fvehicles%2Finventory" />);
    expect(markup).toContain("Move every vehicle to its best next outcome.");
    expect(markup).toContain("Open Control Tower");
    expect(markup).toContain("Open Disposition &amp; Wholesale");
    expect(markup).toContain("+ Start Workflow");
    expect(markup).toContain("R9 disposition recommendations are advisory, explained, and non-executing.");
  });

  it("renders live control-tower facts and connected downstream workspaces", () => {
    const markup = renderToStaticMarkup(<InventoryControlTower projection={projection} backHref="/vehicles/inventory?view=attention" />);
    expect(markup).toContain("Inventory Lifecycle Control Tower");
    expect(markup).toContain("Back to Inventory Lifecycle");
    expect(markup).toContain("INV-100");
    expect(markup).toContain("Resolve brake-parts constraint");
    expect(markup).toContain("Connected workspace");
    expect(markup).toContain("R10 composes permission-scoped review and exact-version approval queues");
    expect(markup).not.toContain("2019 Toyota Camry SE");
    expect(markup).not.toContain("High confidence");
  });

  it("renders connected lifecycle distributions, cross-lane facts, selected context, capital, decisions, and health", () => {
    const base = buildInventoryControlTowerProjection(units, now), enhanced = { ...base, stageFlow: base.byStage.map((stage) => ({ stage: stage.stage, entries30d: 2, exits30d: 1, medianDays: 3, p90Days: 7, sampleSize: 4, active: 1, waiting: 0, idle: 0, blocked: 0, breached: 0, exposureCents: 100, ownerCount: 1 })), crossLane: { status: "CONNECTED", inventoryReconOrders: 2, activeOrders: 2, blockedOrders: 1, openJobs: 3, qcPassedJobs: 1, qcHandoffReady: false, waitingPartDemands: 2, unreservedPartUnits: 4, earliestEstimatedArrivalAt: null, readinessConfidence: "LOW", customerRepairOrdersExcluded: 5 }, decisions: { status: "CONNECTED", approvals: 2, recommendations: 1, expired: 0, items: [] }, capital: { actualCents: 2_000_000, estimatedCents: 750_000, byCategory: [{ key: "ACQUISITION", exposureCents: 2_000_000 }], byConfidence: [], excludedEntries: 0, reconciliationCents: 2_750_000 }, selectedContext: { inventoryUnitId: "unit-blocked", repairOrders: [{ id: "ro1", partDemands: [] }], parts: { openDemands: 2, unreservedUnits: 4 }, tasks: [{ id: "t1" }], decisions: [{ id: "d1" }], auditEvents: [], commands: [], validCommands: ["Open Shop & Recon"], fieldRestrictions: ["Restricted fields remain capability-filtered."] }, health: { status: "ATTENTION", deadLetters: 1, openConflicts: 1, laggingProjections: [], conflicts: [{ id: "c1", systemCode: "DMS", summary: "Mismatch", ownerUserId: null }], affectedPanels: ["Integration reconciliation"], manualPath: "Continue internal evidence capture.", recoveryAction: "Reconcile and verify." } } as unknown as InventoryControlTowerProjection;
    const markup = renderToStaticMarkup(<InventoryControlTower projection={enhanced} />);
    expect(markup).toContain("2 in · 1 out"); expect(markup).toContain("3d median · 7d p90"); expect(markup).toContain("5 customer-repair orders are excluded"); expect(markup).toContain("Actual"); expect(markup).toContain("Open conflicts"); expect(markup).toContain("Restricted fields remain capability-filtered");
  });
});
