import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ShopExecutionWorkspace } from "@/features/inventory/shop-execution-workspace";

describe("shop execution workspace", () => {
  const users = [{ id: "advisor-1", name: "Alex Advisor" }, { id: "tech-1", name: "Walter Mechanic" }];
  const resources = [{ code: "TECH-WALTER", id: "resource-1", locationId: "location-1", name: "Walter Mechanic", resourceType: { kind: "STAFF", name: "Technician" }, userId: "tech-1" }];

  it("carries the intake technician into the dispatch form with readable vehicle selection", () => {
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
    expect(html).toContain("Choose the vehicle first");
    expect(html).toContain("Search vehicle, RO, concern, stage, location, or technician");
    expect(html).toContain("Example: Corolla, 137543, check engine, Walter, intake");
    expect(html).toContain("2019 Honda Accord");
    expect(html).toContain("VEH-100");
    expect(html).toContain("Warning lights are illuminated.");
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

  it("does not silently select the wrong repair order when the incoming context is missing", () => {
    const html = renderToStaticMarkup(<ShopExecutionWorkspace initial={{
      jobs: [],
      repairOrders: [{
        assignedTechnician: null, assignedTechnicianUserId: null, id: "ro-mazda", location: { id: "location-1", name: "Minneapolis" }, locationId: "location-1",
        nextAction: "Create repair plan", ownerUser: { id: "advisor-1", name: "Alex Advisor" }, repairOrderNumber: "RO-MAZDA", stage: "INTAKE", targetAt: "2026-08-09T10:00:00Z",
        serviceVisit: { concernSummary: "Grinding noise", promisedAt: null }, vehicle: { make: "Mazda", model: "3", vehicleNumber: "VEH-MAZDA", year: 2010 },
      }],
      resources, users,
    }} initialRepairOrderId="ro-corolla" />);

    expect(html).toContain("The repair order you came from was not found");
    expect(html).toContain("Select a vehicle or repair order");
    expect(html).not.toContain("Selected vehicle</small><strong>2010 Mazda 3");
  });

  it("shows the source vehicle bridge when the vehicle has no dispatch repair order yet", () => {
    const html = renderToStaticMarkup(<ShopExecutionWorkspace initial={{
      jobs: [],
      repairOrders: [{
        assignedTechnician: null, assignedTechnicianUserId: null, id: "ro-mazda", location: { id: "location-1", name: "Minneapolis" }, locationId: "location-1",
        nextAction: "Create repair plan", ownerUser: { id: "advisor-1", name: "Alex Advisor" }, repairOrderNumber: "RO-MAZDA", stage: "INTAKE", targetAt: "2026-08-09T10:00:00Z",
        serviceVisit: { concernSummary: "Grinding noise", promisedAt: null }, vehicle: { id: "vehicle-mazda", make: "Mazda", model: "3", vehicleNumber: "VEH-MAZDA", year: 2010 },
      }],
      resources, users,
    }} initialVehicleId="vehicle-corolla" sourceVehicle={{ id: "vehicle-corolla", make: "Toyota", model: "Corolla", stockNumber: "137543", vehicleNumber: "VEH-COROLLA", vin: "5YFB4MDE1RP137543", year: 2024 }} />);

    expect(html).toContain("2024 Toyota Corolla is the vehicle you came from");
    expect(html).toContain("Vehicle from your workbench");
    expect(html).toContain("No dispatchable RO/job exists yet");
    expect(html).toContain("Start repair order");
    expect(html).not.toContain("Selected vehicle</small><strong>2010 Mazda 3");
  });
});
