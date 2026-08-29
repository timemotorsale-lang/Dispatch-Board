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
        reviewNote: "Mention if customer does not call back.",
        tone: "YELLOW",
        status: "CANDIDATE",
        createdAt: "2026-07-20T14:09:00.000Z",
        updatedAt: "2026-07-20T14:10:00.000Z"
      }
    ],
    reportDrafts: [
      {
        id: "draft-1",
        version: 1,
        status: "DRAFT",
        title: "COO Daily Report - 2026-07-20",
        summary: "1 report item(s) prepared from 0 reviewed seed(s). 0 item(s) marked for carryover.",
        sections: [
          {
            title: "Blockers and Risks",
            items: [
              {
                title: "Review morning approval queue",
                detail: "Waiting on customer callback.",
                reviewNote: "Mention if customer does not call back.",
                sourceHref: null,
                sourceId: "checklist-1",
                sourceLabel: "Daily Checklist",
                status: "CANDIDATE",
                tone: "YELLOW"
              }
            ]
          }
        ],
        sourceSeedIds: ["seed-1"],
        generatedByUserId: "user-alex",
        generatedAt: "2026-07-20T14:11:00.000Z",
        createdAt: "2026-07-20T14:11:00.000Z",
        updatedAt: "2026-07-20T14:11:00.000Z"
      }
    ],
    closeReadiness: {
      score: 64,
      tone: "SUPPORT",
      checklistCompletion: 0,
      checklistDone: 0,
      checklistTotal: 1,
      checklistNeedsSupport: 1,
      quickFollowUps: 1,
      carryoverItems: 1,
      reportSeedCount: 1,
      reviewedSeedCount: 0,
      includedSeedCount: 0,
      excludedSeedCount: 0,
      latestDraftVersion: 1,
      prompts: [
        "Review yellow/red checklist items and decide what needs help.",
        "Confirm Quick Update follow-ups have an owner or due window.",
        "Review remaining report seeds before generating the final draft."
      ]
    }
  },
  staffWorkbook: {
    id: "staff-workbook-1",
    boardDayId: "board-day-1",
    userId: "user-alex",
    scope: "STAFF",
    status: "ACTIVE",
    createdAt: "2026-07-20T14:00:00.000Z",
    updatedAt: "2026-07-20T14:00:00.000Z",
    checklistItems: [
      {
        id: "staff-checklist-1",
        text: "Finish customer callbacks",
        status: "GREEN",
        update: "All morning callbacks are done.",
        done: true,
        carryoverReady: false,
        convertedTaskId: null,
        createdAt: "2026-07-20T14:05:00.000Z",
        updatedAt: "2026-07-20T14:06:00.000Z"
      }
    ],
    quickUpdates: [],
    reportSeeds: [],
    reportDrafts: [],
    closeReadiness: {
      score: 100,
      tone: "READY",
      checklistCompletion: 100,
      checklistDone: 1,
      checklistTotal: 1,
      checklistNeedsSupport: 0,
      quickFollowUps: 0,
      carryoverItems: 0,
      reportSeedCount: 0,
      reviewedSeedCount: 0,
      includedSeedCount: 0,
      excludedSeedCount: 0,
      latestDraftVersion: null,
      prompts: ["Daily close is ready for a manager review."]
    }
  },
  staffWorkbookSummaries: [
    {
      workbookId: "staff-workbook-1",
      staffUserId: "user-alex",
      staffName: "Alex Carter",
      checklistCount: 1,
      completedChecklistCount: 1,
      redYellowItemCount: 0,
      quickUpdateCount: 0,
      followUpNeededCount: 0,
      carryoverCount: 0,
      reportSeedCount: 0,
      reviewedSeedCount: 0,
      closeReadinessScore: 100,
      closeReadinessTone: "READY",
      closeReadinessPrompts: ["Ready for daily close review."],
      latestUpdateAt: "2026-07-20T14:06:00.000Z",
      latestDraftStatus: null,
      latestDraftVersion: null
    }
  ],
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

  it("renders the COO workbook as a simple daily execution landing page", () => {
    const html = renderToStaticMarkup(<CooDailyWorkbook model={model} />);

    expect(html).toContain("COO Workbook");
    expect(html).toContain("A simple daily workspace for planning, execution, accountability, and reporting.");
    expect(html).toContain("COO View");
    expect(html).toContain("My Workbook");
    expect(html).toContain("Today&#x27;s Command");
    expect(html).toContain("What Needs Attention Now");
    expect(html).toContain("Open a Tool");
    expect(html).toContain("Keep the landing page clean. Open only what you need to execute.");
    expect(html).toContain("Close the Day");
    expect(html).toContain("Review work");
    expect(html).toContain("Confirm carryover");
    expect(html).toContain("Generate report");
    expect(html).toContain("Daily Close");
    expect(html).toContain("Needs Attention");
    expect(html).toContain("Today’s Work");
    expect(html).toContain("Report Ready");
    expect(html).toContain("Ready");
    expect(html).toContain("Review now");
    expect(html).toContain("Daily Checklist");
    expect(html).toContain("To-Do List");
    expect(html).toContain("Quick Update");
    expect(html).toContain("Daily Action Plan");
    expect(html).toContain("Carryover");
    expect(html).toContain("Report Seeds");
    expect(html).toContain("Staff Support");
    expect(html).toContain("Drafts");
    expect(html).toContain("Daily");
    expect(html).toContain("Weekly");
    expect(html).toContain("Monthly");
    expect(html).toContain("Seeds ready");
    expect(html).toContain("Latest draft");
    expect(html).toContain("Staff source");
    expect(html).toContain("Generate Report");
    expect(html).toContain("All workspace sources connected");
    expect(html).toContain("Review morning approval queue");
    expect(html).toContain("AJ checked the roof today.");
    expect(html).toContain("/vehicles/coo-workbook/checklist");
    expect(html).toContain("/vehicles/coo-workbook/to-do-list");
    expect(html).toContain("/vehicles/coo-workbook/quick-update");
    expect(html).toContain("/vehicles/coo-workbook/action-plan");
    expect(html).toContain("/vehicles/coo-workbook/carryover");
    expect(html).toContain("/vehicles/coo-workbook/report-seeds");
    expect(html).toContain("/vehicles/coo-workbook/staff-support");
    expect(html).toContain("/vehicles/coo-workbook/drafts");
  });

  it("renders focused COO workbook tools with working controls", () => {
    const checklistHtml = renderToStaticMarkup(<CooDailyWorkbook initialTool="CHECKLIST" model={model} />);
    const todoHtml = renderToStaticMarkup(<CooDailyWorkbook initialTool="TO_DO_LIST" model={model} />);
    const quickUpdateHtml = renderToStaticMarkup(<CooDailyWorkbook initialTool="QUICK_UPDATE" model={model} />);
    const reportSeedsHtml = renderToStaticMarkup(<CooDailyWorkbook initialTool="REPORT_SEEDS" model={model} />);
    const draftsHtml = renderToStaticMarkup(<CooDailyWorkbook initialTool="DRAFTS" model={model} />);

    expect(checklistHtml).toContain("Add Daily Checklist item");
    expect(checklistHtml).toContain("Status for Review morning approval queue");
    expect(checklistHtml).toContain("Convert");
    expect(todoHtml).toContain("Open Daily Checklist");
    expect(todoHtml).toContain("Open Tasks");
    expect(todoHtml).toContain("/tasks?returnTo=/vehicles/coo-workbook");
    expect(quickUpdateHtml).toContain("Quick Update details");
    expect(quickUpdateHtml).toContain("Save update");
    expect(quickUpdateHtml).toContain("Convert to task");
    expect(reportSeedsHtml).toContain("Include");
    expect(reportSeedsHtml).toContain("Exclude");
    expect(reportSeedsHtml).toContain("Optional review note");
    expect(draftsHtml).toContain("Generate Draft");
    expect(draftsHtml).toContain("Copy Draft");
  });
});
