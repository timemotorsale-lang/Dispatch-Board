import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { AddVehicleWorkflow } from "@/features/inventory/add-vehicle-workflow";
import { ADD_VEHICLE_ALLOWED_REASONS, addVehicleEntryRelationship, recommendAddVehicleWorkflow } from "@/lib/add-vehicle-workflow";
import { addVehicleSubmitEndpoint } from "@/features/inventory/add-vehicle-workflow";
import { normalizeAddVehicleWorkflowInput } from "@/server/inventory-workflow-launcher/add-vehicle";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const base = {
  description: "Customer requests diagnosis for a brake warning.",
  idempotencyKey: "add-vehicle-1",
  locationId: "loc-1",
  make: "Toyota",
  model: "Camry",
  odometer: 42000,
  reasonCode: "SERVICE_REPAIR" as const,
  relationship: "CUSTOMER_VEHICLE" as const,
  vin: "4T1B11HK6KU123456",
  year: 2019
};

describe("Add Vehicle workflow", () => {
  it.each(["INVENTORY_RECON", "INSPECTION_DIAGNOSIS"])("does not require an acquisition source for dealership repair reason %s", reasonCode => {
    expect(normalizeAddVehicleWorkflowInput({ ...base, relationship: "DEALERSHIP_INVENTORY", reasonCode, acquisitionSource: "" }).acquisitionSource).toBeUndefined();
  });
  it("offers all three entry paths before acquisition intake", () => {
    const html = renderToStaticMarkup(createElement(AddVehicleWorkflow, { options: { locations: [] } }));
    expect(html).toContain("Vehicle workflow");
    expect(html).toContain("Prepare for Sale");
    expect(html).toContain("Inventory Recon");
    expect(html).toContain("Customer Repair");
  });
  it("recommends service intake without implying a repair order", () => {
    const result = recommendAddVehicleWorkflow(base);
    expect(result.code).toBe("CREATE_SERVICE_INTAKE");
    expect(result.title).toBe("Create Service Intake");
  });

  it("submits customer service through intake and dealership recon through inventory workflow", () => {
    const service = recommendAddVehicleWorkflow(base);
    expect(service.code).toBe("CREATE_SERVICE_INTAKE");
    expect(addVehicleSubmitEndpoint(service.code)).toBe("/api/service-intake/vehicles");

    const inventory = recommendAddVehicleWorkflow({ description: "Prepare acquired vehicle for recon.", reasonCode: "INVENTORY_RECON", relationship: "DEALERSHIP_INVENTORY" });
    expect(inventory.code).toBe("CREATE_INTERNAL_REPAIR_INTAKE");
    expect(addVehicleSubmitEndpoint(inventory.code)).toBe("/api/inventory-console/workflows/add-vehicle");
  });

  it("uses appraisal for trade and acquisition intent", () => {
    const result = recommendAddVehicleWorkflow({ description: "Potential trade.", reasonCode: "TRADE_APPRAISAL", relationship: "TRADE_ACQUISITION_CANDIDATE" });
    expect(result.code).toBe("START_ACQUISITION_APPRAISAL");
    expect(result.description).toContain("without creating dealership ownership");
  });

  it("fails closed for incompatible relationship and reason", () => {
    expect(() => normalizeAddVehicleWorkflowInput({ ...base, reasonCode: "INVENTORY_RECON" })).toThrow("not valid for the selected vehicle relationship");
  });

  it("requires a useful brief description", () => {
    expect(() => normalizeAddVehicleWorkflowInput({ ...base, description: "Brake" })).toThrow("at least 10 characters");
  });

  it("routes dealership recon directly to internal repair intake", () => {
    const result = recommendAddVehicleWorkflow({ description: "Prepare acquired vehicle for recon.", reasonCode: "INVENTORY_RECON", relationship: "DEALERSHIP_INVENTORY" });
    expect(result.title).toBe("Internal Repair Intake");
    expect(result.commandLabel).toBe("Add Vehicle & Start Internal Repair");
  });

  it.each(ADD_VEHICLE_ALLOWED_REASONS.DEALERSHIP_INVENTORY)("routes dealership reason %s by repair versus acquisition intent", reasonCode => {
    expect(recommendAddVehicleWorkflow({ description: "Record inventory arrival condition.", reasonCode, relationship: "DEALERSHIP_INVENTORY" }).code).toBe(["INVENTORY_RECON", "INSPECTION_DIAGNOSIS"].includes(reasonCode) ? "CREATE_INTERNAL_REPAIR_INTAKE" : "REVIEW_INVENTORY_CONTROL");
  });

  it.each([undefined, "/vehicles", "/vehicles/inventory", "/vehicles/control-tower", "/vehicles/workflows", "/vehicles/workflows/add-vehicle", "/vehicles/registry", "/vehicles/vehicle-1/intake", "/vehicles/vehicle-1/journey?view=next"])("defaults inventory entry %s to dealership inventory", path => {
    expect(addVehicleEntryRelationship(path)).toBe("DEALERSHIP_INVENTORY");
  });

  it.each(["/vehicles/repair-orders", "/vehicles/recon-repair-advisor", "/diagnostics/labor-guide", "//external.invalid/vehicles", "/vehicles/inventory-other"])("does not change service/general entry %s to inventory", path => {
    expect(addVehicleEntryRelationship(path)).toBe("CUSTOMER_VEHICLE");
  });

  it("labels an inventory-context wizard with its actual intake destination", () => {
    const html = renderToStaticMarkup(createElement(AddVehicleWorkflow, { options: { locations: [{ code: "MPLS", id: "loc-1", name: "Minneapolis" }] }, returnTo: "/vehicles/inventory" }));
    expect(html).toContain("Add Vehicle &amp; Continue Intake");
    expect(html).toContain("Condition at acquisition");
    expect(html).not.toContain("Customer-reported concern");
  });

  it("requires and normalizes an acquisition source for dealership inventory", () => {
    const inventory = { ...base, acquisitionSource: "AUCTION", reasonCode: "REFERENCE_ONLY" as const, relationship: "DEALERSHIP_INVENTORY" as const };
    expect(() => normalizeAddVehicleWorkflowInput({ ...inventory, acquisitionSource: "" })).toThrow("Acquisition source is required");
    expect(normalizeAddVehicleWorkflowInput(inventory).acquisitionSource).toBe("AUCTION");
  });

  it("requires a named location when the vehicle is off site", () => {
    const offSite = { ...base, whereabouts: "AUCTION_FACILITY" as const };
    expect(() => normalizeAddVehicleWorkflowInput(offSite)).toThrow("Off-site facility or location detail is required");
    expect(normalizeAddVehicleWorkflowInput({ ...offSite, externalLocation: "Copart — Des Moines, IA" })).toMatchObject({ externalLocation: "Copart — Des Moines, IA", whereabouts: "AUCTION_FACILITY" });
  });

  it("supports a documented non-VIN exception", () => {
    const result = normalizeAddVehicleWorkflowInput({ ...base, vin: "", nonVinAttested: true, nonVinExceptionCode: "NO_VIN_ASSIGNED", nonVinReason: "Manufacturer records confirm this vehicle was produced without an assigned VIN." });
    expect(result.vin).toBe("");
    expect(result.nonVinReason).toContain("NO_VIN_ASSIGNED");
  });

  it("requires an odometer before starting physical vehicle work", () => {
    expect(() => normalizeAddVehicleWorkflowInput({ ...base, odometer: "" })).toThrow("Odometer reading is required");
    expect(normalizeAddVehicleWorkflowInput({ ...base, reasonCode: "CUSTOMER_APPOINTMENT", odometer: "" }).odometer).toBeUndefined();
  });

  it("can be launched from another console with a safe return path", () => {
    const html = renderToStaticMarkup(createElement(AddVehicleWorkflow, { options: { locations: [{ code: "MPLS", id: "loc-1", name: "Minneapolis" }] }, returnTo: "/diagnostics/labor-guide" }));

    expect(html).toContain("Source Console");
    expect(html).toContain("href=\"/diagnostics/labor-guide\"");
    expect(html).toContain("Quick Add");
    expect(html).toContain("Detailed Add");
    expect(html).toContain("License plate");
    expect(html).toContain("NHTSA");
    expect(html).toContain("Double-click to decode vehicle details");
    expect(html).toContain("Decode vehicle details");
    expect(html).toContain("Customer-reported concern");
    expect(html).toContain("Vehicle whereabouts");
    expect(html).toContain("At our dealership");
    expect(html).toContain('data-ready="false"');
    expect(html).not.toContain('disabled="" type="submit"');
  });
});
