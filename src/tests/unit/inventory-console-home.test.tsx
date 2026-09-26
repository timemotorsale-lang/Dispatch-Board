import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { InventoryConsoleHome, type InventoryHomeData } from "@/features/inventory/inventory-console-home";
import { VehicleOperationsLeadHome } from "@/features/inventory/vehicle-operations-lead-home";
import { WorkflowLauncher } from "@/features/inventory/workflow-launcher";
import type { AuthenticatedUser } from "@/server/auth/store";
import type { ServiceAdvisorWorkspaceModel } from "@/server/advisor-workspace/service";
import type { BoardReadTask } from "@/server/services/board-read";
import { getInventoryWorkflowLauncher } from "@/server/inventory-workflow-launcher/service";

const data: InventoryHomeData = {
  activeSavedViewId: null,
  byLocation: [{ count: 2, locationId: "loc-001", name: "Minneapolis" }],
  byStage: [{ averageStageAgeDays: 2.5, blocked: 0, count: 2, label: "Inspection", overdue: 1, stage: "INSPECTION" }],
  canShareSavedViews: true,
  error: null,
  freshness: "LIVE",
  generatedAt: "2026-07-18T12:00:00.000Z",
  locationId: null,
  operational: { shop: { active: 4, blocked: 1 }, parts: { waitingDemands: 3, unreservedUnits: 5 }, throughput: { inventoryTransitions: 7, repairOrdersClosed: 2, windowHours: 24 }, integration: { exchanges: 9, exceptions: 0, status: "HEALTHY", latestAt: "2026-07-18T12:00:00.000Z" } },
  savedViews: [],
  savedView: "ALL",
  savedViewNotice: null,
  priorityWork: [{ ageDays: 5, dueAt: "2026-07-17T12:00:00.000Z", escalated: true, id: "unit-001", inventoryNumber: "TMS-001", issue: "Complete inspection", lifecycleStage: "INSPECTION", nextAction: "Complete inspection", owner: "Inventory Owner", ownerUserId: "owner-1", overdue: true, queue: "TEAM", reasonCode: "OVERDUE", state: "ACTIVE", tier: "P1", vehicle: "2020 Honda Accord" }],
  reviews: { approvals: 1, reviews: 2, available: true, items: [{ actionHref: "/vehicles/inventory", actionLabel: "Review", ageHours: 24, amountCents: null, domain: "INVENTORY", id: "review-1", kind: "REVIEW", overdue: false, owner: "Manager Owner", state: "READY", subject: "TMS-001", title: "Title exception review" }] },
  totals: { active: 2, agedExposureCents: 500_000, blocked: 0, exposureCents: 2_500_000, overdue: 1, waiting: 0 },
};

const advisor = {
  counts: { needsAttention: 1, inboxNeedsResponse: 1 },
  actionQueue: [{ id: "ro-1", actionKind: "PROMISE_RISK", actionLabel: "Promise risk", actionReason: "Customer promise needs review.", customerName: "Jordan Customer", repairOrderNumber: "RO-1001", targetAt: "2026-07-18T11:00:00.000Z", vehicleLabel: "2020 Honda Accord", overdue: true }],
  inbox: [{ id: "update-1", audience: "CUSTOMER", customerName: "Jordan Customer", needsResponse: true, preview: "Please call with an update.", repairOrderId: "ro-1", repairOrderNumber: "RO-1001", subject: "Customer callback" }]
} as unknown as ServiceAdvisorWorkspaceModel;

const tasks = [{ id: "task-1", title: "Pick up brake rotors", description: "Collect parts from vendor.", status: "NOT_STARTED", priority: "HIGH", dueAt: "2026-07-18T13:00:00.000Z", updatedAt: "2026-07-18T10:00:00.000Z", workflowArea: "SERVICE", sourceType: "MANUAL", requiresManagerApproval: false, requiredUpdateFields: [], updateFieldValues: {}, assignedUser: { id: "owner-1", name: "Brock Inventory" }, recommendedUser: null, recommendation: null, vehicleReference: "TMS-001", customerReference: null, blockerReason: null, readyForReviewAt: null, completedAt: null }] as BoardReadTask[];

describe("Inventory Manager calm Home", () => {
  it("renders an exception-first hierarchy with progressive disclosure", () => {
    const markup = renderToStaticMarkup(<InventoryConsoleHome data={data} userName="Brock Inventory" />);
    expect(markup).toContain("Inventory Manager Workspace");
    expect(markup).toMatch(/Good (morning|afternoon|evening), Brock\./);
    expect(markup).toContain("Keep inventory moving.");
    expect(markup).toContain("What needs attention");
    expect(markup).toContain("Calm view");
    expect(markup).toContain("Daily flow brief");
    expect(markup).toContain("Operational inbox");
    expect(markup).toContain("Inventory lifecycle");
    expect(markup).toContain('href="/vehicles/control-tower"');
    expect(markup).toContain("Title exception review");
    expect(markup).toContain("More inventory tools");
    expect(markup).toContain("Role protection stays active");
    expect(markup).not.toContain("Data &amp; Integration Health");
    expect(markup).not.toContain("High-volume signals");
  });

  it("offers an optional high-volume view without replacing the calm default", () => {
    const markup = renderToStaticMarkup(<InventoryConsoleHome data={data} highVolume userName="Brock Inventory" />);

    expect(markup).toContain("High-volume view");
    expect(markup).toContain("High-volume signals");
    expect(markup).toContain("Capital exposure");
    expect(markup).toContain("24-hour flow");
    expect(markup).toContain("workspace=inventory&amp;mode=volume");
    expect(markup).toContain("workspace=inventory&amp;view=BLOCKED&amp;mode=volume");
    expect(markup).toContain(">Calm</a>");
  });

  it("returns a multi-hat operator to My Workday without embedding that workspace", () => {
    const markup = renderToStaticMarkup(<InventoryConsoleHome data={data} showMyWorkdayReturn userName="Brock Inventory" />);
    expect(markup).toContain("Back to My Workday");
    expect(markup).toContain('href="/vehicles?workspace=vehicle-operations-lead"');
    expect(markup).toContain('href="/vehicles?workspace=inventory"');
  });

  it("renders explicit unavailable state without representative values", () => {
    const markup = renderToStaticMarkup(<InventoryConsoleHome data={{ ...data, byLocation: [], byStage: [], freshness: "UNAVAILABLE", generatedAt: null, error: "Projection offline", operational: null, priorityWork: [], reviews: { approvals: 0, reviews: 0, available: false, items: [] }, totals: { active: 0, agedExposureCents: 0, blocked: 0, exposureCents: 0, overdue: 0, waiting: 0 } }} />);
    expect(markup).toContain("Inventory workspace unavailable");
    expect(markup).toContain("Projection offline");
    expect(markup).toContain("No inventory exceptions in this view");
  });
});

describe("Vehicle Operations Lead Home", () => {
  it("renders the focused multi-hat landing without manager-console clutter", () => {
    const markup = renderToStaticMarkup(<VehicleOperationsLeadHome advisor={advisor} data={data} tasks={tasks} userName="Brock Inventory" />);

    expect(markup).toContain("Personal Operations Workspace");
    expect(markup).toMatch(/Good (morning|afternoon|evening), Brock\./);
    expect(markup).toContain("Execute the next task.");
    expect(markup).toContain("My Workday");
    expect(markup).toContain("Service Advisor");
    expect(markup).toContain("Technician");
    expect(markup).toContain("Lot");
    expect(markup).toContain("Detail");
    expect(markup).toContain("What I should do next");
    expect(markup).toContain("Promise risk");
    expect(markup).toContain("Pick up brake rotors");
    expect(markup).toContain("Acting as Service Advisor");
    expect(markup).toContain("Acting as Parts");
    expect(markup).toContain("Customer callback");
    expect(markup).toContain("Role protection stays active");
    expect(markup).toContain("Recon / Repair Advisor");
    expect(markup).toContain('/vehicles/advisor');
    expect(markup).toContain('/vehicles?workspace=inventory');
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
