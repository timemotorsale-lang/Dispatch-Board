import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ShopExecutionWorkspace } from "@/features/inventory/shop-execution-workspace";
import { catalogLaborLineKey } from "@/lib/catalog-job-readiness";
import { LIGHT_DUTY_OPERATIONS } from "@/lib/light-duty-baseline";

describe("shop execution workspace", () => {
  const users = [{ id: "advisor-1", name: "Alex Advisor" }, { id: "tech-1", name: "Walter Mechanic" }];
  const resources = [{ code: "TECH-WALTER", id: "resource-1", locationId: "location-1", name: "Walter Mechanic", resourceType: { kind: "STAFF", name: "Technician" }, userId: "tech-1" }];

  it.each([
    { status: "READY_FOR_REPAIR", reserved: 0, bookable: true },
    { status: "WAITING_PARTS", reserved: 2, bookable: true },
    { status: "WAITING_PARTS", reserved: 1, bookable: false },
    { status: "READY_FOR_QC", reserved: 2, bookable: false },
    { status: "READY_FOR_REPAIR", reserved: 0, bookable: true, missingProcedure: true },
    { status: "WAITING_PARTS", reserved: 2, bookable: true, wrongSite: true },
    { status: "READY_FOR_REPAIR", reserved: 0, bookable: true, requiresBay: true },
  ])("shows the booking form and its applicable restrictions ($status, $reserved reserved, procedure missing $missingProcedure, wrong site $wrongSite, requires bay $requiresBay)", ({ status, reserved, bookable, missingProcedure, wrongSite, requiresBay }) => {
    const html = renderToStaticMarkup(<ShopExecutionWorkspace initial={{
      jobs: [{
        description: "Inspect warning lights", dispatches: [], id: "job-1", jobNumber: "JOB-1", laborClocks: [], plannedCorrection: "Diagnose warning indicators", status,
        ...(requiresBay ? { authorizedLineKey: catalogLaborLineKey(LIGHT_DUTY_OPERATIONS[0].id), bayRequirements: ["REQUIRED_BAY"] } : {}),
        partsRequired: status === "WAITING_PARTS", workTypeCode: "TIRE_SERVICE",
        partDemands: [{ status: reserved === 2 ? "RESERVED" : "PARTIALLY_RESERVED", quantityRequired: 2, quantityReserved: reserved }],
        repairOrder: {
          id: "ro-100", assignedTechnician: { id: "tech-1", name: "Walter Mechanic" }, customer: null, inventoryUnit: { inventoryNumber: "INV-100" },
          location: { id: "location-1", name: "Minneapolis" }, locationId: "location-1", ownerUser: { id: "advisor-1", name: "Alex Advisor" }, repairOrderNumber: "RO-100",
          serviceVisit: { concernSummary: "Warning lights are illuminated.", promisedAt: null }, vehicle: { make: "Honda", model: "Accord", vehicleNumber: "VEH-100", year: 2019 },
        },
      }],
      resources: wrongSite ? resources.map(resource => ({ ...resource, locationId: "other-site" })) : resources,
      users, procedures: missingProcedure ? [] : undefined, canPublishProcedure: true,
    }} initialRepairOrderId="ro-100" />);

    expect(html).toContain("Repair job assignment");
    expect(html).toContain("Choose the vehicle first");
    expect(html).toContain("Search vehicle, RO, concern, stage, location, or technician");
    expect(html).toContain("Example: Corolla, 137543, check engine, Walter, intake");
    expect(html).toContain("2019 Honda Accord");
    expect(html).toContain("VEH-100");
    expect(html).toContain("Warning lights are illuminated.");
    if (wrongSite) {
      expect(html).toContain("Technician setup needed");
      expect(html).toContain("No technician at this site");
      expect(html).toContain("Booking requires an active technician at <strong>Minneapolis</strong>");
      expect(html).toContain('disabled="" aria-describedby="booking-technician-required">Book work');
      expect(html).not.toContain("Ready to book");
    } else {
      expect(html).toContain('<option value="tech-1" selected="">Walter Mechanic</option>');
    }
    expect(html).toContain("Save technician");
    expect(html.includes("Book work")).toBe(bookable);
    if (bookable && !requiresBay) expect(html).toContain("No dedicated bay needed");
    if (bookable && !wrongSite && !requiresBay) expect(html).toContain('<button class="button button-primary">Book work</button>');
    if (requiresBay) {
      expect(html).toContain("No suitable service bay at this site");
      expect(html).toContain('disabled="" aria-describedby="booking-bay-required">Book work');
    }
    if (missingProcedure) {
      expect(html).toContain("Optional work procedure");
      expect(html).toContain("Publish work procedure");
      expect(html).toContain("Ready to book");
      expect(html).not.toContain('aria-describedby="booking-procedure-required">Book work');
    }
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
