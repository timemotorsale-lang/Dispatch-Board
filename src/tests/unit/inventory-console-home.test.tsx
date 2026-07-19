import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { InventoryConsoleHome, type InventoryHomeData } from "@/features/inventory/inventory-console-home";
import { WorkflowLauncher } from "@/features/inventory/workflow-launcher";
import type { AuthenticatedUser } from "@/server/auth/store";
import { getInventoryWorkflowLauncher } from "@/server/inventory-workflow-launcher/service";

const data: InventoryHomeData = {
  activeSavedViewId: null,
  byLocation: [{ count: 2, locationId: "loc-001", name: "Minneapolis" }],
  byStage: [{ count: 2, label: "Inspection", stage: "INSPECTION" }],
  canShareSavedViews: true,
  error: null,
  freshness: "LIVE",
  generatedAt: "2026-07-18T12:00:00.000Z",
  locationId: null,
  operational: { shop: { active: 4, blocked: 1 }, parts: { waitingDemands: 3, unreservedUnits: 5 }, throughput: { inventoryTransitions: 7, repairOrdersClosed: 2, windowHours: 24 }, integration: { exchanges: 9, exceptions: 0, status: "HEALTHY", latestAt: "2026-07-18T12:00:00.000Z" } },
  savedViews: [],
  savedView: "ALL",
  savedViewNotice: null,
  priorityWork: [{ ageDays: 5, id: "unit-001", inventoryNumber: "TMS-001", issue: "Complete inspection", owner: "Inventory Owner", overdue: true, state: "ACTIVE", vehicle: "2020 Honda Accord" }],
  reviews: { approvals: 1, reviews: 2, available: true },
  totals: { active: 2, blocked: 0, exposureCents: 2_500_000, overdue: 1, waiting: 0 },
};

describe("Inventory Console R2 Home", () => {
  it("renders the approved Home hierarchy and deeper workspace routing", () => {
    const markup = renderToStaticMarkup(<InventoryConsoleHome data={data} />);
    expect(markup).toContain("Vehicle Operations Home");
    expect(markup).toContain("Start Workflow");
    expect(markup).toContain("Inventory Lifecycle");
    expect(markup).toContain("Shop &amp; Recon");
    expect(markup).toContain('href="/vehicles/control-tower"');
    expect(markup).toContain("Open Disposition &amp; Wholesale");
    expect(markup).toContain("Open Parts Operations");
    expect(markup).toContain("Priority Work");
    expect(markup).toContain("Reviews &amp; Approvals");
    expect(markup).toContain("Data &amp; Integration Health");
    expect(markup).toContain("View Event Log");
    expect(markup).not.toContain("Purchase Orders</a>");
  });

  it("renders connected Shop, Parts, throughput, and integration facts", () => {
    const markup = renderToStaticMarkup(<InventoryConsoleHome data={data} />);
    expect(markup).toContain("4");
    expect(markup).toContain("3");
    expect(markup).toContain("Last 24 Hours");
    expect(markup).toContain("Provider-neutral exchanges");
    expect(markup).toContain("HEALTHY");
  });

  it("renders explicit unavailable state without representative values", () => {
    const markup = renderToStaticMarkup(<InventoryConsoleHome data={{ ...data, byLocation: [], byStage: [], freshness: "UNAVAILABLE", generatedAt: null, error: "Projection offline", operational: null, priorityWork: [], reviews: { approvals: 0, reviews: 0, available: false }, totals: { active: 0, blocked: 0, exposureCents: 0, overdue: 0, waiting: 0 } }} />);
    expect(markup).toContain("Unavailable");
    expect(markup).toContain("Projection offline");
    expect(markup).toContain("Your current role cannot view enterprise decision counts");
  });
});

describe("Inventory Console Workflow Launcher", () => {
  it("renders the phase-one catalog with role context and gated explanations", () => {
    const actor: AuthenticatedUser = { id: "inventory-manager", name: "Inventory Manager", email: "inventory@example.com", isActive: true, roles: ["Inventory Manager"], duties: { direct: [], roleDefaults: [], all: [] } };
    const markup = renderToStaticMarkup(<WorkflowLauncher model={getInventoryWorkflowLauncher(actor)} />);
    for (const id of ["WL-01", "WL-02", "WL-03", "WL-04", "WL-05", "WL-06", "WL-07", "WL-08", "WL-C01"]) expect(markup).toContain(id);
    expect(markup).toContain("Inventory Manager");
    expect(markup).toContain("R5 GOVERNED");
    expect(markup).toContain('/vehicles/inventory-to-frontline');
    expect(markup).toContain("R6 GOVERNED");
    expect(markup).toContain('/vehicles/retail-completion');
    expect(markup).toContain("CONTEXT REQUIRED");
    expect(markup).toContain("never performs a generic stage change");
  });
});
