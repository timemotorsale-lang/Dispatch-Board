import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AcquisitionAppraisalWorkspace } from "@/features/inventory/acquisition-appraisal-workspace";
import { InventoryRetailCompletionWorkspace } from "@/features/inventory/inventory-retail-completion-workspace";

describe("vehicle tool scope", () => {
  it("does not fall back to another vehicle's appraisal case", () => {
    const props = {
      initialVehicleId: "selected-vehicle",
      initial: { items: [{ id: "other-case", status: "EVIDENCE_REQUIRED", vehicle: { id: "other-vehicle" } }], totals: { active: 1, authorizationPending: 0, evidenceRequired: 1, readyForAppraisal: 0 } },
      options: { vehicles: [], users: [], locations: [] }
    } as unknown as Parameters<typeof AcquisitionAppraisalWorkspace>[0];
    const html = renderToStaticMarkup(<AcquisitionAppraisalWorkspace {...props}/>);
    expect(html).toContain("No acquisition case yet");
    expect(html).not.toContain("other-case");
  });
  it("does not fall back to another vehicle's retail completion", () => {
    const props = {
      initialVehicleId: "selected-vehicle", initialCompletionId: "other-completion",
      initial: { generatedAt: "2026-10-10T12:00:00Z", items: [{ id: "other-completion", inventoryUnit: { vehicleId: "other-vehicle" } }] },
      options: { units: [], users: [] }
    } as unknown as Parameters<typeof InventoryRetailCompletionWorkspace>[0];
    const html = renderToStaticMarkup(<InventoryRetailCompletionWorkspace {...props}/>);
    expect(html).toContain("No governed retail completions exist in this scope");
    expect(html).not.toContain("other-completion");
  });
});
