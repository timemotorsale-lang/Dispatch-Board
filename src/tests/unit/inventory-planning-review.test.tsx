import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { InventoryPlanningReview, VehicleLocationEditor } from "@/features/inventory/inventory-planning-review";
import type { VehicleExecutionWorkbenchProjection } from "@/server/inventory-execution/workbench-service";

const projection = {
  contractVersion: "inventory-eos-workbench/v1",
  generatedAt: "2026-08-01T15:00:00.000Z",
  identity: { id: "vehicle-1", vehicleNumber: "VEH-1001", vin: "2T3W1RFV4PW278629", vinState: "VERIFIED", stockNumber: "STK-1001", year: 2023, make: "Toyota", model: "RAV4", color: "Black", licensePlate: "ABC123", status: "ACTIVE" },
  operation: { location: { id: "loc-1", name: "Minneapolis" }, latestOdometer: { reading: 42118 }, operatingState: "ACTIVE", stage: "RECEIPT" },
  overview: {},
  work: { status: "CONNECTED", unavailableReason: null, current: null, staged: null, other: [] },
  workOrders: { allowed: true, items: [] },
  parts: { allowed: true, demands: [], custody: [] },
  evidence: { allowed: true, items: [] },
  activity: [],
  audit: { allowed: true, items: [] },
  links: { vehicle360: "/vehicles/360/vehicle-1", evidence: "/vehicles/360/vehicle-1?section=documents", parts: "/vehicles/parts-operations?vehicleId=vehicle-1", tasks: "/tasks?vehicleId=vehicle-1" }
} as unknown as VehicleExecutionWorkbenchProjection;

function workflow(stage: string) {
  return {
    id: "itf-1", version: 4, stage, operatingState: stage === "HOLD" ? "BLOCKED" : "ACTIVE", nextAction: "Complete the current governed stage", targetAt: "2026-08-11T15:00:00.000Z",
    ownerUser: { id: "owner-1", name: "Inventory Owner" }, location: { id: "loc-1", name: "Minneapolis" },
    inventoryUnit: { id: "unit-1", inventoryNumber: "INV-1", vehicle: { id: "vehicle-1", vehicleNumber: "VEH-1001", year: 2023, make: "Toyota", model: "RAV4" } },
    repairOrder: stage === "PARTS_AND_REPAIR_EXECUTION" ? { id: "ro-1", repairOrderNumber: "RO-1" } : null
  };
}

describe("Inventory Planning review surface", () => {
  it("offers dealership and external custody locations", () => {
    const html = renderToStaticMarkup(<VehicleLocationEditor busy={false} current={null} locations={[{ id: "loc-1", code: "MSP", name: "Time Motor Sales — Minneapolis" }]} onCancel={() => undefined} onSave={async () => undefined} />);
    for (const text of ["Where is the vehicle?", "At one of our dealerships", "At an auction", "At an outside repair facility", "In transport", "At another external location", "Repair facility name", "Diego Auto Body", "Verification source", "Save verified location"]) expect(html).toContain(text);
  });

  it("opens with detailed receiving facts, mandatory initial QC, and a governed lifecycle start", () => {
    const html = renderToStaticMarkup(<InventoryPlanningReview eligibleUnit={{ id: "unit-1", inventoryNumber: "INV-1", locationId: "loc-1", vehicle: { id: "vehicle-1", vehicleNumber: "VEH-1001", year: 2023, make: "Toyota", model: "RAV4" } }} initial={projection} locations={[{ id: "loc-1", code: "MSP", name: "Minneapolis" }]} users={[{ id: "manager-1", name: "Inventory Manager" }]} />);

    for (const text of [
      "Receiving &amp; Initial Quality Inspection",
      "Detailed intake &amp; canonical vehicle facts",
      "Update current condition and vehicle needs",
      "Correct intake info",
      "Canonical origins preserved",
      "Review recalls and safety intelligence",
      "Current required receiving task",
      "Evidence / follow-up",
      "Completion standard",
      "Receive the vehicle and establish custody",
      "Complete the initial safety inspection",
      "Deferred",
      "Decide disposition and assign the next owner",
      "Receiving handoff narrative",
      "Exceptions, priorities, and technician starting context",
      "Two QC controls",
      "Open lifecycle",
      "Start governed lifecycle",
      "No workflow mutation yet"
    ]) expect(html).toContain(text);
    expect(html).toContain('<option value="PASS">Pass</option>');
    expect(html).toContain('<option value="CONCERN">Needs attention</option>');
    expect(html).not.toContain('disabled="" value="PASS"');
    expect(html).toContain("Edit current vehicle location");
    expect(html).toContain("Edit / verify");
    expect(html).toContain("2T3W1RFV4PW278629");
    expect(html).toContain("2023 Toyota RAV4");
    expect(html).toContain("/vehicles/vehicle-1/workbench");
    expect(html).toContain('href="/vehicles/360/vehicle-1?returnTo=%2Fvehicles%2Fvehicle-1%2Finventory-planning"');
    expect(html).toContain('href="/vehicles/360/vehicle-1?section=documents&amp;category=PHOTO&amp;returnTo=%2Fvehicles%2Fvehicle-1%2Finventory-planning"');
    expect(html).toContain('href="/vehicles/360/vehicle-1?section=intelligence&amp;intent=recalls&amp;returnTo=%2Fvehicles%2Fvehicle-1%2Finventory-planning"');
    const acquisitionHtml = renderToStaticMarkup(<InventoryPlanningReview initial={projection} users={[{ id: "manager-1", name: "Inventory Manager" }]} />);
    expect(acquisitionHtml).toContain("returnTo=%2Fvehicles%2Fvehicle-1%2Finventory-planning");
    expect(acquisitionHtml).toContain("InventoryUnit required—complete acquisition before starting the lifecycle");
    expect(acquisitionHtml).toContain("Establish acquisition first");
    expect(acquisitionHtml).not.toContain("Start governed lifecycle");
  });

  it.each([
    ["TRANSPORT_PLANNING", "Approve transport path"],
    ["RECON_PLAN_AND_APPROVAL", "Approve and release to Shop &amp; Parts"],
    ["PARTS_AND_REPAIR_EXECUTION", "Verify authoritative completion"],
    ["QUALITY_AND_SAFETY_VERIFICATION", "Pass all critical gates"],
    ["TITLE_DOCUMENT_READINESS", "Record title ready"],
    ["MERCHANDISING_AND_PRICING", "Verify merchandising package"],
    ["FRONTLINE_RELEASE_REVIEW", "Authorize exact package release"],
    ["FRONTLINE_READY", "Record observed availability"],
    ["HOLD", "Reopen for correction"]
  ])("renders the authoritative %s action", (stage, action) => {
    const html = renderToStaticMarkup(<InventoryPlanningReview initial={projection} initialWorkflow={workflow(stage)} users={[{ id: "owner-1", name: "Inventory Owner" }, { id: "reviewer-1", name: "Independent Reviewer" }]} />);
    expect(html).toContain(action);
    expect(html).toContain("version 4");
    expect(html).toContain("Pilot operations");
  });

  it("returns a newly created inventory-recon repair order to the exact vehicle plan", () => {
    const html = renderToStaticMarkup(<InventoryPlanningReview initial={projection} initialRepairOrderId="ro-created" initialWorkflow={workflow("RECON_PLAN_AND_APPROVAL")} users={[{ id: "owner-1", name: "Inventory Owner" }, { id: "reviewer-1", name: "Independent Reviewer" }]} />);
    expect(html).toContain('value="ro-created"');
    expect(html).toContain("returnTo=%2Fvehicles%2Fvehicle-1%2Finventory-planning");
  });

  it("exposes governed exception and recovery actions for later readiness stages", () => {
    const title = renderToStaticMarkup(<InventoryPlanningReview initial={projection} initialWorkflow={workflow("TITLE_DOCUMENT_READINESS")} users={[{ id: "owner-1", name: "Inventory Owner" }, { id: "reviewer-1", name: "Independent Reviewer" }]} />);
    const merch = renderToStaticMarkup(<InventoryPlanningReview initial={projection} initialWorkflow={workflow("MERCHANDISING_AND_PRICING")} users={[{ id: "owner-1", name: "Inventory Owner" }, { id: "reviewer-1", name: "Independent Reviewer" }]} />);
    expect(title).toContain("Place governed title hold");
    expect(merch).toContain("Record publication exception");
  });
});
