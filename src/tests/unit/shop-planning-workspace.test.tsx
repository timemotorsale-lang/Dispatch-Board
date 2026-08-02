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
    expect(markup).toContain("Diagnostic Release Command Center");
    expect(markup).toContain("Vehicle released for diagnosis");
    expect(markup).toContain("Diagnostic mission");
    expect(markup).toContain("Evidence ledger");
    expect(markup).toContain("Exact-version customer authorization required");
    expect(markup).toContain("Return to workbench");
  });
});
