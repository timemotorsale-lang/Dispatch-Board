import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { AdvisorRepairOrderStatusView } from "@/features/advisor/advisor-repair-order-status-view";
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
    targetAt: new Date("2026-07-20T18:00:00.000Z"),
    nextAction: "Confirm parts ETA.",
    customer: { displayName: "Jordan Customer" },
    inventoryUnit: { inventoryNumber: "INV-1001" },
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
    partDemands: [{ quantityReserved: 0, quantityRequired: 1 }],
    advisorUpdates: []
  } as unknown as Order;
  return { ...order, ...overrides };
}

describe("AdvisorRepairOrderStatusView", () => {
  it("renders a customer-safe advisor status view instead of the full repair workbench", () => {
    const html = renderToStaticMarkup(<AdvisorRepairOrderStatusView order={makeOrder()} />);

    expect(html).toContain("Back to My Workspace");
    expect(html).toContain("Advisor Repair Order Status");
    expect(html).toContain("RO-1001");
    expect(html).toContain("Customer-safe update");
    expect(html).toContain("Advisor response");
    expect(html).toContain("Save advisor response");
    expect(html).toContain("Recent advisor history");
    expect(html).toContain("Record ETA / promise update");
    expect(html).toContain("Parts ETA or promise update needed");
    expect(html).not.toContain("Open advisor review");
    expect(html).toContain("Customer promise needs review");
    expect(html).not.toContain("Technician Repair Workbench");
  });
});
