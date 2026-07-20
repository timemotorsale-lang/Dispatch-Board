import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CompactVehicleLifecycleCard, ExpandedVehicleCommandCard } from "@/features/inventory/vehicle-lifecycle-card";
import { buildVehicleLifecycleCardProjection } from "@/server/inventory-execution/vehicle-card-projection";

const card = buildVehicleLifecycleCardProjection({
  freshness: "PARTIAL",
  inventoryUnit: { id: "unit-1", inventoryNumber: "TMS19045", lifecycleStage: "RECONDITIONING", operatingState: "BLOCKED", ageDays: 18, overdue: true, nextAction: "Approve alternate brake vendor", stateReason: "Brake parts ETA exceeds target", targetAt: "2026-07-20T18:00:00.000Z", exposureCents: 12_450_00, owner: "Shop Manager", location: "Main Shop", vehicle: { id: "vehicle-1", vehicleNumber: "V-1", vin: "4T1B11HK6KU123456", year: 2019, make: "Toyota", model: "Camry SE" } },
  context: { tasks: [{ id: "task-current", title: "Brake replacement", status: "IN_PROGRESS" }, { id: "task-next", title: "Quality control", status: "NOT_STARTED" }], repairOrders: [{}], decisions: [{}], auditEvents: [{ id: "audit-1", occurredAt: "2026-07-19T17:00:00Z", eventType: "WORK_BLOCKED", reason: "Parts ETA confirmed." }] }
});

describe("official Inventory EOS Vehicle Lifecycle Card", () => {
  it("projects canonical identity, one current and one staged action, and honest unavailable facts", () => {
    expect(card.identity).toMatchObject({ vehicleId: "vehicle-1", inventoryUnitId: "unit-1", inventoryNumber: "TMS19045" });
    expect(card.currentWork?.taskId).toBe("task-current");
    expect(card.stagedWork?.taskId).toBe("task-next");
    expect(card.financial.find(item => item.label === "Recon")?.value).toBe("Unavailable");
    expect(card.context.freshness).toBe("PARTIAL");
  });

  it("renders the approved expanded hierarchy and governed action set", () => {
    const html = renderToStaticMarkup(<ExpandedVehicleCommandCard card={card} />);
    for (const required of ["Flow Clock", "Active Work", "Approved Wait", "Unclassified Delay", "Current Constraint", "Do This Now", "Vehicle Execution Health", "Open Vehicle Workbench", "Review Approval", "Resolve Blocker", "Escalate"]) expect(html).toContain(required);
    expect(html).toContain("not an employee score");
    expect(html).not.toContain("Update Stage");
  });

  it("keeps the compact card execution-first and links to the same canonical workbench", () => {
    const html = renderToStaticMarkup(<CompactVehicleLifecycleCard card={card} />);
    expect(html).toContain("Do This Now");
    expect(html).toContain("Brake parts ETA exceeds target");
    expect(html).toContain("/vehicles/vehicle-1/workbench?inventoryUnitId=unit-1");
    expect(html).not.toContain("Financial Exposure");
  });
});
