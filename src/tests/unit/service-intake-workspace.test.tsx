import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { buildServiceIntakeVehicleCommand, ServiceIntakeWorkspace } from "@/features/inventory/service-intake-workspace";
import { normalizeAddVehicleWorkflowInput } from "@/server/inventory-workflow-launcher/add-vehicle";

const options = {
  appointments: [],
  customers: [{ customerNumber: "CUS-100", displayName: "Jordan Customer", id: "customer-1" }],
  inventoryUnits: [],
  locations: [{ code: "MPLS", id: "location-1", name: "Minneapolis" }],
  repairOrders: [],
  users: [{ email: "advisor@example.test", id: "advisor-1", name: "Alex Advisor", roles: ["Service Advisor"] }, { email: "walter@example.test", id: "tech-1", name: "Walter Mechanic", roles: ["Mechanic"] }],
  vehicles: [{ id: "vehicle-1", make: "Ford", model: "F-150", vehicleNumber: "VEH-100", year: 2024 }],
};

describe("enterprise service intake workspace", () => {
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
    expect(html).toContain("Assign technician");
    expect(html).toContain('aria-label="Assign technician"');
    expect(html).toContain("Choose once at intake");
    expect(html).toContain("Walter Mechanic");
    expect(html).toContain("Assigned technician");
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

  it("preserves a labor-guide return path for repair-order creation", () => {
    const html = renderToStaticMarkup(<ServiceIntakeWorkspace initialTimestamp="2026-08-02T07:00:00.000Z" options={options} returnTo="/diagnostics/labor-guide" />);

    expect(html).toContain("Back to Labor Guide");
    expect(html).toContain("href=\"/diagnostics/labor-guide\"");
  });

  it("restores a selected canonical vehicle into the persistent intake form", () => {
    const html = renderToStaticMarkup(<ServiceIntakeWorkspace initialConcernSummary="Customer reports brake vibration." initialTimestamp="2026-08-02T07:00:00.000Z" initialVehicleId="vehicle-1" options={options} />);

    expect(html).toContain("2024 Ford F-150");
    expect(html).toContain("Customer reports brake vibration.");
    expect(html).toContain("Decoded vehicle information");
    expect(html).toContain("Canonical vehicle selected");
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
    expect(html).toContain("Internal recon readiness");
    expect(html).toContain("Inventory concern &amp; recon request");
    expect(html).not.toContain("Next: Add / Select Customer");
  });

  it("builds a governed canonical-vehicle command for an unmatched decoded VIN", () => {
    const command = buildServiceIntakeVehicleCommand({ description: "Customer reports an airbag warning light.", idempotencyKey: "service-intake-vin-1", locationId: "location-1", make: "HONDA", model: "Accord", odometer: "125000", odometerUnit: "MILES", vin: "1HGCM82633A004352", year: "2003" });

    expect(normalizeAddVehicleWorkflowInput(command)).toMatchObject({ addMode: "QUICK", description: "Customer reports an airbag warning light.", odometer: 125000, reasonCode: "SERVICE_REPAIR", relationship: "CUSTOMER_VEHICLE", vin: "1HGCM82633A004352" });
  });
});
