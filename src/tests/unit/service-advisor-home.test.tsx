import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CooDailyWorkbook, ServiceAdvisorHome } from "@/features/advisor/service-advisor-home";
import type { ServiceAdvisorWorkspaceModel } from "@/server/advisor-workspace/service";

const model = {
  generatedAt: "2026-07-20T14:00:00.000Z",
  advisor: { id: "user-alex", name: "Alex Carter" },
  workbook: {
    id: "workbook-1",
    boardDayId: "board-day-1",
    userId: "user-alex",
    scope: "COO",
    status: "ACTIVE",
    createdAt: "2026-07-20T14:00:00.000Z",
    updatedAt: "2026-07-20T14:00:00.000Z",
    checklistItems: [
      {
        id: "checklist-1",
        text: "Review morning approval queue",
        status: "YELLOW",
        update: "Waiting on customer callback.",
        done: false,
        carryoverReady: true,
        convertedTaskId: null,
        createdAt: "2026-07-20T14:05:00.000Z",
        updatedAt: "2026-07-20T14:06:00.000Z"
      }
    ],
    quickUpdates: [
      {
        id: "quick-1",
        text: "AJ checked the roof today.",
        category: "FACILITY",
        person: "AJ",
        company: "",
        followUpNeeded: true,
        dueWindow: "Next few weeks",
        carryoverReady: false,
        convertedTaskId: null,
        createdAt: "2026-07-20T14:07:00.000Z",
        updatedAt: "2026-07-20T14:08:00.000Z"
      }
    ],
    reportSeeds: [
      {
        id: "seed-1",
        sourceType: "CHECKLIST_ITEM",
        sourceId: "checklist-1",
        sourceHref: null,
        title: "Review morning approval queue",
        detail: "Waiting on customer callback.",
        tone: "YELLOW",
        status: "CANDIDATE",
        createdAt: "2026-07-20T14:09:00.000Z",
        updatedAt: "2026-07-20T14:10:00.000Z"
      }
    ]
  },
  counts: {
    activeRepairOrders: 2,
    availableAppointments: 1,
    customers: 1,
    todaysArrivals: 1,
    waitingCheckIn: 1,
    handoffs: 1,
    needsAttention: 1,
    waitingOnOthers: 0,
    inboxNeedsResponse: 1
  },
  inbox: [
    {
      id: "update_1",
      audience: "CUSTOMER",
      authorName: "Alex Carter",
      channel: "SMS",
      customerName: "Jordan Customer",
      direction: "INBOUND",
      dueAt: "2026-07-20T20:00:00.000Z",
      exceptionCodes: ["CUSTOMER_ACTION"],
      needsResponse: true,
      occurredAt: "2026-07-20T13:45:00.000Z",
      preview: "Can you explain the brake recommendation?",
      repairOrderId: "ro_1",
      repairOrderNumber: "RO-1001",
      statusCode: "WAITING_APPROVAL",
      subject: "Customer replied about estimate",
      transportState: "RECORDED_CONTACT",
      vehicleLabel: "2024 Ford F-150"
    }
  ],
  actionQueue: [
    {
      id: "ro_1",
      actionKind: "AUTHORIZATION",
      actionLabel: "Authorization needed",
      actionReason: "Customer decision may be required before work can continue.",
      customerName: "Jordan Customer",
      latestAdvisorUpdate: {
        authorName: "Alex Carter",
        occurredAt: "2026-07-20T13:45:00.000Z",
        statusCode: "WAITING_APPROVAL",
        summary: "Customer requested a callback before approval."
      },
      nextAction: "Contact customer for authorization.",
      operatingState: "WAITING",
      overdue: false,
      repairOrderNumber: "RO-1001",
      stage: "ESTIMATE_APPROVAL",
      targetAt: "2026-07-20T20:00:00.000Z",
      vehicleLabel: "2024 Ford F-150"
    }
  ],
  appointments: [
    {
      id: "appt_1",
      appointmentNumber: "APPT-1001",
      customerName: "Jordan Customer",
      email: "jordan@example.test",
      phoneNumber: null,
      startsAt: "2026-07-20T15:00:00.000Z",
      title: "Brake noise",
      vehicleLabel: "2024 Ford F-150"
    }
  ],
  repairOrders: []
} satisfies ServiceAdvisorWorkspaceModel;

describe("ServiceAdvisorHome", () => {
  it("surfaces a direct advisor action queue with repair-order routing", () => {
    const html = renderToStaticMarkup(<ServiceAdvisorHome model={model} />);

    expect(html).toContain("My next actions");
    expect(html).toContain("Authorization needed");
    expect(html).toContain("Customer decision may be required before work can continue.");
    expect(html).toContain("Last note: Customer requested a callback before approval.");
    expect(html).toContain("/vehicles/repair-workbench?repairOrderId=ro_1");
    expect(html).toContain("Check In Vehicle");
    expect(html).toContain("Search &amp; check in");
    expect(html).toContain("Record decision");
    expect(html).toContain("Calm");
    expect(html).toContain("High-volume");
    expect(html).toContain("Inbox");
    expect(html).toContain("Can you explain the brake recommendation?");
    expect(html).toContain('aria-label="Advisor workspace display mode"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).not.toContain("Repair-order handoffs");
  });

  it("renders a dedicated inbox with explicit customer delivery boundaries", () => {
    const html = renderToStaticMarkup(<ServiceAdvisorHome initialSection="INBOX" model={model} />);

    expect(html).toContain("Unified Inbox");
    expect(html).toContain("Needs response");
    expect(html).toContain("Customers");
    expect(html).toContain("Internal team");
    expect(html).toContain("Management");
    expect(html).toContain("external delivery not verified");
    expect(html).toContain("Respond to customer");
    expect(html).toContain("compose=customer");
  });

  it("renders the COO daily workbook as a separate review-before-approval space", () => {
    const html = renderToStaticMarkup(<CooDailyWorkbook model={model} />);

    expect(html).toContain("COO Daily Workbook");
    expect(html).toContain("Review before approval");
    expect(html).toContain("Approval readiness");
    expect(html).toContain("Daily action plan");
    expect(html).toContain("Daily Checklist");
    expect(html).toContain("Add something to do today");
    expect(html).toContain("Quick Update");
    expect(html).toContain("Today&#x27;s Updates");
    expect(html).toContain("Report Seeds");
    expect(html).toContain("Create Daily Action Plan");
    expect(html).toContain("Add To-Do");
    expect(html).toContain("Start today");
    expect(html).toContain("Carryover watch");
    expect(html).toContain("Daily report draft");
    expect(html).toContain("End-of-day report builder preview");
    expect(html).toContain("Approval stays governed");
    expect(html).toContain("Simple same-day list");
    expect(html).toContain("Capture unplanned events");
    expect(html).toContain("Meaningful checklist items");
    expect(html).toContain("Review morning approval queue");
    expect(html).toContain("AJ checked the roof today.");
    expect(html).toContain("Waiting on customer callback.");
    expect(html).toContain("/vehicles/advisor?queue=authorization");
    expect(html).toContain("/tasks/intake?");
    expect(html).toContain("Create+COO+daily+action+plan");
    expect(html).toContain("COO+follow-up%3A+RO-1001");
    expect(html).toContain("returnTo=%2Fvehicles%2Fcoo-workbook");
    expect(html).toContain("workflowArea=GENERAL_MANAGER");
  });
});
