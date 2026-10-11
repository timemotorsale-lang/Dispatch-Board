import { renderToStaticMarkup } from "@/tests/helpers/render-with-app-router";
import { describe, expect, it } from "vitest";

import { buildServiceIntakeCompletionLinks, buildServiceIntakeVehicleCommand, isServiceIntakeCustomerDraftReady, ServiceIntakeWorkspace } from "@/features/inventory/service-intake-workspace";
import { normalizeAddVehicleWorkflowInput } from "@/server/inventory-workflow-launcher/add-vehicle";

const options = {
  appointments: [],
  customers: [{ customerNumber: "CUS-100", displayName: "Jordan Customer", id: "customer-1" }],
  inventoryUnits: [],
  locations: [{ code: "MPLS", id: "location-1", name: "Minneapolis" }],
  repairOrders: [],
  repairVendors: [{ defaultLeadDays: 3, id: "vendor-1", name: "Diego Auto Body", vendorType: "BODY_SHOP" }],
  users: [{ email: "advisor@example.test", id: "advisor-1", name: "Alex Advisor", roles: ["Service Advisor"] }, { email: "brock@example.test", id: "ops-tech-1", name: "Brock Harris", roles: ["Vehicle Operations Lead", "Inventory Manager"] }, { email: "walter@example.test", id: "tech-1", name: "Walter Mechanic", roles: ["Mechanic"] }],
  vehicles: [{ id: "vehicle-1", make: "Ford", model: "F-150", vehicleNumber: "VEH-100", year: 2024 }],
};

describe("enterprise service intake workspace", () => {
  it("allows verified dealership repair intake without acquisition forms or an inventory unit", () => {
    const repairOptions = { ...options, vehicles: [{ ...options.vehicles[0], registryRelationships: [{ relationshipType: "DEALERSHIP_OWNED" }] }] };
    const html = renderToStaticMarkup(<ServiceIntakeWorkspace initialTimestamp="2026-08-02T07:00:00.000Z" initialVehicleId="vehicle-1" initialVehicleRelationship="DEALERSHIP_INVENTORY" options={repairOptions} />);
    expect(html).toContain("Ready for internal repair intake");
    expect(html).not.toContain("Financial acquisition");
    expect(html).not.toContain("Create &amp; Link Inventory Unit");
    expect(html).not.toContain("Next: Add / Select Customer");
    const unconfirmed = renderToStaticMarkup(<ServiceIntakeWorkspace initialTimestamp="2026-08-02T07:00:00.000Z" initialVehicleId="vehicle-1" initialVehicleRelationship="DEALERSHIP_INVENTORY" options={options} />);
    expect(unconfirmed).toContain("Confirm Dealership Ownership");
  });
  it("renders a guided advisor check-in with spacious concern capture and governance cues", () => {
    const html = renderToStaticMarkup(<ServiceIntakeWorkspace initialTimestamp="2026-08-02T07:00:00.000Z" options={options} />);

    expect(html).toContain("Check In Vehicle");
    expect(html).toContain("Find Arrival");
    expect(html).toContain("Live service readiness");
    expect(html).toContain("Live appointment and capacity facts will appear here");
    expect(html).toContain("Customer concern");
    expect(html).toContain("rows=\"5\"");
    expect(html).toContain("maxLength=\"2000\"");
    expect(html).toContain("Helpful prompts");
    expect(html).toContain("Visit &amp; Custody");
    expect(html).toContain("Choose execution path");
    expect(html).toContain('aria-label="Assign technician"');
    expect(html).toContain("Internal shop");
    expect(html).toContain("Outside vendor");
    expect(html).toContain("Route the vehicle to the internal shop or an outside vendor");
    expect(html).toContain("Walter Mechanic");
    expect(html).toContain("Brock Harris");
    expect(html).toContain("Alex Advisor");
    expect(html).toContain("Repair-capable staff");
    expect(html).toContain("Other active staff");
    expect(html).toContain("Brock Harris — Repair-capable");
    expect(html).toContain("Assigned technician");
    expect(html).toContain('href="/vehicles/shop-dispatch"');
    expect(html).toContain("Open Shop Dispatch");
    expect(html).toContain("Technician &amp; target");
    expect(html).not.toContain("Advisor / owner");
    expect(html).toContain("Check-in requirements");
    expect(html).toContain("Next: Add / Select Customer");
    expect(html).toContain("Add / Select Customer");
    expect(html).toContain("No repair authorization or estimate approval is implied");
  });

  it("starts with canonical arrival search and no-result creation paths", () => {
    const html = renderToStaticMarkup(<ServiceIntakeWorkspace initialTimestamp="2026-08-02T07:00:00.000Z" options={options} />);

    expect(html).toContain("Find Customer, Vehicle, or Appointment");
    expect(html).toContain("Vehicle Identity Intelligence");
    expect(html).toContain("Search, decode, and duplicate guard are always available at intake.");
    expect(html).toContain("Search name, phone, email, VIN, plate, appointment, or RO...");
    expect(html).toContain(">Search</button>");
    expect(html).toContain("Add New Customer");
    expect(html).toContain("Add New Vehicle");
    expect(html).not.toContain("/vehicles/workflows/add-vehicle?");
    expect(html).toContain("Select customer");
    expect(html).toContain("Select vehicle");
    expect(html).toContain("Minneapolis");
    expect(html).toContain("Walter Mechanic");
  });

  it("only enables service-intake customer creation after a name plus contact method", () => {
    expect(isServiceIntakeCustomerDraftReady({ displayName: "", phoneNumber: "6123425656" })).toBe(false);
    expect(isServiceIntakeCustomerDraftReady({ displayName: "Amina Yusuf" })).toBe(false);
    expect(isServiceIntakeCustomerDraftReady({ displayName: "Amina Yusuf", phoneNumber: "6123425656" })).toBe(true);
    expect(isServiceIntakeCustomerDraftReady({ displayName: "Amina Yusuf", email: "amina@example.test" })).toBe(true);
  });

  it("preserves a labor-guide return path for repair-order creation", () => {
    const html = renderToStaticMarkup(<ServiceIntakeWorkspace initialTimestamp="2026-08-02T07:00:00.000Z" options={options} returnTo="/diagnostics/labor-guide" />);

    expect(html).toContain("Back to Labor Guide");
    expect(html).toContain("href=\"/diagnostics/labor-guide\"");
  });

  it("keeps the created repair order available before returning to the source workspace", () => {
    expect(buildServiceIntakeCompletionLinks("ro-123", "/diagnostics/labor-guide")).toEqual({
      repairWorkbenchHref: "/vehicles/repair-workbench?repairOrderId=ro-123",
      returnHref: "/diagnostics/labor-guide?repairOrderId=ro-123",
      shopDispatchHref: "/vehicles/shop-dispatch?repairOrderId=ro-123",
    });
  });

  it("restores a selected canonical vehicle without pre-filling the concern", () => {
    const html = renderToStaticMarkup(<ServiceIntakeWorkspace initialConcernSummary="Customer reports brake vibration." initialTimestamp="2026-08-02T07:00:00.000Z" initialVehicleId="vehicle-1" options={options} />);

    expect(html).toContain("2024 Ford F-150");
    expect(html).not.toContain("Customer reports brake vibration.");
    expect(html).toContain("0 / 2,000");
    expect(html).toContain("Decoded vehicle information");
    expect(html).toContain("Canonical vehicle selected");
    expect(html).toContain("Vehicle color");
    expect(html).toContain("Save color");
    expect(html).toContain("Vehicle 360");
    expect(html).toContain("Next: Add / Select Customer");
  });

  it("uses dealership inventory context without requiring a customer", () => {
    const inventoryOptions = { ...options, inventoryUnits: [{ id: "inventory-1", inventoryNumber: "INV-100", locationId: "location-1", vehicle: options.vehicles[0] }] };
    const html = renderToStaticMarkup(<ServiceIntakeWorkspace initialConcernSummary="Complete inventory safety inspection and recon estimate." initialTimestamp="2026-08-02T07:00:00.000Z" initialVehicleId="vehicle-1" initialVehicleRelationship="DEALERSHIP_INVENTORY" options={inventoryOptions} />);

    expect(html).toContain("Dealership inventory");
    expect(html).toContain("Inventory source");
    expect(html).toContain("Customer not required");
    expect(html).toContain("Inventory unit INV-100 linked");
    expect(html).toContain("Internal repair readiness");
    expect(html).toContain("Inventory concern &amp; recon request");
    expect(html).not.toContain("Next: Add / Select Customer");
  });

  it("keeps the final check-in action app-controlled instead of relying on native form validation", () => {
    const inventoryOptions = { ...options, inventoryUnits: [{ id: "inventory-1", inventoryNumber: "INV-100", locationId: "location-1", vehicle: options.vehicles[0] }] };
    const html = renderToStaticMarkup(<ServiceIntakeWorkspace initialConcernSummary="Complete inventory safety inspection and recon estimate." initialTimestamp="2026-08-02T07:00:00.000Z" initialVehicleId="vehicle-1" initialVehicleRelationship="DEALERSHIP_INVENTORY" options={inventoryOptions} />);

    expect(html).toContain('noValidate=""');
    expect(html).toContain('type="button">Complete Check-In &amp; Create Repair Order');
  });

  it("shows open RO history without auto-matching a stale incoming concern", () => {
    const matchingOptions = { ...options, repairOrders: [{ closedAt: null, customer: { displayName: "Jordan Customer" }, id: "ro-existing", openedAt: "2026-08-01T10:00:00.000Z", operatingState: "ACTIVE", repairOrderNumber: "RO-EXISTING", serviceVisit: { concernSummary: "Check engine light is on" }, stage: "INTAKE", vehicle: options.vehicles[0] }] };
    const html = renderToStaticMarkup(<ServiceIntakeWorkspace initialConcernSummary="Customer reports a check engine warning lamp." initialTimestamp="2026-08-02T07:00:00.000Z" initialVehicleId="vehicle-1" options={matchingOptions} />);

    expect(html).toContain("VIN / canonical vehicle match");
    expect(html).not.toContain("Customer reports a check engine warning lamp.");
    expect(html).not.toContain("Same open concern detected");
    expect(html).toContain("RO-EXISTING");
    expect(html).toContain("Save technician &amp; open");
    expect(html).toContain("The concern appears different");
    expect(html).not.toContain("Duplicate RO blocked");
    expect(html).toContain("Repair-order decision");
  });

  it("keeps the footer on the first missing requirement before stale repair work can be matched", () => {
    const matchingOptions = { ...options, repairOrders: [{ closedAt: null, customer: { displayName: "Jordan Customer" }, id: "ro-existing", openedAt: "2026-08-01T10:00:00.000Z", operatingState: "ACTIVE", repairOrderNumber: "RO-EXISTING", serviceVisit: { concernSummary: "Check engine light is on" }, stage: "INTAKE", vehicle: options.vehicles[0] }] };
    const html = renderToStaticMarkup(<ServiceIntakeWorkspace initialConcernSummary="Customer reports a check engine warning lamp." initialTimestamp="2026-08-02T07:00:00.000Z" initialVehicleId="vehicle-1" options={matchingOptions} />);

    expect(html).not.toContain("Customer reports a check engine warning lamp.");
    expect(html).toContain("Next: Add / Select Customer");
    expect(html).toContain('type="button">Add / Select Customer');
  });

  it("requires a deliberate new-RO choice for a different concern on the same VIN", () => {
    const matchingOptions = { ...options, repairOrders: [{ closedAt: null, customer: { displayName: "Jordan Customer" }, id: "ro-existing", openedAt: "2026-08-01T10:00:00.000Z", operatingState: "ACTIVE", repairOrderNumber: "RO-EXISTING", serviceVisit: { concernSummary: "Check engine light is on" }, stage: "INTAKE", vehicle: options.vehicles[0] }] };
    const html = renderToStaticMarkup(<ServiceIntakeWorkspace initialConcernSummary="Customer reports vibration above highway speed." initialTimestamp="2026-08-02T07:00:00.000Z" initialVehicleId="vehicle-1" options={matchingOptions} />);

    expect(html).toContain("The concern appears different");
    expect(html).toContain("Save technician &amp; open");
    expect(html).toContain("Create separate RO for this concern");
    expect(html).toContain("Repair-order decision");
  });

  it("builds a governed canonical-vehicle command for an unmatched decoded VIN", () => {
    const command = buildServiceIntakeVehicleCommand({ color: "White", description: "Customer reports an airbag warning light.", idempotencyKey: "service-intake-vin-1", locationId: "location-1", make: "HONDA", model: "Accord", odometer: "125000", odometerUnit: "MILES", vin: "1HGCM82633A004352", year: "2003" });

    expect(normalizeAddVehicleWorkflowInput(command)).toMatchObject({ addMode: "QUICK", color: "White", description: "Customer reports an airbag warning light.", odometer: 125000, reasonCode: "SERVICE_REPAIR", relationship: "CUSTOMER_VEHICLE", vin: "1HGCM82633A004352" });
  });

  it("lets intake create a VIN-validated vehicle when external decode is unavailable", () => {
    const command = buildServiceIntakeVehicleCommand({ description: "Inventory check-in with warning lights.", idempotencyKey: "service-intake-manual-vin-1", locationId: "location-1", make: "HONDA", manualDecodeAcknowledged: true, model: "CR-V", odometer: "92000", odometerUnit: "MILES", relationship: "DEALERSHIP_INVENTORY", vin: "7FARW2H5XJE098317", year: "2018" });

    expect(normalizeAddVehicleWorkflowInput(command)).toMatchObject({ manualDecodeAcknowledged: true, make: "HONDA", model: "CR-V", odometer: 92000, reasonCode: "INVENTORY_RECON", relationship: "DEALERSHIP_INVENTORY", vin: "7FARW2H5XJE098317", year: 2018 });
  });
});
