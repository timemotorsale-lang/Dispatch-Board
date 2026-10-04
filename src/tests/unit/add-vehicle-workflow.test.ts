import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { AddVehicleWorkflow } from "@/features/inventory/add-vehicle-workflow";
import { recommendAddVehicleWorkflow } from "@/lib/add-vehicle-workflow";
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
  it("recommends service intake without implying a repair order", () => {
    const result = recommendAddVehicleWorkflow(base);
    expect(result.code).toBe("CREATE_SERVICE_INTAKE");
    expect(result.title).toBe("Create Service Intake");
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

  it("routes dealership recon directly to the vehicle workbench", () => {
    const result = recommendAddVehicleWorkflow({ description: "Prepare acquired vehicle for recon.", reasonCode: "INVENTORY_RECON", relationship: "DEALERSHIP_INVENTORY" });
    expect(result.title).toBe("Open Vehicle Workbench");
    expect(result.commandLabel).toBe("Add Vehicle & Open Workbench");
  });

  it("requires and normalizes an acquisition source for dealership inventory", () => {
    const inventory = { ...base, acquisitionSource: "AUCTION", reasonCode: "INVENTORY_RECON" as const, relationship: "DEALERSHIP_INVENTORY" as const };
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
