import { describe, expect, it } from "vitest";

import { recommendAddVehicleWorkflow } from "@/lib/add-vehicle-workflow";
import { normalizeAddVehicleWorkflowInput } from "@/server/inventory-workflow-launcher/add-vehicle";

const base = {
  description: "Customer requests diagnosis for a brake warning.",
  idempotencyKey: "add-vehicle-1",
  locationId: "loc-1",
  make: "Toyota",
  model: "Camry",
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

  it("supports a documented non-VIN exception", () => {
    const result = normalizeAddVehicleWorkflowInput({ ...base, vin: "", nonVinReason: "Pre-1981 vehicle without a standard 17-character VIN." });
    expect(result.vin).toBe("");
    expect(result.nonVinReason).toContain("Pre-1981");
  });
});
