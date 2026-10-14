import { describe, expect, it } from "vitest";
import { buildManagerCommandCenterBrief } from "@/lib/manager-command-center-intelligence";
import type { ManagerWorkspaceModel } from "@/server/manager-workspace/service";

const model: ManagerWorkspaceModel = {
  actions: [
    { action: "Approve", authority: "CEO / authorized manager", dueAt: "2026-08-07T16:00:00.000Z", hat: "INVENTORY", href: "/manager-review", id: "ceo-1", mode: "CEO", overdue: false, reason: "Capital decision", score: 1000, subject: "Unit 101", title: "Purchase authorization" },
    { action: "Unblock", authority: "COO intervention", dueAt: "2026-08-07T14:00:00.000Z", hat: "PARTS", href: "/vehicles/parts-operations", id: "coo-1", mode: "COO", overdue: true, reason: "Part dependency", score: 900, subject: "RO-100", title: "Parts delay" },
    { action: "Open task", authority: "Assigned staff authority", dueAt: "2026-08-07T17:00:00.000Z", hat: "LOT", href: "/tasks/task-1", id: "work-1", mode: "WORK", overdue: false, reason: "Move vehicle", score: 500, subject: "Stock 101", title: "Stage vehicle" }
  ],
  generatedAt: "2026-08-07T15:00:00.000Z",
  hats: [],
  health: { activeInventory: 12, activeRepairOrders: 5, advisorAttention: 2, agedExposureCents: 4500000, approvals: 1, blocked: 2, exposureCents: 12500000, failedCommands: 0, inbox: 3, overdue: 2, reviews: 1, waitingParts: 1 },
  inbox: [],
  sources: { advisor: true, governance: true, inventory: true, operations: true, tasks: true },
  user: { id: "manager-1", name: "Eli Manager", canUseCeo: true, canUseCoo: true }
};

describe("manager command center intelligence", () => {
  it("chooses the most urgent action for the active manager perspective", () => {
    expect(buildManagerCommandCenterBrief(model, "COO").primaryAction?.id).toBe("coo-1");
    expect(buildManagerCommandCenterBrief(model, "WORK").primaryAction?.id).toBe("work-1");
  });

  it("builds a compact exception brief with direct routes", () => {
    const brief = buildManagerCommandCenterBrief(model, "COO");
    expect(brief.headline).toBe("4 exception lanes need manager attention.");
    expect(brief.exceptionCards.map((card) => card.title)).toEqual([
      "Customers needing attention",
      "Overdue follow-ups",
      "Manager decision queue",
      "Vehicle flow exceptions"
    ]);
    expect(brief.exceptionCards[0]).toMatchObject({ actionLabel: "Open customer queue", count: 2, tone: "red" });
  });
});
