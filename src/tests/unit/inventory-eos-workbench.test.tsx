import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { VehicleExecutionWorkbench } from "@/features/inventory/vehicle-execution-workbench";
import { buildVehicleWorkbenchOverview } from "@/server/inventory-execution/workbench-algorithms";
import type { VehicleExecutionWorkbenchProjection } from "@/server/inventory-execution/workbench-service";

function projection(
  overrides: Partial<VehicleExecutionWorkbenchProjection["work"]> = {},
  roleLenses: VehicleExecutionWorkbenchProjection["roleLenses"] = ["Overview", "Inventory Manager", "Technician", "Parts"]
) {
  const base = {
    contractVersion: "inventory-eos-workbench/v1", generatedAt: "2026-07-19T18:00:00Z", roleLenses,
    identity: { id: "vehicle-1", vehicleNumber: "TMS19045", vin: "4T1B11HK6KU123456", vinState: "VERIFIED", stockNumber: "TMS19045", year: 2019, make: "Toyota", model: "Camry", color: null, licensePlate: null, status: "ACTIVE", version: 2 },
    operation: { owner: null, location: { id: "loc-1", name: "Main Shop" }, stage: "RECONDITIONING", operatingState: "ACTIVE", nextAction: "Replace brake pads", targetAt: "2026-07-20T18:00:00Z", latestOdometer: null, risks: [] },
    work: { status: "CONNECTED", unavailableReason: null, current: { id: "packet-1", state: "CURRENT", stageCode: "RECONDITIONING", purpose: "Complete approved brake repair", nextAction: "Replace brake pads", definitionOfDone: "Repair verified and evidence attached", readiness: "READY", targetAt: "2026-07-20T18:00:00Z", estimatedMinutes: 45, readinessSnapshot: { items: [{ code: "PARTS", label: "Parts ready", source: "Parts ledger", satisfied: true }] }, dependencySnapshot: { items: [] }, evidenceRequirements: { items: [{ code: "PHOTO", label: "Completion photo", source: "Evidence policy", satisfied: false }] }, task: { id: "task-1", title: "Brake repair", assignedUser: { id: "tech-1", name: "Technician" } } }, staged: { id: "packet-2", state: "STAGED", readiness: "READY", targetAt: "2026-07-20T20:00:00Z", nextAction: "Perform QC", task: { id: "task-2", title: "Quality control" } }, other: [], ...overrides },
    workOrders: { allowed: true, items: [{ id: "ro-1", repairOrderNumber: "RO-101", stage: "REPAIR", operatingState: "ACTIVE", jobs: [] }] },
    parts: { allowed: true, demands: [{ id: "demand-1", partId: "part-1", part: { id: "part-1", partNumber: "PAD-100", description: "Brake pads" }, repairOrderNumber: "RO-101", quantityRequired: 2, quantityReserved: 1, status: "RESERVED", requiredAt: "2026-07-19T19:00:00Z" }], custody: [{ id: "custody-1", partId: "part-1", type: "ISSUE" }] },
    evidence: { allowed: true, items: [{ id: "evidence-link-1", category: "REPAIR", evidenceObject: { fileName: "brake.jpg", status: "AVAILABLE", uploadedByUser: { name: "Technician" } } }] },
    activity: [{ id: "event-1", occurredAt: new Date("2026-07-19T17:00:00Z"), source: "TASK", type: "STARTED", title: "Brake repair started", detail: "Technician accepted work.", subjectType: "TASK", subjectId: "task-1" }],
    audit: { allowed: true, items: [] },
    links: { vehicle360: "/vehicles/360/vehicle-1", evidence: "/vehicles/360/vehicle-1?section=documents", parts: "/vehicles/parts-operations?vehicleId=vehicle-1", tasks: "/tasks?vehicleId=vehicle-1" }
  } as unknown as VehicleExecutionWorkbenchProjection;
  return {
    ...base,
    overview: buildVehicleWorkbenchOverview({
      activity: base.activity as unknown as Record<string, unknown>[],
      evidence: base.evidence as unknown as { allowed: boolean; items: Record<string, unknown>[] },
      identity: base.identity as unknown as Record<string, unknown>,
      links: base.links,
      operation: base.operation as unknown as Record<string, unknown>,
      parts: base.parts as unknown as { allowed: boolean; demands: Record<string, unknown>[] },
      work: base.work as unknown as { current: Record<string, unknown> | null; staged: Record<string, unknown> | null; status: string; unavailableReason: string | null },
      workOrders: base.workOrders as unknown as { allowed: boolean; items: Record<string, unknown>[] }
    })
  } as unknown as VehicleExecutionWorkbenchProjection;
}

describe("official Vehicle Execution Workbench", () => {
  it("opens first to the neutral vehicle home with role lenses and one-click work areas", () => {
    const html = renderToStaticMarkup(<VehicleExecutionWorkbench initial={projection()} />);
    for (const value of ["Vehicle Workbench", "View as:", "Neutral vehicle home", "Do This Now", "Replace brake pads", "Current situation", "Lifecycle Planning", "Repair &amp; Shop", "Parts Readiness", "Evidence, files &amp; comments", "Inventory Manager", "Technician", "Return rule"]) expect(html).toContain(value);
    expect(html).toContain("/vehicles/vehicle-1/inventory-planning");
    expect(html).toContain("repairOrderId=ro-1&amp;vehicleId=vehicle-1");
    expect(html).toContain("returnTo=%2Fvehicles%2Fvehicle-1%2Fworkbench");
  });

  it("renders the approved technician role landing with stalled-work accountability guidance", () => {
    const html = renderToStaticMarkup(<VehicleExecutionWorkbench initial={projection()} initialRoleLens="Technician" />);
    for (const value of ["Technician View", "Current assignment", "Readiness before work", "Required evidence", "Stalled / incomplete work details", "The system measures work state and evidence, not personal blame", "Open incomplete update form", "Attach evidence"]) expect(html).toContain(value);
  });

  it("shows the Parts lens as the same canonical work-order parts records", () => {
    const html = renderToStaticMarkup(<VehicleExecutionWorkbench initial={projection()} initialRoleLens="Parts" />);

    expect(html).toContain("Parts lens shows canonical work-order parts records.");
    expect(html).toContain("Canonical Parts Records");
    expect(html).toContain("Same demand records shown in Parts Workspace");
    expect(html).toContain("PAD-100");
    expect(html).toContain("1/2 reserved");
    expect(html).toContain("RO-101");
    expect(html).toContain("1 custody event(s)");
  });

  it("only offers role lenses granted by the authenticated user's actual roles", () => {
    const html = renderToStaticMarkup(
      <VehicleExecutionWorkbench initial={projection({}, ["Overview", "Inventory Manager"])} initialRoleLens="General Manager" />
    );

    expect(html).toContain(">Inventory Manager</button>");
    expect(html).not.toContain(">General Manager</button>");
    expect(html).toContain("Neutral vehicle home.");
  });

  it("shows a truthful unavailable state instead of inventing work", () => {
    const html = renderToStaticMarkup(<VehicleExecutionWorkbench initial={projection({ status: "UNAVAILABLE", unavailableReason: "Inventory Work Packet migration is not applied in this environment.", current: null, staged: null })} />);
    expect(html).toContain("Review unavailable work source");
    expect(html).toContain("migration is not applied");
    expect(html).not.toContain("Start Work</button>");
  });
});
