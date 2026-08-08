import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ShopExecutionWorkspace } from "@/features/inventory/shop-execution-workspace";

describe("shop execution workspace", () => {
  it("carries the intake technician into the later dispatch form", () => {
    const html = renderToStaticMarkup(<ShopExecutionWorkspace initial={{
      jobs: [{
        bayRequirements: [], description: "Inspect warning lights", dispatches: [], executionBlockerReason: null,
        id: "job-1", jobNumber: "JOB-1", laborClocks: [], lane: "DIAGNOSTIC_LIGHT", partDemands: [],
        plannedCorrection: "Diagnose warning indicators", priorityReasonCodes: [], priorityScore: 50,
        procedureVersion: null, qcHandoffNotes: null, requiredCertifications: [], requiredSkills: [],
        repairOrder: {
          id: "ro-100",
          customer: null, inventoryUnit: { inventoryNumber: "INV-100" }, location: { id: "location-1", name: "Minneapolis" },
          locationId: "location-1", ownerUser: { id: "tech-1", name: "Walter Mechanic" }, repairOrderNumber: "RO-100",
          serviceVisit: { concernSummary: "Warning lights are illuminated.", promisedAt: null },
          vehicle: { make: "Honda", model: "Accord", vehicleNumber: "VEH-100", year: 2019 },
        },
        status: "READY_FOR_REPAIR", toolRequirements: [], workTypeCode: "GENERAL_REPAIR",
      }],
      procedures: [], qualifications: [],
      resources: [{ code: "TECH-WALTER", id: "resource-1", locationId: "location-1", name: "Walter Mechanic", resourceType: { kind: "STAFF", name: "Technician" }, userId: "tech-1" }],
      users: [{ id: "advisor-1", name: "Alex Advisor" }, { id: "tech-1", name: "Walter Mechanic" }],
    }} initialRepairOrderId="ro-100" />);

    expect(html).toContain("Dispatcher board");
    expect(html).toContain("Vehicle card opened:");
    expect(html).toContain("VEH-100 · RO-100");
    expect(html).toContain('<option value="tech-1" selected="">Walter Mechanic</option>');
    expect(html).toContain("Book current/next work");
  });
});
