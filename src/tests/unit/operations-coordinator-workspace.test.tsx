import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { OperationsCoordinatorWorkspace } from "@/features/operations-coordinator/operations-coordinator-workspace";
import type { OperationsCoordinatorWorkspaceModel } from "@/server/operations-coordinator/service";

const model = {
  generatedAt: "2026-07-20T14:00:00.000Z",
  coordinator: { id: "user-ops", name: "Ancilla Ops" },
  sourceStates: {
    appointments: "READY",
    customers: "READY",
    vehicles: "READY",
    repairOrders: "READY",
    parts: "EMPTY",
    tasks: "READY",
    salesPaperwork: "UNAVAILABLE",
    financePaperwork: "UNAVAILABLE",
    rentals: "UNAVAILABLE",
    payments: "UNAVAILABLE",
    collections: "UNAVAILABLE",
    documents: "UNAVAILABLE",
    marketing: "UNAVAILABLE"
  },
  counts: {
    todaysAppointments: 2,
    activeRepairOrders: 3,
    partsActions: 1,
    paperworkItems: 4,
    openTasks: 5,
    escalations: 1
  },
  universalSearch: {
    placeholder: "Search customer, vehicle, VIN, appointment, RO, part, payment, document, or task...",
    noResultActions: [
      { label: "Add customer", href: "/customers?action=new" },
      { label: "Add vehicle", href: "/vehicles/workflows/add-vehicle" }
    ]
  },
  quickActions: [],
  advisorSupport: [
    {
      label: "Check in arrival / walk-in",
      detail: "Confirm customer, vehicle, concern, custody, keys, and promised target before repair work is created.",
      href: "/vehicles/repair-orders?intakeSource=WALK_IN",
      mode: "PREPARE_CANONICAL_WORKFLOW"
    },
    {
      label: "Repair-order status peek",
      detail: "See current repair status, parts/QC blockers, and next advisor-safe customer update.",
      href: "/vehicles/repair-workbench",
      mode: "READ_ONLY_PEEK"
    },
    {
      label: "Prepare customer update",
      detail: "Draft or route the update; repair authorization and estimate approval remain protected.",
      href: "/vehicles/repair-workbench?view=advisor-support",
      mode: "ROUTE_TO_AUTHORITY"
    }
  ],
  actionQueue: [
    {
      id: "arrival-1",
      type: "ARRIVAL",
      label: "Jordan Customer",
      detail: "2024 Ford F-150",
      href: "/vehicles/repair-orders?intakeSource=APPOINTMENT&appointmentId=appt_1",
      source: "Appointments",
      appointmentAt: "2026-07-20T14:05:00.000Z",
      customerWaiting: true,
      rank: 73,
      resolver: "PREPARE_CANONICAL_WORKFLOW"
    }
  ],
  paperworkCenter: [
    {
      label: "Finance packet",
      status: "Placeholder",
      detail: "Collect documents; financing approval is blocked for this role.",
      href: "/tasks?department=SALES&packet=finance"
    }
  ],
  departmentPanels: [
    {
      label: "Sales / Finance",
      state: "UNAVAILABLE",
      value: null,
      href: "/tasks?department=SALES",
      detail: "Packets, insurance, financing paperwork, delivery support"
    }
  ],
  escalationRouter: [
    {
      label: "Manager approval",
      blocked: true,
      detail: "Route approvals and policy exceptions to management.",
      href: "/manager-review?scope=operations-coordinator"
    }
  ]
} as OperationsCoordinatorWorkspaceModel;

describe("OperationsCoordinatorWorkspace", () => {
  it("renders the compact front-door operating loop with safe routing", () => {
    const html = renderToStaticMarkup(<OperationsCoordinatorWorkspace model={model} />);

    expect(html).toContain("Operations Coordinator Workspace");
    expect(html).toContain("Keep the front door moving.");
    expect(html).toContain("Universal search first");
    expect(html).toContain("Add customer");
    expect(html).toContain("Service Advisor");
    expect(html).toContain("Open advisor workspace");
    expect(html).toContain('href="/vehicles/advisor"');
    expect(html).toContain("Check in arrival / walk-in");
    expect(html).toContain("Repair-order status peek");
    expect(html).toContain("repair authorization and estimate approval remain protected");
    expect(html).toContain("My coordination queue");
    expect(html).toContain("Prepare");
    expect(html).toContain("Paperwork command center");
    expect(html).toContain("financing approval is blocked");
    expect(html).toContain("Department peek panels");
    expect(html).toContain("Placeholder");
    expect(html).toContain("Escalation router");
    expect(html).toContain("Manager approval");
    expect(html).toContain("/command-center");
    expect(html).toContain("/board");
  });
});
