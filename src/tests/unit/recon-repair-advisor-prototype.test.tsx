import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ReconRepairAdvisorPrototype } from "@/features/advisor/recon-repair-advisor-prototype";
import type { ServiceAdvisorWorkspaceModel } from "@/server/advisor-workspace/service";

const model = {
  generatedAt: "2026-08-09T18:00:00.000Z",
  advisor: { id: "advisor-1", name: "Alex Carter" },
  counts: {
    activeRepairOrders: 2,
    availableAppointments: 0,
    customers: 0,
    handoffs: 0,
    inboxNeedsResponse: 1,
    needsAttention: 2,
    todaysArrivals: 0,
    waitingCheckIn: 0,
    waitingOnOthers: 1,
  },
  inbox: [{
    audience: "TEAM",
    authorName: "Diego Auto Body",
    channel: "INTERNAL",
    customerName: "333586",
    direction: "INBOUND",
    dueAt: null,
    exceptionCodes: ["WAITING_PARTS"],
    id: "inbox-1",
    needsResponse: true,
    occurredAt: "2026-08-09T17:30:00.000Z",
    preview: "Vendor teardown complete; estimate needs review.",
    repairOrderId: "ro-1",
    repairOrderNumber: "RO-DB21B235",
    statusCode: "VENDOR_UPDATE",
    subject: "Diego update",
    transportState: "SHARED_IN_REPAIR_ORDER",
    vehicleLabel: "2024 Toyota RAV4",
  }],
  actionQueue: [{
    actionKind: "PARTS_DELAY",
    actionLabel: "Parts / ETA check",
    actionReason: "Diego Auto Body needs bumper and airbag parts before recon can continue.",
    customerName: "Internal vehicle 333586",
    id: "ro-1",
    latestAdvisorUpdate: null,
    nextAction: "Order parts for vendor recon.",
    operatingState: "WAITING",
    overdue: false,
    repairOrderNumber: "RO-DB21B235",
    stage: "REPAIR",
    targetAt: "2026-08-14T15:57:00.000Z",
    vehicleLabel: "2024 Toyota RAV4",
  }],
  appointments: [],
  repairOrders: [{
    age: { label: "1d", overdue: false, seconds: 86400 },
    customerName: "Internal vehicle 333586",
    id: "ro-1",
    nextAction: "Order parts for vendor recon.",
    operatingState: "WAITING",
    repairOrderNumber: "RO-DB21B235",
    stage: "REPAIR",
    targetAt: "2026-08-14T15:57:00.000Z",
    vehicleLabel: "2024 Toyota RAV4",
  }],
} satisfies ServiceAdvisorWorkspaceModel;

describe("ReconRepairAdvisorPrototype", () => {
  it("renders a separate Rapid Recon-style cockpit connected to existing operations", () => {
    const html = renderToStaticMarkup(<ReconRepairAdvisorPrototype model={model} />);

    expect(html).toContain("Recon/Repair Service Advisor");
    expect(html).toContain("Prototype · live advisor data");
    expect(html).toContain("Current Service Advisor is untouched");
    expect(html).toContain("Move now");
    expect(html).toContain("Waiting on others");
    expect(html).toContain("At risk");
    expect(html).toContain("Ready to move");
    expect(html).toContain("2024 Toyota RAV4");
    expect(html).toContain("/vehicles/service-close-parts?repairOrderId=ro-1");
    expect(html).toContain("/vehicles/outside-vendors");
    expect(html).toContain("Compare current Service Advisor");
  });
});
