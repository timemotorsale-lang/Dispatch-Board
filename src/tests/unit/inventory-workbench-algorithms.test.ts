import { describe, expect, it } from "vitest";
import { chooseVehicleWorkbenchNextAction, summarizePartsReadiness, withVehicleWorkbenchReturn } from "@/server/inventory-execution/workbench-algorithms";

describe("Vehicle Workbench advisory algorithms", () => {
  it("keeps deeper pages connected back to the vehicle workbench", () => {
    expect(withVehicleWorkbenchReturn("/vehicles/parts-operations?vehicleId=vehicle-1", "vehicle-1")).toBe("/vehicles/parts-operations?vehicleId=vehicle-1&returnTo=%2Fvehicles%2Fvehicle-1%2Fworkbench");
  });

  it("marks ordered or waiting parts as a work blocker", () => {
    const readiness = summarizePartsReadiness({ allowed: true, demands: [{ status: "ORDERED" }, { status: "RESERVED" }] });
    expect(readiness).toMatchObject({ blocker: true, needed: 2, ready: 1, status: "NOT_READY" });
  });

  it("prioritizes unavailable work and parts blockers before normal current work", () => {
    expect(chooseVehicleWorkbenchNextAction({
      current: { nextAction: "Replace brake pads" },
      evidenceCompleteness: { complete: 0, missing: 1, required: 1, status: "INCOMPLETE", summary: "0/1 evidence requirement complete." },
      operation: { nextAction: "Finish recon" },
      partsReadiness: { blocker: false, needed: 0, ready: 0, status: "NO_PARTS_DEMAND", summary: "No linked parts demand." },
      workUnavailable: true
    }).action).toBe("Review unavailable work source");

    expect(chooseVehicleWorkbenchNextAction({
      current: { nextAction: "Replace brake pads" },
      evidenceCompleteness: { complete: 0, missing: 1, required: 1, status: "INCOMPLETE", summary: "0/1 evidence requirement complete." },
      operation: { nextAction: "Finish recon" },
      partsReadiness: { blocker: true, needed: 1, ready: 0, status: "NOT_READY", summary: "0/1 linked parts demand ready." },
      workUnavailable: false
    }).action).toBe("Confirm parts readiness");
  });
});
