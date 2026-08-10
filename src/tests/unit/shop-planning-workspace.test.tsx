import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ShopPlanningWorkspace } from "@/features/inventory/shop-planning-workspace";

describe("Shop Planning diagnostic release workspace", () => {
  it("keeps the repair order, diagnostic mission, evidence ledger, and governed stages together", () => {
    const order = {
      id: "ro-1", repairOrderNumber: "RO-100", version: 1, stage: "INTAKE", updatedAt: "2026-08-01T15:00:00.000Z",
      vehicle: { id: "vehicle-1", vehicleNumber: "VEH-1", vin: "VIN123", year: 2024, make: "Toyota", model: "RAV4" },
      customer: { displayName: "Leo James" }, inventoryUnit: null,
      serviceVisit: { arrivedAt: "2026-08-01T14:00:00.000Z", concernSummary: "Customer reports grinding from the front passenger brake." },
      inspectionVersions: [], diagnosisVersions: [], estimateVersions: [], repairJobs: [], partDemands: [],
    };
    const markup = renderToStaticMarkup(<ShopPlanningWorkspace initial={{ repairOrders: [order], users: [{ id: "tech-1", name: "Walter Mechanic" }] }} returnTo="/vehicles/repair-workbench?repairOrderId=ro-1" />);
    expect(markup).toContain("Repair Planning Command Center");
    expect(markup).toContain("Vehicle released for diagnosis");
    expect(markup).toContain("Diagnostic mission");
    expect(markup).toContain("Diagnostic repair");
    expect(markup).toContain("Body / collision scope");
    expect(markup).toContain("Evidence ledger");
    expect(markup).toContain("Exact-version customer authorization required");
    expect(markup).toContain("Return to workbench");
  });

  it("defaults visible bodywork to the direct repair scope path", () => {
    const order = {
      id: "ro-2", repairOrderNumber: "RO-200", version: 1, stage: "INTAKE", updatedAt: "2026-08-01T15:00:00.000Z",
      vehicle: { id: "vehicle-2", vehicleNumber: "VEH-2", vin: "VIN456", year: 2024, make: "Toyota", model: "RAV4" },
      customer: null, inventoryUnit: { acquisitionAppraisals: [{ estimatedReconCents: 325000, estimatedRetailCents: 2100000 }], acquisitionCase: { appraisalSnapshot: { estimatedReconCents: 325000, expectedRetailCents: 2100000 }, recommendationSnapshot: {} }, costEntries: [{ amountCents: 90000, category: "RECON", currency: "USD", recoveredAt: null, status: "POSTED" }], id: "inv-1", inventoryNumber: "333586", lifecycleStage: "RECONDITIONING", nextAction: "Approve recon scope.", operatingState: "ACTIVE", ownerUser: { id: "owner-1", name: "Morgan Inventory" }, stateReason: null, targetAt: "2026-08-03T14:00:00.000Z", version: 4 },
      serviceVisit: { arrivedAt: "2026-08-01T14:00:00.000Z", concernSummary: "Auction bodywork damage to bumper and fender." },
      inspectionVersions: [], diagnosisVersions: [], estimateVersions: [], repairJobs: [], partDemands: [],
    };
    const markup = renderToStaticMarkup(<ShopPlanningWorkspace initial={{ repairOrders: [order], users: [{ id: "tech-1", name: "Walter Mechanic" }] }} returnTo="/vehicles/repair-workbench?repairOrderId=ro-2" />);
    expect(markup).toContain("Direct repair mission");
    expect(markup).toContain("Vehicle ready for direct repair scope");
    expect(markup).toContain("No-diagnosis path");
    expect(markup).toContain("Why diagnosis is not required");
    expect(markup).toContain("Record direct repair scope");
    expect(markup).toContain("TAI recon budget guardrail");
    expect(markup).toContain("Rapid recon estimate recipe");
  });
});
