import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { OutsideRepairWorkPanel } from "@/features/advisor/outside-repair-work-panel";
import { RepairOrderEnterpriseWorkbench } from "@/features/inventory/repair-order-enterprise-workbench";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const order = {
  id: "ro-1", repairOrderNumber: "RO-20481", stage: "INTAKE", stageStartedAt: "2026-07-20T15:00:00Z", operatingState: "ACTIVE", openedAt: "2026-07-20T15:00:00Z", targetAt: "2026-07-20T18:00:00Z", nextAction: "Release to diagnosis", stateReason: null, version: 2,
  vehicle: { id: "vehicle-1", color: null, make: "Ford", model: "F-150", vehicleNumber: "VEH-1", version: 4, vin: "1FTFW1E57RKE12345", year: 2024, custodyEvents: [] }, customer: { displayName: "Jordan Customer" }, inventoryUnit: null, ownerUser: { id: "advisor-1", name: "Alex Advisor" }, location: { id: "location-1", name: "Minneapolis" },
  serviceVisit: { appointmentId: "appointment-1", arrivedAt: "2026-07-20T15:00:00Z", concernSummary: "Customer reports a grinding noise from the front brakes when stopping.", consentStatus: "PENDING", intakeNotes: null, keyTag: "1187", keysReceivedCount: 1, promisedAt: null, readinessSnapshotId: "snapshot-1", transportMode: "DROP_OFF" },
  inspectionVersions: [], diagnosisVersions: [], estimateVersions: [], repairJobs: [], partDemands: [],
};

describe("enterprise repair-order workbench", () => {
  it("renders the simplified vehicle summary card with always-visible detail panels and a full-detail link", () => {
    const html = renderToStaticMarkup(
      <RepairOrderEnterpriseWorkbench
        order={order}
        options={{ users: [{ id: "advisor-1", name: "Alex Advisor" }, { id: "tech-1", name: "Walter Mechanic" }] }}
      />,
    );

    expect(html).toContain("Repair Order Workbench");
    expect(html).toContain("Vehicle summary card");
    expect(html).toContain("Recon progress");
    expect(html).toContain("Full repair order details");
    expect(html).toContain("Vehicle information");
    expect(html).toContain("Color not recorded");
    expect(html).toContain("Vehicle color");
    expect(html).toContain("Save color");
    expect(html).toContain("Vendor progress");
    expect(html).toContain("Approved work");
    expect(html).toContain("Repair outcome");
    expect(html).toContain("Recon Report");
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain("Inventory Lifecycle");
    expect(html).not.toContain("Vehicle recon progress report");
    expect(html).not.toContain("Stall / blocker");
    expect(html).not.toContain("Next move");
    expect(html).not.toContain("Stage clock");
    expect(html).not.toContain("Recent progress");
    expect(html).toContain("View full details");
    expect(html).toContain("fullDetails=1");
    expect(html).not.toContain("summaryCardPreview");
    expect(html).not.toContain("Live summary-card preview");
    expect(html).not.toContain("Authoritative Repair Order");
    expect(html).not.toContain("Location / workflow correction");
  });

  it("keeps the summary lifecycle aligned with the detailed lifecycle stage aliases", () => {
    const readyForRepairOrder = {
      ...order,
      stage: "READY_FOR_REPAIR",
      nextAction: "Manage repair readiness",
      inventoryUnit: { inventoryNumber: "B10592" },
      customer: null,
    };

    const html = renderToStaticMarkup(
      <RepairOrderEnterpriseWorkbench
        order={readyForRepairOrder}
        options={{ users: [{ id: "advisor-1", name: "Alex Advisor" }] }}
      />,
    );

    expect(html).toContain('<span class="done"><i>');
    expect(html).toContain("Estimate</span>");
    expect(html).toContain('<span class="current"><i>5</i>Repair</span>');
    expect(html).toContain('<span class="next"><i>6</i>Quality Check</span>');
    expect(html).toContain("Inventory Lifecycle");
    expect(html).toContain("Shop &amp; Recon");
    expect(html).toContain("/vehicles/vehicle-1/inventory-planning?repairOrderId=ro-1");
    expect(html).toContain("/vehicles/shop-recon?returnTo=");
    expect(html).not.toContain("Final QC</span>");
  });

  it("renders concern-centered diagnostic planning and governed downstream gates", () => {
    const html = renderToStaticMarkup(<RepairOrderEnterpriseWorkbench fullDetailMode order={order} options={{ users: [{ id: "advisor-1", name: "Alex Advisor" }, { id: "tech-1", name: "Walter Mechanic" }] }} />);

    expect(html).toContain("Repair Order Workbench");
    expect(html).toContain("RO-20481");
    expect(html).toContain("Authoritative Repair Order");
    expect(html).not.toContain("Vehicle summary card");
    expect(html).toContain("Location / workflow correction");
    expect(html).toContain("Back to summary card");
    expect(html).toContain('href="/vehicles/repair-workbench?repairOrderId=ro-1&amp;vehicleId=vehicle-1"');
    expect(html).toContain("Outside vendor next step");
    expect(html).toContain("Document the next vendor repair");
    expect(html).toContain("Open vendor documentation form");
    expect(html).toContain("View RO");
    expect(html).toContain("Print RO");
    expect(html).toContain("Recon Report");
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('href="#recon-report"');
    expect(html).not.toContain("Vehicle recon progress report");
    expect(html).not.toContain("Stall / blocker");
    expect(html).not.toContain("Next move");
    expect(html).not.toContain("Recent progress");
    expect(html).toContain('href="/api/repair-orders/ro-1/print"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain("RO Version 2");
    expect(html).toContain("Vehicle color");
    expect(html).toContain("Save color");
    expect(html).toContain("<dt>Color</dt><dd>Not recorded</dd>");
    expect(html).toContain("This RO Version 2 preserves the intake concern and remains the governing record for technician evidence and findings.");
    expect(html).toContain("No repair is authorized until the estimate and approval are recorded");
    expect(html).toContain("Customer concern");
    expect(html).toContain("Reproduce symptom safely");
    expect(html).toContain("Measure friction material");
    expect(html).toContain("It does not assume the cause or authorize repair work");
    expect(html).toContain("Initial recon inspection");
    expect(html).toContain("Capture evidence before estimate and approval");
    expect(html).toContain("Diagnostic codes");
    expect(html).toContain("Body and exterior");
    expect(html).toContain("Mechanical findings");
    expect(html).toContain("Photos and evidence");
    expect(html).toContain("Review only");
    expect(html).toContain("Review Work Plan Draft");
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

  it("suggests structured evidence for dash codes, brake vibration, and body damage", () => {
    const reconOrder = {
      ...order,
      customer: null,
      inventoryUnit: { inventoryNumber: "049649" },
      serviceVisit: {
        ...order.serviceVisit,
        concernSummary:
          "All kinds of lights on the dash. Brakes vibrate when the brake pedal is pressed. Rear bumper cover is cracked and needs replacement.",
      },
    };
    const html = renderToStaticMarkup(<RepairOrderEnterpriseWorkbench fullDetailMode order={reconOrder} options={{ users: [{ id: "advisor-1", name: "Alex Advisor" }] }} />);

    expect(html).toContain("Dash or module code evidence recorded");
    expect(html).toContain("Attach scan result, active/history status, and warning-light photo.");
    expect(html).toContain("Brake vibration or braking concern");
    expect(html).toContain("Record road-test result, pad/rotor measurements, and repair recommendation.");
    expect(html).toContain("Visible exterior damage");
    expect(html).toContain("Capture panel location, repair vs replacement decision, and before photos.");
    expect(html).toContain("Do not move to approval until safety evidence is reviewed.");
    expect(html).toContain("Photo upload will be wired after this review surface is approved.");
  });

  it("uses the simple inventory path without requesting customer readiness", () => {
    const inventoryOrder = { ...order, customer: null, inventoryUnit: { inventoryNumber: "033428" }, serviceVisit: { ...order.serviceVisit, readinessSnapshotId: null } };
    const html = renderToStaticMarkup(<RepairOrderEnterpriseWorkbench fullDetailMode order={inventoryOrder} options={{ users: [{ id: "advisor-1", name: "Alex Advisor" }] }} />);

    expect(html).toContain("Inventory path");
    expect(html).toContain(
      "Retail appointment readiness does not apply. Diagnosis determines the repair scope.",
    );
    expect(html).toContain("Ready for diagnosis");
    expect(html).toContain("Inventory recon concern");
    expect(html).toContain("Inventory / work unit");
    expect(html).toContain("Inventory / Vehicle");
    expect(html).toContain("Internal recon approval is required before any repair work is performed");
    expect(html).toContain("Inventory Lifecycle");
    expect(html).toContain("Shop &amp; Recon");
    expect(html).toContain("/vehicles/vehicle-1/inventory-planning?repairOrderId=ro-1");
  });

  it("uses vehicle custody as the synchronized physical location even when this RO has no vendor row", () => {
    const custodyOrder = {
      ...order,
      vehicle: {
        ...order.vehicle,
        custodyEvents: [{ custodianType: "VENDOR", eventType: "TRANSPORT_DELIVERY", occurredAt: "2026-08-09T03:19:00Z", positionLabel: "Northside Garage", location: null }]
      }
    };
    const html = renderToStaticMarkup(<RepairOrderEnterpriseWorkbench fullDetailMode order={custodyOrder} options={{ users: [{ id: "advisor-1", name: "Alex Advisor" }] }} />);

    expect(html).toContain("Current physical location");
    expect(html).toContain("Northside Garage");
    expect(html).toContain("Home / accountable site");
    expect(html).toContain("Minneapolis");
  });

  it("keeps the active outside-vendor location ahead of a later generic custody snapshot", () => {
    const vendorLocatedOrder = {
      ...order,
      stage: "REPAIR",
      nextAction: "Confirm vendor estimate, approval documentation, and expected return.",
      vehicle: {
        ...order.vehicle,
        custodyEvents: [{ custodianType: "LOCATION", eventType: "STATUS_CHANGE", occurredAt: "2026-08-25T11:30:00Z", positionLabel: "Time Motor Sales — Minneapolis", location: null }]
      },
      vendorWorks: [
        {
          id: "vendor-work-simba",
          vendorName: "Simba Collision",
          status: "AT_VENDOR",
          approvalStatus: "NEEDS_DOCUMENTATION",
          currentLocation: "Simba Collision",
          directFromSource: false,
          expectedReturnAt: "2026-08-27T15:00:00.000Z",
          nextAction: "Confirm Simba Collision receipt and estimate timing.",
          lastUpdateSummary: "Vehicle assigned back to outside vendor.",
          scope: "Body and steering-column break-in repair.",
          sentFrom: "Dealership",
          transportMethod: "Tow / carrier",
        },
      ],
    };
    const html = renderToStaticMarkup(<RepairOrderEnterpriseWorkbench fullDetailMode order={vendorLocatedOrder} options={{ users: [{ id: "advisor-1", name: "Alex Advisor" }] }} />);

    expect(html).toContain("Current physical location");
    expect(html).toContain("Simba Collision");
    expect(html).toContain("Outside vendor workflow is active");
    expect(html).not.toContain("Time Motor Sales — Minneapolis");
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
        fullDetailMode
        order={repairStageOrder}
        options={{ users: [{ id: "advisor-1", name: "Alex Advisor" }] }}
      />,
    );

    expect(html).toContain("RO Version 2");
    expect(html).toContain("· Repair</span>");
    expect(html).toContain("Quality Check");
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
    expect(html).toContain("Document vendor repair progress");
    expect(html).toContain("Vendor repair progress");
    expect(html).toContain("Completion");
    expect(html).toContain("Quality control");
    expect(html).toContain("Vehicle sent directly from Auction to Diego Auto Body.");
    expect(html).not.toContain("Ready for diagnosis");
    expect(html).not.toContain(">Start Diagnosis<");
    expect(html).not.toContain("Diagnose the concern");
  });

  it("routes the active second vendor to repair-progress documentation instead of diagnosis", () => {
    const secondVendorOrder = {
      ...order,
      stage: "REPAIR",
      customer: null,
      inventoryUnit: { inventoryNumber: "033428" },
      vendorWorks: [
        {
          id: "vendor-work-1",
          vendorName: "Northside Garage",
          status: "RETURNED",
          approvalStatus: "PENDING",
          currentLocation: "Dealership",
          nextAction: "Document the follow-up vendor repair path.",
          lastUpdateSummary: "Northside Garage returned the vehicle unfinished.",
          scope: "Timing chain replacement",
          sentFrom: "Dealership",
        },
        {
          id: "vendor-work-2",
          vendorName: "Capable Auto Repair",
          status: "AT_VENDOR",
          approvalStatus: "APPROVED",
          currentLocation: "Capable Auto Repair",
          nextAction: "Confirm repair progress and expected return.",
          lastUpdateSummary: "The follow-up vendor has custody and is repairing the timing chain.",
          scope: "Timing chain replacement",
          sentFrom: "Dealership",
        },
      ],
    };
    const html = renderToStaticMarkup(<RepairOrderEnterpriseWorkbench fullDetailMode order={secondVendorOrder} options={{ users: [{ id: "advisor-1", name: "Alex Advisor" }] }} />);

    expect(html).toContain("Capable Auto Repair");
    expect(html).toContain("Document vendor repair progress");
    expect(html).toContain("Vendor repair progress");
    expect(html).toContain('href="#vendor-repair-progress"');
    expect(html).toContain('id="vendor-repair-progress"');
    expect(html).toContain("Document repair progress and move to the next stage");
    expect(html).not.toContain(">Start Diagnosis<");
  });

  it("opens a simple vendor-complete path for arranging return before QC", () => {
    const html = renderToStaticMarkup(
      <OutsideRepairWorkPanel
        accountableLocation="Minneapolis"
        defaultOpen={true}
        repairOrderId="ro-1"
        work={{
          id: "vendor-work-2",
          vendorId: "vendor-2",
          vendorName: "Capable Auto Repair",
          workType: "MECHANICAL_SUBLET",
          status: "AT_VENDOR",
          approvalStatus: "APPROVED",
          approvedAmountCents: null,
          currentLocation: "Capable Auto Repair",
          directFromSource: false,
          estimateAmountCents: null,
          events: [],
          expectedReturnAt: null,
          keysCustodian: "Vendor",
          lastUpdateSummary: "The follow-up vendor has custody and is repairing the timing chain.",
          nextAction: "Confirm repair progress and expected return.",
          nextFollowUpAt: null,
          scope: "Timing chain replacement",
          sentAt: "2026-08-24T21:30:00.000Z",
          sentFrom: "Dealership",
          supplementalAmountCents: null,
          transportMethod: "Internal transport",
        }}
      />,
    );

    expect(html).toContain("Repair outcome and vehicle return");
    expect(html).toContain("Vendor fixed car - arrange return");
    expect(html).toContain("Once the vehicle is received, release it to QC for pass/fail.");
    expect(html).toContain("What was repaired");
    expect(html).toContain("Repair outcome");
    expect(html).toContain("Final / approved cost");
    expect(html).toContain("Approved by");
    expect(html).toContain("Next step / action");
    expect(html).toContain("Move repair to next stage");
    expect(html).toContain("Capable Auto Repair");
  });

  it("keeps vendor return documentation connected to a Final QC link", () => {
    const returnReadyOrder = {
      ...order,
      stage: "REPAIR",
      operatingState: "WAITING",
      nextAction: "Arrange vehicle return from Northside Garage to Time Motor Sales - Minneapolis. After receipt, release to dealership QC for pass/fail.",
      vendorWorks: [{
        id: "vendor-work-return-ready",
        vendorName: "Northside Garage",
        status: "READY_FOR_PICKUP",
        approvalStatus: "APPROVED",
        approvedAmountCents: 95000,
        currentLocation: "Northside Garage",
        directFromSource: false,
        events: [],
        expectedReturnAt: null,
        keysCustodian: "Vendor",
        lastUpdateSummary: "Northside Garage completed the approved repair. Arrange return transportation before dealership QC.",
        nextAction: "Arrange vehicle return from Northside Garage to Time Motor Sales - Minneapolis. After receipt, release to dealership QC for pass/fail.",
        nextFollowUpAt: null,
        scope: "Timing chain repair completed.",
        sentAt: "2026-08-24T21:30:00.000Z",
        sentFrom: "Dealership",
        supplementalAmountCents: null,
        transportMethod: "Return transport to schedule",
        vendorId: "vendor-1",
        workType: "MECHANICAL_SUBLET",
      }],
    };

    const html = renderToStaticMarkup(
      <RepairOrderEnterpriseWorkbench
        fullDetailMode
        order={returnReadyOrder}
        options={{ users: [{ id: "advisor-1", name: "Alex Advisor" }] }}
      />,
    );

    expect(html).toContain("Document vendor repair progress");
    expect(html).toContain("Open Final QC");
    expect(html).toContain("/vehicles/quality-control?repairOrderId=ro-1");
    expect(html).toContain("After receipt, release to dealership QC for pass/fail.");
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
        fullDetailMode
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
        fullDetailMode
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
        fullDetailMode
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
        fullDetailMode
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
        fullDetailMode
        order={sparseOrder as typeof order}
        options={{ users: [{ id: "advisor-1", name: "Alex Advisor" }] }}
      />,
    );

    expect(html).toContain("Concern not recorded.");
    expect(html).toContain("Continue governed repair flow");
    expect(html).toContain("Not started");
    expect(html).toContain("Not recorded");
  });

  it("shows a same-RO follow-up repair path after outside-vendor QC fails", () => {
    const vendorFailedOrder = {
      ...order,
      stage: "QUALITY_CONTROL",
      version: 10,
      nextAction: "Review the returned vehicle and decide the next approved repair path.",
      serviceVisit: {
        ...order.serviceVisit,
        concernSummary: "Outer door handle and upper/lower steering column covers were not completed by outside vendor.",
      },
      vendorWorks: [{
        id: "vendor-work-qc",
        vendorName: "Simba Collision",
        status: "QC_REQUIRED",
        approvalStatus: "APPROVED",
        currentLocation: "Dealership",
        directFromSource: false,
        expectedReturnAt: "2026-08-25T12:00:00.000Z",
        nextAction: "Create a follow-up repair scope for the incomplete vendor work.",
        lastUpdateSummary: "Dealership QC failed the returned outside-vendor repair: outer door handle and steering column covers were not completed.",
        scope: "Replace outer door handle and upper/lower steering column covers.",
        sentAt: "2026-08-24T21:30:00.000Z",
        sentFrom: "Dealership",
        transportMethod: "Tow",
      }],
    };

    const html = renderToStaticMarkup(
      <RepairOrderEnterpriseWorkbench
        fullDetailMode
        order={vendorFailedOrder}
        options={{ users: [{ id: "advisor-1", name: "Alex Advisor" }] }}
      />,
    );

    expect(html).toContain("Vendor QC failed");
    expect(html).toContain("Vendor QC failed - create internal completion work");
    expect(html).toContain("Create follow-up repair scope");
    expect(html).toContain("Create the missing completion work on this same RO");
    expect(html).toContain("Do not open a detached RO");
    expect(html).toContain("Follow-up repair scope");
    expect(html).toContain("/vehicles/shop-planning?repairOrderId=ro-1");
    expect(html).toContain("vendorFollowUp=1");
    expect(html).toContain("repair-planning-step-2");
  });

  it("releases a completed returned vendor repair to Final QC", () => {
    const returnedCompleteOrder = {
      ...order,
      stage: "QUALITY_CONTROL",
      version: 11,
      nextAction: "Release the returned vehicle to dealership QC for pass/fail.",
      serviceVisit: {
        ...order.serviceVisit,
        concernSummary: "Second vendor completed the timing chain repair and returned the vehicle.",
      },
      vendorWorks: [{
        id: "vendor-work-complete",
        vendorName: "Capable Auto Repair",
        status: "RETURNED",
        approvalStatus: "APPROVED",
        approvedAmountCents: 165000,
        currentLocation: "Dealership",
        directFromSource: false,
        events: [],
        expectedReturnAt: "2026-08-25T12:00:00.000Z",
        keysCustodian: "Dealership",
        lastUpdateSummary: "Capable Auto Repair completed the approved repair and returned the vehicle.",
        nextAction: "Release the returned vehicle to dealership QC for pass/fail.",
        nextFollowUpAt: null,
        scope: "Timing chain replacement completed.",
        sentAt: "2026-08-24T21:30:00.000Z",
        sentFrom: "Dealership",
        supplementalAmountCents: null,
        transportMethod: "Tow",
        vendorId: "vendor-2",
        workType: "MECHANICAL_SUBLET",
      }],
    };

    const html = renderToStaticMarkup(
      <RepairOrderEnterpriseWorkbench
        fullDetailMode
        order={returnedCompleteOrder}
        options={{ users: [{ id: "advisor-1", name: "Alex Advisor" }] }}
      />,
    );

    expect(html).toContain("Ready for Final QC");
    expect(html).toContain("Release to Final QC");
    expect(html).toContain("Open Final QC");
    expect(html).toContain("Record the Final QC pass/fail decision so recon can complete and handoff can proceed.");
    expect(html).toContain("/vehicles/quality-control?repairOrderId=ro-1");
    expect(html).toContain("Capable Auto Repair completed the approved repair and returned the vehicle.");
  });

  it("adds a follow-up vendor link when the original outside vendor returns the vehicle unfinished", () => {
    const returnedVendorOrder = {
      ...order,
      stage: "QUALITY_CONTROL",
      nextAction: "Review the recommendation and send the vehicle to a capable follow-up vendor.",
      serviceVisit: {
        ...order.serviceVisit,
        concernSummary: "Northside Garage returned the vehicle unfinished and another vendor needs to complete the timing chain repair.",
      },
      vendorWorks: [{
        id: "vendor-work-returned",
        vendorName: "Northside Garage",
        status: "RETURNED",
        approvalStatus: "PENDING",
        currentLocation: "Dealership",
        directFromSource: false,
        expectedReturnAt: null,
        nextAction: "Choose the approved follow-up vendor and document the new outside repair path.",
        lastUpdateSummary: "Northside Garage returned the vehicle unfinished and could not repair the timing chain issue.",
        scope: "Timing chain replacement",
        sentAt: "2026-08-24T21:30:00.000Z",
        sentFrom: "Dealership",
        transportMethod: "Driven back",
        workType: "MECHANICAL_SUBLET",
      }],
    };

    const html = renderToStaticMarkup(
      <RepairOrderEnterpriseWorkbench
        fullDetailMode
        order={returnedVendorOrder}
        options={{ users: [{ id: "advisor-1", name: "Alex Advisor" }] }}
      />,
    );

    expect(html).toContain("Northside Garage returned the vehicle unfinished");
    expect(html).toContain("Add follow-up vendor");
    expect(html).toContain('href="#follow-up-vendor-documentation"');
    expect(html).toContain('id="follow-up-vendor-documentation"');
    expect(html).toContain("Document the next vendor repair");
    expect(html).toContain("Choose the approved follow-up vendor, confirm the repair scope, then save this outside repair record.");
  });
});
