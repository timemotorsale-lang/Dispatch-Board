import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ShopExecutionWorkspace } from "@/features/inventory/shop-execution-workspace";

describe("shop execution workspace", () => {
  const users = [{ id: "advisor-1", name: "Alex Advisor" }, { id: "tech-1", name: "Walter Mechanic" }];
  const resources = [{ code: "TECH-WALTER", id: "resource-1", locationId: "location-1", name: "Walter Mechanic", resourceType: { kind: "STAFF", name: "Technician" }, userId: "tech-1" }];

  it("carries the intake technician into the dispatch form", () => {
    const html = renderToStaticMarkup(<ShopExecutionWorkspace initial={{
      jobs: [{
        description: "Inspect warning lights", dispatches: [], id: "job-1", jobNumber: "JOB-1", laborClocks: [], plannedCorrection: "Diagnose warning indicators", status: "READY_FOR_REPAIR",
        repairOrder: {
          id: "ro-100", assignedTechnician: { id: "tech-1", name: "Walter Mechanic" }, customer: null, inventoryUnit: { inventoryNumber: "INV-100" },
          location: { id: "location-1", name: "Minneapolis" }, locationId: "location-1", ownerUser: { id: "advisor-1", name: "Alex Advisor" }, repairOrderNumber: "RO-100",
          serviceVisit: { concernSummary: "Warning lights are illuminated.", promisedAt: null }, vehicle: { make: "Honda", model: "Accord", vehicleNumber: "VEH-100", year: 2019 },
        },
      }],
      resources, users,
    }} initialRepairOrderId="ro-100" />);

    expect(html).toContain("Repair job assignment");
    expect(html).toContain("VEH-100 · RO-100");
    expect(html).toContain('<option value="tech-1" selected="">Walter Mechanic</option>');
    expect(html).toContain("Save technician");
    expect(html).toContain("Book work");
  });

  it("keeps technician assignment available before a repair job exists", () => {
    const html = renderToStaticMarkup(<ShopExecutionWorkspace initial={{
      jobs: [],
      repairOrders: [{
        assignedTechnician: null, assignedTechnicianUserId: null, id: "ro-intake", location: { id: "location-1", name: "Minneapolis" }, locationId: "location-1",
        nextAction: "Create repair plan", ownerUser: { id: "advisor-1", name: "Alex Advisor" }, repairOrderNumber: "RO-INTAKE", stage: "INTAKE", targetAt: "2026-08-09T10:00:00Z",
        serviceVisit: { concernSummary: "Check engine light", promisedAt: null }, vehicle: { make: "Honda", model: "Accord", vehicleNumber: "VEH-200", year: 2019 },
      }],
      resources, users,
    }} initialRepairOrderId="ro-intake" />);

    expect(html).toContain("No repair job created yet");
    expect(html).toContain("Save technician");
    expect(html).toContain("Prepare repair job");
    expect(html).not.toContain("Book work");
  });
});
