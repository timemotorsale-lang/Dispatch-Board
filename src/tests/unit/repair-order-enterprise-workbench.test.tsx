import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { RepairOrderEnterpriseWorkbench } from "@/features/inventory/repair-order-enterprise-workbench";

const order = {
  id: "ro-1", repairOrderNumber: "RO-20481", stage: "INTAKE", stageStartedAt: "2026-07-20T15:00:00Z", operatingState: "ACTIVE", openedAt: "2026-07-20T15:00:00Z", targetAt: "2026-07-20T18:00:00Z", nextAction: "Release to diagnosis", stateReason: null, version: 2,
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
    expect(html).toContain("This RO Version 2 preserves the intake concern and remains the governing record for technician evidence and findings.");
    expect(html).toContain("No repair is authorized until the estimate and approval are recorded");
    expect(html).toContain("Customer concern");
    expect(html).toContain("Reproduce symptom safely");
    expect(html).toContain("Measure friction material");
    expect(html).toContain("It does not assume the cause or authorize repair work");
    expect(html).toContain("Start Diagnosis");
    expect(html).toContain("Intake Completeness");
    expect(html).toContain("Flow Clock");
    expect(html).toContain("6/6");
    expect(html).toContain("What happens next");
    expect(html).toContain("Next step workspaces");
    expect(html).toContain("Repair planning");
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
    expect(html).toContain(
      "Retail appointment readiness does not apply. Diagnosis determines the repair scope.",
    );
    expect(html).toContain("Ready for diagnosis");
    expect(html).toContain("Inventory recon concern");
    expect(html).toContain("Inventory / work unit");
    expect(html).toContain("Inventory / Vehicle");
    expect(html).toContain("Internal recon approval is required before any repair work is performed");
  });

  it("shows the lifecycle strip at repair when the order stage has advanced without earlier planning artifacts", () => {
    const repairStageOrder = {
      ...order,
      stage: "REPAIR",
      customer: null,
      inventoryUnit: { inventoryNumber: "333586" },
      nextAction: "Confirm vendor estimate, approval documentation, and expected return.",
      vendorWorks: [
        {
          id: "vendor-work-1",
          vendorName: "Diego Auto Body",
          status: "AT_VENDOR",
          approvalStatus: "APPROVED",
          currentLocation: "Diego Auto Body",
          directFromSource: true,
          expectedReturnAt: "2026-08-14T15:57:00.000Z",
          nextAction: "Confirm vendor estimate, approval documentation, and expected return.",
          lastUpdateSummary: "Vehicle sent directly from Auction to Diego Auto Body.",
          scope: "Front-end body repair",
          sentFrom: "Auction",
          transportMethod: "Tow / carrier",
        },
      ],
      serviceVisit: {
        ...order.serviceVisit,
        concernSummary:
          "We recently bought the vehicle from the auction. The vehicle had sustained front end damage.",
      },
    };
    const html = renderToStaticMarkup(
      <RepairOrderEnterpriseWorkbench
        order={repairStageOrder}
        options={{ users: [{ id: "advisor-1", name: "Alex Advisor" }] }}
      />,
    );

    expect(html).toContain("<dt>Stage</dt><dd>Repair</dd>");
    expect(html).toContain("RO Version 2");
    expect(html).toContain("· Repair</span>");
    expect(html).toContain('class="reached"><i><svg');
    expect(html).toContain(">Repair</span>");
    expect(html).not.toContain('>Repair</span></span><span class="reached"');
    expect(html).toContain("Current physical location");
    expect(html).toContain("Diego Auto Body");
    expect(html).toContain("Home / accountable site");
    expect(html).toContain("Minneapolis");
    expect(html).toContain("Outside repair in progress");
    expect(html).toContain("Review vendor dispatch record");
    expect(html).toContain("Vendor dispatch reference");
    expect(html).toContain("source evidence from intake");
    expect(html).toContain("Confirm outside-vendor progress");
    expect(html).toContain("Return from vendor and verify quality");
    expect(html).toContain("Record vendor update");
    expect(html).toContain("Vendor / repair updates");
    expect(html).toContain("Completion");
    expect(html).toContain("Quality control");
    expect(html).toContain("Vehicle sent directly from Auction to Diego Auto Body.");
    expect(html).not.toContain("Ready for diagnosis");
    expect(html).not.toContain(">Start Diagnosis<");
    expect(html).not.toContain("Diagnose the concern");
  });

  it("shows dealership drop-off language and offsite vendor workflow when diagnosis is not the active path", () => {
    const vendorOrder = {
      ...order,
      stage: "AUTHORIZATION",
      customer: null,
      inventoryUnit: { inventoryNumber: "033428" },
      nextAction: "Confirm vendor estimate, approval documentation, and expected return.",
      vendorWorks: [
        {
          id: "vendor-work-2",
          vendorName: "Northside Garage",
          status: "ESTIMATE_NEEDED",
          approvalStatus: "NEEDS_DOCUMENTATION",
          currentLocation: "Northside Garage",
          directFromSource: false,
          expectedReturnAt: "2026-08-14T15:57:00.000Z",
          nextAction: "Confirm vendor estimate, approval documentation, and expected return.",
          lastUpdateSummary: "Vehicle was driven from the dealership to Northside Garage after intake review.",
          scope: "Mechanical diagnosis and outside repair review",
          sentFrom: "Dealership",
          transportMethod: "Dropped off / driven there",
        },
      ],
      serviceVisit: {
        ...order.serviceVisit,
        concernSummary: "The vehicle drives well but has a check engine light and related warning lights.",
      },
    };
    const html = renderToStaticMarkup(
      <RepairOrderEnterpriseWorkbench
        order={vendorOrder}
        options={{ users: [{ id: "advisor-1", name: "Alex Advisor" }] }}
      />,
    );

    expect(html).toContain("Dropped off / driven there from Dealership");
    expect(html).toContain("Offsite vendor path");
    expect(html).toContain("Vendor-managed while offsite");
    expect(html).toContain("Northside Garage");
    expect(html).toContain("Mechanical diagnosis and outside repair review");
    expect(html).not.toContain("Release the repair order to Planning &amp; Diagnosis");
  });

  it("routes vendor waiting-parts work into parts control", () => {
    const repairStageOrder = {
      ...order,
      stage: "REPAIR",
      stageStartedAt: "2026-08-01T15:00:00Z",
      customer: null,
      inventoryUnit: { inventoryNumber: "333586" },
      nextAction: "Confirm vendor estimate, approval documentation, and expected return.",
      partDemands: [{ id: "demand-1", quantityRequired: 2, quantityReserved: 0 }],
      vendorWorks: [
        {
          id: "vendor-work-1",
          vendorName: "Diego Auto Body",
          status: "WAITING_PARTS",
          approvalStatus: "APPROVED",
          currentLocation: "Diego Auto Body",
          directFromSource: true,
          expectedReturnAt: "2026-08-14T15:57:00.000Z",
          nextAction: "Vendor is waiting on the requested parts from us.",
          lastUpdateSummary: "Vendor sent the required parts list and cannot continue until parts are delivered.",
          scope: "Front-end body repair",
          sentFrom: "Auction",
          transportMethod: "Tow / carrier",
        },
      ],
      serviceVisit: {
        ...order.serviceVisit,
        concernSummary:
          "We recently bought the vehicle from the auction. The vehicle had sustained front end damage.",
      },
    };
    const html = renderToStaticMarkup(
      <RepairOrderEnterpriseWorkbench
        order={repairStageOrder}
        options={{ users: [{ id: "advisor-1", name: "Alex Advisor" }] }}
        relatedPurchaseOrders={[{
          createdAt: "2026-08-10T12:00:00Z",
          id: "po-1",
          orderedTotalCents: 45000,
          purchaseOrderNumber: "PO-1001",
          status: "DRAFT",
          vendor: { name: "Diego Auto Body" },
        }]}
      />,
    );

    expect(html).toContain("Approve purchase order for this vehicle");
    expect(html).toContain("PO-1001");
    expect(html).toContain("Approve purchase order");
    expect(html).toContain("Vendor is waiting on the requested parts from us.");
    expect(html).toContain("Vendor waiting on our parts");
    expect(html).toContain("Lead with parts receiving, approval, and delivery updates.");
    expect(html).toContain("Deliver the requested parts");
    expect(html).toContain("Update parts and delivery");
    expect(html).toContain("Parts &amp; delivery");
    expect(html).toContain("Open Parts Workspace");
    expect(html).toContain("/vehicles/service-close-parts?repairOrderId=ro-1");
    expect(html).not.toContain("Start Diagnosis");
  });

  it("treats offsite vendor work with unresolved parts demand as a parts action even before vendor status catches up", () => {
    const repairStageOrder = {
      ...order,
      stage: "REPAIR",
      customer: null,
      inventoryUnit: { inventoryNumber: "333586" },
      nextAction: "Confirm vendor estimate, approval documentation, and expected return.",
      partDemands: [{ id: "demand-1", quantityRequired: 3, quantityReserved: 1 }],
      vendorWorks: [
        {
          id: "vendor-work-1",
          vendorName: "Diego Auto Body",
          status: "AT_VENDOR",
          approvalStatus: "APPROVED",
          currentLocation: "Diego Auto Body",
          directFromSource: true,
          expectedReturnAt: "2026-08-14T15:57:00.000Z",
          nextAction: "Vendor is waiting on the remaining parts from us.",
          lastUpdateSummary: "Vendor cannot continue until the remaining parts are delivered.",
          scope: "Front-end body repair",
          sentFrom: "Auction",
          transportMethod: "Tow / carrier",
        },
      ],
      serviceVisit: {
        ...order.serviceVisit,
        concernSummary:
          "We recently bought the vehicle from the auction. The vehicle had sustained front end damage.",
      },
    };
    const html = renderToStaticMarkup(
      <RepairOrderEnterpriseWorkbench
        order={repairStageOrder}
        options={{ users: [{ id: "advisor-1", name: "Alex Advisor" }] }}
      />,
    );

    expect(html).toContain("Parts action required");
    expect(html).toContain("Open Parts Workspace");
    expect(html).toContain("Vendor is waiting on the remaining parts from us.");
    expect(html).not.toContain("Ready for diagnosis");
    expect(html).not.toContain(">Start Diagnosis<");
  });

  it("shows approval-complete guidance when purchase orders are already approved", () => {
    const repairStageOrder = {
      ...order,
      stage: "REPAIR",
      customer: null,
      inventoryUnit: { inventoryNumber: "333586" },
      vendorWorks: [
        {
          id: "vendor-work-1",
          vendorName: "Diego Auto Body",
          status: "AT_VENDOR",
          approvalStatus: "APPROVED",
          currentLocation: "Diego Auto Body",
          expectedReturnAt: "2026-08-14T15:57:00.000Z",
          nextAction: "Record receiving detail and deliver the approved parts to the vendor.",
          lastUpdateSummary: "Approval is already on file; the remaining blocker is operational receiving detail.",
        },
      ],
    };
    const html = renderToStaticMarkup(
      <RepairOrderEnterpriseWorkbench
        order={repairStageOrder}
        options={{ users: [{ id: "advisor-1", name: "Alex Advisor" }] }}
        relatedPurchaseOrders={[{
          createdAt: "2026-08-10T12:00:00Z",
          id: "po-1",
          orderedTotalCents: 45000,
          purchaseOrderNumber: "PO-1001",
          status: "APPROVED",
          vendor: { name: "Diego Auto Body" },
        }]}
      />,
    );

    expect(html).toContain("Manager approval is already on file");
    expect(html).toContain("Any remaining parts blocker is likely operational");
    expect(html).toContain("Open Parts Workspace");
    expect(html).not.toContain("Approve purchase order for this vehicle");
  });

  it("stays available when optional timing and transport fields are missing", () => {
    const sparseOrder = {
      ...order,
      stageStartedAt: null,
      nextAction: "",
      serviceVisit: {
        ...order.serviceVisit,
        concernSummary: "   ",
        transportMode: undefined,
      },
    };
    const html = renderToStaticMarkup(
      <RepairOrderEnterpriseWorkbench
        order={sparseOrder as typeof order}
        options={{ users: [{ id: "advisor-1", name: "Alex Advisor" }] }}
      />,
    );

    expect(html).toContain("Concern not recorded.");
    expect(html).toContain("Continue governed repair flow");
    expect(html).toContain("Not started");
    expect(html).toContain("Not recorded");
  });
});
