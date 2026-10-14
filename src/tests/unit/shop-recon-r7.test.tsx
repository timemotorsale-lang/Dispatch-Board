import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ShopReconLanding } from "@/features/inventory/shop-recon-landing";
import { buildShopReconProjection } from "@/server/shop-recon/projection";

const now = new Date("2026-07-18T15:00:00.000Z");

function order(overrides: Record<string, unknown> = {}) {
  return {
    id: "ro-1",
    repairOrderNumber: "RO-1001",
    origin: "CUSTOMER_REPAIR",
    stage: "INTAKE",
    stageStartedAt: "2026-07-18T14:30:00.000Z",
    operatingState: "ACTIVE",
    targetAt: "2026-07-19T15:00:00.000Z",
    nextAction: "Complete intake",
    stateReason: null,
    ownerUser: { id: "owner-1", name: "Alex Advisor" },
    location: { id: "location-1", name: "North Shop" },
    vehicle: { vehicleNumber: "V-101", year: 2024, make: "Ford", model: "F-150" },
    customer: { displayName: "Jordan Customer" },
    inventoryUnit: null,
    serviceVisit: { arrivedAt: "2026-07-18T14:30:00.000Z", keysReceivedCount: 1, promisedAt: "2026-07-19T15:00:00.000Z", concernSummary: "Brake vibration" },
    estimateVersions: [],
    releaseAuthorization: null,
    repairJobs: [],
    ...overrides,
  };
}

describe("R7 Shop & Recon landing projection", () => {
  it("assigns every open order to exactly one pipeline stage", () => {
    const orders = [
      order(),
      order({ id: "ro-2", stage: "READY_FOR_REPAIR", repairJobs: [{ id: "j-2", jobNumber: "2", description: "Ready", status: "READY_FOR_REPAIR", partDemands: [], dispatches: [] }] }),
      order({ id: "ro-3", stage: "QUALITY_CONTROL", repairJobs: [{ id: "j-3", jobNumber: "3", description: "QC", status: "READY_FOR_QC", partDemands: [], dispatches: [] }] }),
    ];
    const model = buildShopReconProjection(orders, now);
    expect(model.pipeline.reduce((sum, stage) => sum + stage.count, 0)).toBe(model.totals.openOrders);
    expect(model.pipeline.find((stage) => stage.key === "QUALITY_CONTROL_ROAD_TEST")?.count).toBe(1);
  });

  it("keeps customer repair and inventory recon operationally distinct", () => {
    const model = buildShopReconProjection([
      order(),
      order({ id: "ro-2", origin: "INVENTORY_RECON", customer: null, inventoryUnit: { inventoryNumber: "INV-200" } }),
    ], now);
    expect(model.totals).toMatchObject({ customerRepair: 1, inventoryRecon: 1, openOrders: 2 });
    expect(model.foundation.stages).toHaveLength(16);
    expect(model.foundation.wipLimits.operatingRepairBays).toBe(2);
    expect(model.foundation.activation.workflowTransitions).toBe("ACTIVE_GOVERNED_TRANSITIONS");
    expect(model.items.find(item => item.origin === "CUSTOMER_REPAIR")).toMatchObject({ workLaneLabel: "Customer Vehicle", cardTone: "BRIGHT_BLUE", commitmentLabel: "Customer promise" });
    expect(model.items.find(item => item.origin === "INVENTORY_RECON")).toMatchObject({ workLaneLabel: "Inventory Recon", cardTone: "DARK_BLUE", commitmentLabel: "Frontline target" });
  });

  it("renders one lane-colored vehicle card per vehicle", () => {
    const projection = buildShopReconProjection([
      order(),
      order({ id: "ro-2", repairOrderNumber: "RO-1002", origin: "INVENTORY_RECON", customer: null, inventoryUnit: { inventoryNumber: "INV-200" } }),
    ], now);
    const html = renderToStaticMarkup(<ShopReconLanding initialView="high-volume" model={projection} />);
    expect((html.match(/shop-vehicle-card lane-customer/g) ?? [])).toHaveLength(1);
    expect((html.match(/shop-vehicle-card lane-inventory/g) ?? [])).toHaveLength(1);
    expect(html).toContain("Customer Vehicle");
    expect(html).toContain("Inventory Recon");
    expect(html).toContain("Customer promise");
    expect(html).toContain("Frontline target");
  });

  it("identifies operational pilot records without changing ordinary repair orders", () => {
    const model = buildShopReconProjection([
      order({ repairOrderNumber: "PILOT-CUST-001" }),
      order({ id: "ro-2", repairOrderNumber: "RO-1002" }),
    ], now);
    expect(model.items[0].pilot).toMatchObject({ id: "CUSTOMER_STANDARD", expectedHandoff: "Service advisor / customer" });
    expect(model.items[1].pilot).toBeNull();
    expect(renderToStaticMarkup(<ShopReconLanding initialView="high-volume" model={model} />)).toContain("shop-pilot-badge");
  });

  it("surfaces parts, assignment, promise, approval, and quality constraints", () => {
    const model = buildShopReconProjection([order({
      stage: "ESTIMATE",
      targetAt: "2026-07-18T14:00:00.000Z",
      estimateVersions: [{ status: "PRESENTED", authorizations: [] }],
      repairJobs: [{
        id: "job-1",
        jobNumber: "1",
        description: "Front brakes",
        status: "READY_FOR_QC",
        partDemands: [{ quantityRequired: 2, quantityReserved: 1 }],
        dispatches: [],
      }],
    })], now);
    expect(model.totals).toMatchObject({ waitingParts: 1, atRisk: 1 });
    expect(model.approvals.estimate).toBe(1);
    expect(model.reviews.quality).toBe(1);
  });

  it("renders service intake, Parts, reviews, handoffs, and capability truth", () => {
    const projection = buildShopReconProjection([order()], now);
    const html = renderToStaticMarkup(<ShopReconLanding initialView="high-volume" model={{ ...projection, reviews: { ...projection.reviews, comebacks: 2 } }} />);
    expect(html).toContain("Check In Vehicle");
    expect(html).toContain("/vehicles/repair-orders?intakeSource=WALK_IN");
    expect(html).toContain("Parts Operations");
    expect(html).toContain("Customer Repair");
    expect(html).toContain("Inventory Recon");
    expect(html).toContain("Reviews &amp; Approvals");
    expect(html).toContain("Capacity &amp; Assignment");
    expect(html).toContain("Blocker Center");
    expect(html).toContain("At-Risk Completion");
    expect(html).not.toContain("Controlled Shop Foundation");
    expect(html).not.toContain("Live 16-Stage Lifecycle");
    expect(html).toContain('/vehicles/shop-recon/ro-1');
    expect(html).toContain("External adapters: DISABLED");
    expect(html).not.toContain("/vehicles/shop-execution");
  });

  it("renders the unified operations command center and optimization intelligence", () => {
    const projection = buildShopReconProjection([
      order({ id: "ro-inv", origin: "INVENTORY_RECON", customer: null, inventoryUnit: { inventoryNumber: "INV-200" }, estimateVersions: [{ status: "AUTHORIZED", totalCents: 125000, authorizations: [{ disposition: "ACCEPTED" }] }] }),
      order({ id: "ro-cust", stage: "READY_FOR_REPAIR", repairJobs: [{ id: "job-1", jobNumber: "1", description: "Front brakes", status: "READY_FOR_REPAIR", partDemands: [{ quantityRequired: 2, quantityReserved: 0 }], dispatches: [] }] }),
    ], now);
    const html = renderToStaticMarkup(<ShopReconLanding initialView="high-volume" model={projection} />);

    expect(projection.contractVersion).toBe("shop-recon/r11.0.0");
    expect(projection.capability).toMatchObject({ unifiedCommandCenter: "ACTIVE", exceptionLoopEngine: "ACTIVE_UI_GUIDANCE", inventoryShopHandoff: "LANE_AWARE_RETURN_PATH", rapidFlow: "CALM_DEFAULT_HIGH_VOLUME_OPTIONAL" });
    expect(projection.totals.authorizedReconCents).toBe(125000);
    expect(html).toContain("Unified Vehicle Command Center");
    expect(html).toContain("Exception &amp; Loop Engine");
    expect(html).toContain("Technician Daily Work View");
    expect(html).toContain("Manager Exception Dashboard");
    expect(html).toContain("Cross-System Handoff Rules");
    expect(html).toContain("Cost &amp; Profitability Intelligence");
    expect(html).toContain("Returns to Inventory Lifecycle");
    expect(html).toContain("Returns to Service Advisor / Customer");
    expect(html).toContain("Hold dispatch until parts are ready");
    expect(html).toContain("$1,250 authorized recon captured");
  });

  it("makes blocker category links change the rendered queue and active state", () => {
    const projection = buildShopReconProjection([order({
      repairJobs: [{ id: "job-1", jobNumber: "1", description: "Front brakes", status: "READY_FOR_REPAIR", partDemands: [{ quantityRequired: 2, quantityReserved: 0 }], dispatches: [] }],
    })], now);
    const html = renderToStaticMarkup(<ShopReconLanding initialBlocker="parts" initialView="high-volume" model={projection} />);

    expect(html).toContain('href="/vehicles/shop-recon?blocker=parts&amp;view=high-volume"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain("Part backorder");
    expect(html).toContain('href="/vehicles/repair-workbench?repairOrderId=ro-1"');
  });

  it("defaults to a calm Rapid Flow workspace with accountable exception details", () => {
    const projection = buildShopReconProjection([order({
      targetAt: "2026-07-18T14:00:00.000Z",
      repairJobs: [{ id: "job-1", jobNumber: "1", description: "Front brakes", status: "READY_FOR_REPAIR", partDemands: [{ quantityRequired: 2, quantityReserved: 0 }], dispatches: [] }],
    })], now);
    const html = renderToStaticMarkup(<ShopReconLanding model={projection} />);

    expect(html).toContain("Rapid Flow");
    expect(html).toContain("Calm promotes only constraints");
    expect(html).toContain("Needs attention now");
    expect(html).toContain("Waiting parts");
    expect(html).toContain("Alex Advisor");
    expect(html).toContain("Complete intake");
    expect(html).toContain("Daily flow brief");
    expect(html).toContain("Flow protections");
    expect(html).toContain('href="/vehicles/shop-recon?view=high-volume"');
    expect(html).not.toContain("Unified Vehicle Command Center");
  });
});
