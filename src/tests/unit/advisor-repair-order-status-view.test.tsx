import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { AdvisorRepairOrderStatusView, getRepairPrimaryAction } from "@/features/advisor/advisor-repair-order-status-view";
import type { getShopPlanningDetail } from "@/server/shop-planning/service";

type Order = Awaited<ReturnType<typeof getShopPlanningDetail>>;

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() })
}));

function makeOrder(overrides: Partial<Order> = {}): Order {
  const order = {
    id: "ro_123",
    repairOrderNumber: "RO-1001",
    stage: "DIAGNOSIS",
    operatingState: "WAITING_PARTS",
    origin: "CUSTOMER_REPAIR",
    targetAt: new Date("2026-07-20T18:00:00.000Z"),
    nextAction: "Confirm parts ETA.",
    customer: { displayName: "Jordan Customer", phoneNumber: "555-0100", email: "jordan@example.com" },
    inventoryUnit: null,
    shopReconLifecycle: null,
    vehicle: {
      year: 2024,
      make: "Ford",
      model: "F-150",
      vehicleNumber: "VEH-1001"
    },
    ownerUser: { name: "Alex Carter" },
    serviceVisit: {
      appointmentId: "appt_123",
      promisedAt: new Date("2026-07-20T20:00:00.000Z"),
      concernSummary: "Customer reports grinding noise from the front passenger side when braking.",
      keysReceivedCount: 1,
      keyTag: "1187",
      transportMode: "CUSTOMER_DRIVE",
      arrivedAt: new Date("2026-07-20T14:30:00.000Z")
    },
    inspectionVersions: [],
    diagnosisVersions: [],
    estimateVersions: [],
    repairJobs: [],
    vendorWorks: [],
    partDemands: [{ quantityReserved: 0, quantityRequired: 1 }],
    advisorUpdates: []
  } as unknown as Order;
  return { ...order, ...overrides };
}

describe("AdvisorRepairOrderStatusView", () => {
  it("selects one governed repair action from the current repair-order facts", () => {
    expect(getRepairPrimaryAction(makeOrder()).label).toBe("Start vehicle inspection");

    const approvedOrder = makeOrder({
      inspectionVersions: [{ id: "inspection_1" }],
      diagnosisVersions: [{ id: "diagnosis_1" }],
      estimateVersions: [{
        id: "estimate_1",
        authorizations: [{ id: "auth_1", disposition: "ACCEPTED", authorizedLineKeys: ["labor-front-brakes"] }]
      }]
    } as unknown as Partial<Order>);

    expect(getRepairPrimaryAction(approvedOrder)).toMatchObject({ label: "Create approved repair job", mode: "create" });
  });

  it("renders a customer-safe advisor status view instead of the full repair workbench", () => {
    const html = renderToStaticMarkup(<AdvisorRepairOrderStatusView order={makeOrder()} />);

    expect(html).toContain("Back to My Workspace");
    expect(html).toContain("Advisor Repair Order Status");
    expect(html).toContain("RO-1001");
    expect(html).toContain("Customer-safe update");
    expect(html).toContain("Overview");
    expect(html).toContain("Communications");
    expect(html).toContain("Estimate &amp; Approval");
    expect(html).toContain("Repair");
    expect(html).toContain("Quality");
    expect(html).toContain("Timeline");
    expect(html).toContain("Record ETA / promise update");
    expect(html).not.toContain("Open advisor review");
    expect(html).toContain("Cross-workspace dependency");
    expect(html).toContain("Parts readiness is blocking progress");
    expect(html).not.toContain("Technician Repair Workbench");
  });

  it("opens a customer communication workspace from an inbox compose link", () => {
    const html = renderToStaticMarkup(
      <AdvisorRepairOrderStatusView
        compose="customer"
        order={makeOrder()}
        returnTo="/vehicles?workspace=vehicle-operations-lead"
      />
    );

    expect(html).toContain("Back to My Workday");
    expect(html).toContain('href="/vehicles?workspace=vehicle-operations-lead"');
    expect(html).toContain("Repair-order communications");
    expect(html).toContain("Customer conversation");
    expect(html).toContain("555-0100");
    expect(html).toContain("External SMS/email delivery is not connected");
    expect(html).toContain("Advisor response");
    expect(html).toContain("Save advisor response");
  });

  it("shows quiet, source-owned inventory and shop lifecycle context for recon work", () => {
    const html = renderToStaticMarkup(<AdvisorRepairOrderStatusView order={makeOrder({
      customer: null,
      origin: "INVENTORY_RECON",
      inventoryUnit: {
        id: "inv_123",
        inventoryNumber: "INV-1001",
        lifecycleStage: "RECONDITIONING",
        operatingState: "BLOCKED",
        targetAt: new Date("2026-07-22T18:00:00.000Z"),
        nextAction: "Approve recon budget exception.",
        stateReason: "Recon cost exceeds approved ceiling.",
        version: 4,
        ownerUser: { id: "user_inventory", name: "Morgan Inventory" }
      },
      shopReconLifecycle: {
        id: "recon_123",
        stage: "PARTS_RESOURCE_READINESS",
        operatingState: "WAITING",
        targetAt: new Date("2026-07-21T18:00:00.000Z"),
        nextAction: "Confirm brake rotor ETA.",
        blockerCodes: ["WAITING_PARTS"],
        ownerUserId: "user_shop",
        zoneCode: "MECH-A",
        version: 7
      }
    } as Partial<Order>)} />);

    expect(html).toContain("Inventory recon");
    expect(html).toContain("Stakeholder-safe update");
    expect(html).toContain("Inventory is Blocked");
    expect(html).toContain("Recon cost exceeds approved ceiling.");
    expect(html).toContain("Related lifecycle");
    expect(html).toContain("Inventory-owned");
    expect(html).toContain("Shop &amp; Recon-owned");
    expect(html).toContain("Ownership protection");
    expect(html).toContain("View in Inventory");
    expect(html).toContain("Open Shop &amp; Recon");
  });

  it("shows offsite vendor truth with its evidence-driven repair stage and history", () => {
    const html = renderToStaticMarkup(<AdvisorRepairOrderStatusView initialTab="REPAIR" order={makeOrder({ partDemands: [], stage: "REPAIR", vendorWorks: [{ id: "vendor-work-1", vendorId: "vendor-1", vendorName: "Diego Auto Body", vendorContact: null, externalReference: null, workType: "BODY_SHOP", scope: "Front-end body repair", status: "AT_VENDOR", approvalStatus: "APPROVED", estimateAmountCents: 100000, approvedAmountCents: 100000, supplementalAmountCents: null, sentAt: new Date("2026-08-09T14:00:00Z"), sentFrom: "Auction", directFromSource: true, expectedReturnAt: new Date("2026-08-12T20:00:00Z"), returnedAt: null, transportMethod: "Carrier", keysCustodian: "Vendor", currentLocation: "Diego Auto Body", lastUpdateSummary: "Body repair is in progress.", nextAction: "Request progress update.", nextFollowUpAt: new Date("2026-08-10T14:00:00Z"), version: 2, createdByUserId: "user-1", createdAt: new Date(), updatedAt: new Date(), vendor: null, events: [{ actorUser: { name: "Alex Advisor" }, occurredAt: new Date("2026-08-09T16:00:00Z"), summary: "Approved body repair is underway.", toStatus: "AT_VENDOR" }] }] } as unknown as Partial<Order>)} />);

    expect(html).toContain("Offsite · Diego Auto Body");
    expect(html).toContain("Vendor progress history");
    expect(html).toContain("Approved body repair is underway.");
    expect(html).toContain('aria-current="step" class="current"');
    expect(html).toContain("Add / buy parts");
    expect(html).toContain("/vehicles/service-close-parts?repairOrderId=ro_123");
    expect(html).toContain("Return%20to%20RO-1001");
    expect(html).not.toContain("Handoff review complete");
  });
});
