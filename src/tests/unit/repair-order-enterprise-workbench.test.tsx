import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { RepairOrderEnterpriseWorkbench } from "@/features/inventory/repair-order-enterprise-workbench";

const order = {
  id: "ro-1", repairOrderNumber: "RO-20481", stage: "INTAKE", operatingState: "ACTIVE", openedAt: "2026-07-20T15:00:00Z", targetAt: "2026-07-20T18:00:00Z", nextAction: "Release to diagnosis", stateReason: null, version: 2,
  vehicle: { id: "vehicle-1", make: "Ford", model: "F-150", vehicleNumber: "VEH-1", vin: "1FTFW1E57RKE12345", year: 2024 }, customer: { displayName: "Jordan Customer" }, inventoryUnit: null, ownerUser: { id: "advisor-1", name: "Alex Advisor" }, location: { id: "location-1", name: "Minneapolis" },
  serviceVisit: { appointmentId: "appointment-1", arrivedAt: "2026-07-20T15:00:00Z", concernSummary: "Customer reports a grinding noise from the front brakes when stopping.", consentStatus: "PENDING", intakeNotes: null, keyTag: "1187", keysReceivedCount: 1, promisedAt: null, readinessSnapshotId: "snapshot-1", transportMode: "DROP_OFF" },
  inspectionVersions: [], diagnosisVersions: [], estimateVersions: [], repairJobs: [], partDemands: [],
};

describe("enterprise repair-order workbench", () => {
  it("renders concern-centered diagnostic planning and governed downstream gates", () => {
    const html = renderToStaticMarkup(<RepairOrderEnterpriseWorkbench order={order} options={{ users: [{ id: "advisor-1", name: "Alex Advisor" }, { id: "tech-1", name: "Walter Mechanic" }] }} />);

    expect(html).toContain("Repair Order Workbench");
    expect(html).toContain("RO-20481");
    expect(html).toContain("Authoritative Repair Order");
    expect(html).toContain("View RO");
    expect(html).toContain("Print RO");
    expect(html).toContain('href="/api/repair-orders/ro-1/print"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain("RO Version 2");
    expect(html).toContain("This RO Version 2 is the technician&#x27;s source for the vehicle and concern");
    expect(html).toContain("No repair is authorized until the estimate and approval are recorded");
    expect(html).toContain("Customer concern · preserved from intake");
    expect(html).toContain("Reproduce symptom safely");
    expect(html).toContain("Measure friction material");
    expect(html).toContain("It does not assume the cause or authorize repair work");
    expect(html).toContain("Start Diagnosis");
    expect(html).toContain("Intake Completeness");
    expect(html).toContain("6/6");
    expect(html).toContain("Start Diagnosis");
    expect(html).toContain("What happens next");
    expect(html).toContain("returnTo=%2Fvehicles%2Frepair-workbench%3FrepairOrderId%3Dro-1");
    expect(html).toContain("Customer authorization is required before any repair work is performed");
    expect(html).toContain('href="#diagnosis"');
    expect(html).toContain('id="diagnosis"');
    expect(html).toContain('href="#timeline"');
    expect(html).toContain('id="timeline"');
    expect(html).toContain("Not yet recorded");
    expect(html).toContain('aria-label="Accountable owner or technician"');
    expect(html).toContain("Assigned to Alex Advisor");
    expect(html).toContain("Alex Advisor is already assigned. Select a different person to change the assignment.");
    expect(html).toContain("Walter Mechanic");
  });

  it("uses the simple inventory path without requesting customer readiness", () => {
    const inventoryOrder = { ...order, customer: null, inventoryUnit: { inventoryNumber: "033428" }, serviceVisit: { ...order.serviceVisit, readinessSnapshotId: null } };
    const html = renderToStaticMarkup(<RepairOrderEnterpriseWorkbench order={inventoryOrder} options={{ users: [{ id: "advisor-1", name: "Alex Advisor" }] }} />);

    expect(html).toContain("Inventory path");
    expect(html).toContain("Customer appointment readiness does not apply");
    expect(html).toContain("No customer-readiness step is required for dealership inventory");
    expect(html).toContain("Ready for diagnosis");
  });
});
