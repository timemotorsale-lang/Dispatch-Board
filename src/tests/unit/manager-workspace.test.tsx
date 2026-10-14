import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ManagerWorkspace } from "@/features/manager/manager-workspace";
import type { ManagerWorkspaceModel } from "@/server/manager-workspace/service";

const model: ManagerWorkspaceModel = {
  generatedAt: "2026-08-07T15:00:00.000Z",
  user: { id: "manager-1", name: "Eli Manager", canUseCeo: true, canUseCoo: true },
  health: { activeInventory: 12, activeRepairOrders: 5, advisorAttention: 2, agedExposureCents: 4500000, approvals: 1, blocked: 2, exposureCents: 12500000, failedCommands: 0, inbox: 3, overdue: 2, reviews: 1, waitingParts: 1 },
  actions: [
    { action: "Approve", authority: "CEO / authorized manager", dueAt: "2026-08-07T16:00:00.000Z", hat: "INVENTORY", href: "/manager-review", id: "ceo-1", mode: "CEO", overdue: false, reason: "Capital decision", score: 1000, subject: "Unit 101", title: "Purchase authorization" },
    { action: "Unblock", authority: "COO intervention", dueAt: "2026-08-07T14:00:00.000Z", hat: "PARTS", href: "/vehicles/parts-operations", id: "coo-1", mode: "COO", overdue: true, reason: "Part dependency", score: 900, subject: "RO-100", title: "Parts delay" },
    { action: "Open task", authority: "Assigned staff authority", dueAt: "2026-08-07T17:00:00.000Z", hat: "LOT", href: "/tasks/task-1", id: "work-1", mode: "WORK", overdue: false, reason: "Move vehicle", score: 500, subject: "Stock 101", title: "Stage vehicle" }
  ],
  inbox: [{ audience: "CUSTOMER", href: "/vehicles/repair-workbench", id: "inbox-1", needsResponse: true, preview: "Customer requested an update.", subject: "Customer update" }],
  hats: [{ id: "ADVISOR", count: 0 }, { id: "INVENTORY", count: 0 }, { id: "TECHNICIAN", count: 0 }, { id: "LOT", count: 1 }, { id: "PARTS", count: 0 }, { id: "DETAIL", count: 0 }],
  sources: { advisor: true, governance: true, inventory: true, operations: true, tasks: true }
};

describe("Manager Workspace", () => {
  it("renders one calm shell with CEO, COO, and My Work modes", () => {
    const html = renderToStaticMarkup(<ManagerWorkspace model={model} />);
    expect(html).toContain("Manager Workspace");
    expect(html).toContain("CEO");
    expect(html).toContain("COO");
    expect(html).toContain("My Work");
    expect(html).toContain('aria-label="Fast routes"');
    expect(html).toContain("Fast routes");
    expect(html).toContain("Dispatch Board");
    expect(html).toContain("Unified Inbox");
    expect(html).toContain("COO Workbook");
    expect(html).toContain("Inventory Manager");
    expect(html).toContain("Service Advisor");
    expect(html).toContain("Recon / Repair Advisor");
    expect(html).toContain("Exception brief");
    expect(html).toContain("Customers needing attention");
    expect(html).toContain("Open customer queue");
    expect(html).toContain("/vehicles/advisor?inbox=1");
    expect(html).toContain("/vehicles/coo-workbook");
    expect(html).not.toContain('id="manager-fast-routes"');
    expect(html).toContain("Decisions that need your authority");
    expect(html).toContain("Mode changes perspective—not authority");
  });

  it("renders the operational intervention mode", () => {
    const html = renderToStaticMarkup(<ManagerWorkspace initialMode="COO" model={model} />);
    expect(html).toContain("Keep the dealership moving");
    expect(html).toContain("Needs intervention now");
    expect(html).toContain("Parts delay");
  });

  it("renders the multi-hat personal execution mode", () => {
    const html = renderToStaticMarkup(<ManagerWorkspace initialMode="WORK" model={model} />);
    expect(html).toContain("Execute the next task");
    expect(html).toContain("Working hats");
    expect(html).toContain("Stage vehicle");
    expect(html).toContain("Assigned staff authority");
    expect(html).toContain("workspaceContext=MANAGEMENT");
    expect(html).toContain("managerMode=WORK");
    expect(html).toContain("returnTo=%2Fmanager-workspace%3Fmode%3Dwork");
  });
});
