import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { InventoryConsoleHome, type InventoryHomeData } from "@/features/inventory/inventory-console-home";
import { WorkflowLauncher } from "@/features/inventory/workflow-launcher";

const data: InventoryHomeData = {
  byLocation: [{ count: 2, locationId: "loc-001", name: "Minneapolis" }],
  byStage: [{ count: 2, label: "Inspection", stage: "INSPECTION" }],
  error: null,
  freshness: "LIVE",
  generatedAt: "2026-07-18T12:00:00.000Z",
  locationId: null,
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

  it("labels disconnected Shop, Parts, throughput, and adapter facts honestly", () => {
    const markup = renderToStaticMarkup(<InventoryConsoleHome data={data} />);
    expect(markup).toContain("Shop projection not connected to Home");
    expect(markup).toContain("Parts readiness projection not connected");
    expect(markup).toContain("No governed cross-domain throughput fact is connected");
    expect(markup).toContain("External adapters");
    expect(markup).toContain("Disabled");
  });

  it("renders explicit unavailable state without representative values", () => {
    const markup = renderToStaticMarkup(<InventoryConsoleHome data={{ ...data, byLocation: [], byStage: [], freshness: "UNAVAILABLE", generatedAt: null, error: "Projection offline", priorityWork: [], reviews: { approvals: 0, reviews: 0, available: false }, totals: { active: 0, blocked: 0, exposureCents: 0, overdue: 0, waiting: 0 } }} />);
    expect(markup).toContain("Unavailable");
    expect(markup).toContain("Projection offline");
    expect(markup).toContain("Your current role cannot view enterprise decision counts");
  });
});

describe("Inventory Console Workflow Launcher", () => {
  it("renders the phase-one catalog with role context and gated explanations", () => {
    const markup = renderToStaticMarkup(<WorkflowLauncher roles={["INVENTORY_MANAGER"]} />);
    for (const id of ["WL-01", "WL-02", "WL-03", "WL-04", "WL-05", "WL-06", "WL-07", "WL-08", "WL-C01"]) expect(markup).toContain(id);
    expect(markup).toContain("INVENTORY_MANAGER");
    expect(markup).toContain("R5 GOVERNED");
    expect(markup).toContain('/vehicles/inventory-to-frontline');
    expect(markup).toContain("R6 GOVERNED");
    expect(markup).toContain('/vehicles/retail-completion');
    expect(markup).toContain("CONTEXT REQUIRED");
    expect(markup).toContain("does not offer generic stage changes");
  });
});
