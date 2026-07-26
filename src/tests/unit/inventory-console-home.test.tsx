import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { InventoryConsoleHome, type InventoryHomeData } from "@/features/inventory/inventory-console-home";
import { VehicleOperationsLeadHome } from "@/features/inventory/vehicle-operations-lead-home";
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
  priorityWork: [{ ageDays: 5, dueAt: "2026-07-17T12:00:00.000Z", escalated: true, id: "unit-001", inventoryNumber: "TMS-001", issue: "Complete inspection", nextAction: "Complete inspection", owner: "Inventory Owner", ownerUserId: "owner-1", overdue: true, queue: "TEAM", reasonCode: "OVERDUE", state: "ACTIVE", tier: "P1", vehicle: "2020 Honda Accord" }],
  reviews: { approvals: 1, reviews: 2, available: true, items: [{ actionHref: "/vehicles/inventory", actionLabel: "Review", ageHours: 24, amountCents: null, domain: "INVENTORY", id: "review-1", kind: "REVIEW", overdue: false, owner: "Manager Owner", state: "READY", subject: "TMS-001", title: "Title exception review" }] },
  totals: { active: 2, agedExposureCents: 500_000, blocked: 0, exposureCents: 2_500_000, overdue: 1, waiting: 0 },
};

describe("Inventory Console R2 Home", () => {
  it("renders the approved Home hierarchy and deeper workspace routing", () => {
    const markup = renderToStaticMarkup(<InventoryConsoleHome data={data} />);
    expect(markup).toContain("Operations Home");
    expect(markup).toContain("Aged Exposure");
    expect(markup).toContain("Start Workflow");
    expect(markup).toContain("Inventory Lifecycle");
    expect(markup).toContain("Shop &amp; Recon");
    expect(markup).toContain('href="/vehicles/control-tower"');
    expect(markup).toContain("Open Disposition &amp; Wholesale");
    expect(markup).toContain("Open Parts Operations");
    expect(markup).toContain("Priority Work");
    expect(markup).toContain("Current Stage");
    expect(markup).toContain("Title exception review");
    expect(markup).toContain("Reviews &amp; Approvals");
    expect(markup).toContain("Data &amp; Integration Health");
    expect(markup).toContain("View Event Log");
    expect(markup).not.toContain("Purchase Orders</a>");
  });

  it("renders connected Shop, Parts, throughput, and integration facts", () => {
    const markup = renderToStaticMarkup(<InventoryConsoleHome data={data} />);
    expect(markup).toContain("4");
    expect(markup).toContain("3");
    expect(markup).toContain("Today&#x27;s Throughput");
    expect(markup).toContain("Provider-neutral exchanges");
    expect(markup).toContain("HEALTHY");
  });

  it("renders explicit unavailable state without representative values", () => {
    const markup = renderToStaticMarkup(<InventoryConsoleHome data={{ ...data, byLocation: [], byStage: [], freshness: "UNAVAILABLE", generatedAt: null, error: "Projection offline", operational: null, priorityWork: [], reviews: { approvals: 0, reviews: 0, available: false, items: [] }, totals: { active: 0, agedExposureCents: 0, blocked: 0, exposureCents: 0, overdue: 0, waiting: 0 } }} />);
    expect(markup).toContain("Unavailable");
    expect(markup).toContain("Projection offline");
    expect(markup).toContain("Your current role cannot view enterprise decision counts");
  });
});

describe("Vehicle Operations Lead Home", () => {
  it("renders the focused multi-hat landing without manager-console clutter", () => {
    const markup = renderToStaticMarkup(<VehicleOperationsLeadHome data={data} />);

    expect(markup).toContain("Vehicle Operations Lead");
    expect(markup).toContain("Move the next vehicle forward");
    expect(markup).toContain("My Vehicle Work");
    expect(markup).toContain("Receive Vehicle");
    expect(markup).toContain("Shop &amp; Recon");
    expect(markup).toContain("Parts runner");
    expect(markup).toContain("Handoff map");
    expect(markup).toContain("Exceptions");
    expect(markup).toContain('/vehicles?view=BLOCKED');
    expect(markup).toContain('/vehicles/workflows/add-vehicle');
    expect(markup).toContain('/vehicles/parts-operations');
    expect(markup).not.toContain("Reports &amp; Exports");
    expect(markup).not.toContain("Administration");
  });
});

describe("Inventory Console Workflow Launcher", () => {
  it("renders the phase-one catalog with role context and gated explanations", () => {
    const actor: AuthenticatedUser = { id: "inventory-manager", name: "Inventory Manager", email: "inventory@example.com", isActive: true, roles: ["Inventory Manager"], duties: { direct: [], roleDefaults: [], all: [] } };
    const model = getInventoryWorkflowLauncher(actor);
    const markup = renderToStaticMarkup(<WorkflowLauncher model={model} />);
    for (const id of ["WL-01", "WL-01B", "WL-02", "WL-03", "WL-04", "WL-05", "WL-06", "WL-07", "WL-08", "WL-C01"]) expect(model.cards.some(card => card.id === id)).toBe(true);
    expect(markup).toContain("Add Vehicle");
    expect(markup).toContain('/vehicles/workflows/add-vehicle');
    expect(markup).toContain("Inventory Manager");
    expect(markup).toContain("R6 GOVERNED");
    expect(markup).toContain('/vehicles/retail-completion');
    expect(markup).toContain("CONTEXT REQUIRED");
    expect(markup).toContain("Search workflows, VIN, stock #, customer, or repair order");
    expect(markup).toContain("This Console");
    expect(markup).toContain("All CCC");
    expect(markup).toContain("Cards");
    expect(markup).toContain("List");
    expect(markup).toContain("Recommended");
    expect(markup).toContain("Recent");
    expect(markup).toContain("Favorites");
    expect(markup).toContain("All Workflows");
    expect(markup).toContain("My Drafts");
    expect(markup).toContain("Get a recommendation");
  });

  it("offers Add Vehicle and an explicit searchable command to mechanics", () => {
    const actor: AuthenticatedUser = { id: "mechanic", name: "Walter Mechanic", email: "mechanic@example.com", isActive: true, roles: ["Mechanic"], duties: { direct: [], roleDefaults: [], all: [] } };
    const model = getInventoryWorkflowLauncher(actor);
    const markup = renderToStaticMarkup(<WorkflowLauncher model={model} />);
    const addVehicle = model.cards.find((card) => card.id === "WL-01");

    expect(addVehicle).toMatchObject({ enabled: true, href: "/vehicles/workflows/add-vehicle?returnTo=%2Fvehicles%2Fworkflows" });
    expect(markup).toContain('role="search"');
    expect(markup).toContain('class="ewl-search-submit"');
    expect(markup).toContain("Add Vehicle");
  });
});
