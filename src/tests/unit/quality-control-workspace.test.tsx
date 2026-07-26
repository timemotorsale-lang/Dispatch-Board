import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { QualityControlWorkspace } from "@/features/inventory/quality-control-workspace";

const model = {
  users: [{ id: "user-qc", name: "Quincy QC" }],
  repairOrders: [{
    id: "ro_1",
    repairOrderNumber: "RO-1001",
    origin: "CUSTOMER_SERVICE",
    stage: "QUALITY_CONTROL",
    locationId: "loc_1",
    targetAt: "2026-07-20T20:00:00.000Z",
    vehicle: { vehicleNumber: "VEH-1001", year: 2024, make: "Ford", model: "F-150" },
    customer: { displayName: "Jordan Customer" },
    inventoryUnit: null,
    location: { name: "Time Motor Sales - Minneapolis" },
    serviceVisit: { concernSummary: "Grinding noise from front passenger brakes.", promisedAt: "2026-07-20T21:00:00.000Z" },
    releaseAuthorization: null,
    repairJobs: [{
      id: "job_1",
      jobNumber: "J-1",
      description: "Front brake repair",
      plannedCorrection: "Replace pads and verify braking noise is gone.",
      status: "READY_FOR_QC",
      lane: "MECHANICAL_LIGHT",
      executionEvidence: ["photo:front-brakes"],
      qcHandoffNotes: "Verify no grinding on low-speed braking.",
      readinessReasonCodes: [],
      procedureVersion: { title: "Brake repair final QC", version: 2, qcRules: ["Road test if noise related", "Verify wheel torque"] },
      qualityInspections: [],
      dispatches: [{ technicianUser: { name: "Walter Mechanic" } }],
      laborClocks: []
    }]
  }]
};

describe("QualityControlWorkspace", () => {
  it("renders a compact direct-to-work QC inspector workspace", () => {
    const html = renderToStaticMarkup(<QualityControlWorkspace initial={model} />);

    expect(html).toContain("Quality Control Workspace");
    expect(html).toContain("Verify completed repairs before they leave the shop.");
    expect(html).toContain("Ready for QC");
    expect(html).toContain("Inspector queue");
    expect(html).toContain("Selected repair");
    expect(html).toContain("Technician handoff evidence");
    expect(html).toContain("Record QC decision");
    expect(html).toContain("Final release authorization");
    expect(html).toContain("/vehicles/repair-workbench?repairOrderId=ro_1");
    expect(html).toContain("/vehicles/repair-jobs/job_1/workbench");
  });
});
