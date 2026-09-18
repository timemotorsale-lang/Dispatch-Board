import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CooDailyWorkbook, CooEffectivenessPilotWorkbook, ServiceAdvisorHome } from "@/features/advisor/service-advisor-home";
import type { ServiceAdvisorWorkspaceModel } from "@/server/advisor-workspace/service";

const model = {
  boardDate: "2026-07-20",
  generatedAt: "2026-07-20T14:00:00.000Z",
  advisor: { id: "user-alex", name: "Alex Carter" },
  workspace: {
    canUseManagementWorkbook: false,
    key: "ADVISOR",
    label: "Advisor Workspace",
    managementWorkbookLabel: "Management Workbook",
    staffWorkbookLabel: "Service Advisor Workbook"
  },
  collaboratingTasks: [],
  workbookSearchHistory: [],
  morningPrioritySources: [
    {
      detail: "Alex Carter · blocked · Customer callback may delay close.",
      dueAt: "2026-07-20T15:00:00.000Z",
      href: "/tasks/task-priority-1",
      priority: "CRITICAL",
      rank: 120,
      reason: "Suggested from an open critical task that is blocked.",
      riskLevel: "BLOCKED",
      roleFit: "DIRECT",
      sourceId: "task-priority-1",
      sourceLabel: "Task",
      sourceType: "TASK",
      staffName: "Alex Carter",
      staffUserId: "user-alex",
      title: "Call Maria about approval"
    },
    {
      detail: "Alex Carter · in progress · Stock TMS-001",
      dueAt: "2026-07-20T17:00:00.000Z",
      href: "/tasks/task-priority-2",
      priority: "HIGH",
      rank: 90,
      reason: "Suggested from an open high task that is in progress.",
      riskLevel: "NONE",
      roleFit: "DIRECT",
      sourceId: "task-priority-2",
      sourceLabel: "Task",
      sourceType: "TASK",
      staffName: "Alex Carter",
      staffUserId: "user-alex",
      title: "Finish TMS-001 delivery packet"
    },
    {
      detail: "Alex Carter · general manager · Required daily responsibility",
      dueAt: null,
      href: "/my-day",
      priority: "HIGH",
      rank: 70,
      reason: "Suggested from an unfinished required staff duty.",
      riskLevel: "NONE",
      roleFit: "DIRECT",
      sourceId: "duty-priority-1",
      sourceLabel: "Staff duty",
      sourceType: "DUTY",
      staffName: "Alex Carter",
      staffUserId: "user-alex",
      title: "Review assigned daily duties"
    },
    {
      detail: "Alex Carter · not started · Inventory photo queue",
      dueAt: "2026-07-20T19:00:00.000Z",
      href: "/tasks/task-priority-4",
      priority: "MEDIUM",
      rank: 55,
      reason: "Suggested from an open medium task that is not started.",
      riskLevel: "NONE",
      roleFit: "SUPPORTING",
      sourceId: "task-priority-4",
      sourceLabel: "Task",
      sourceType: "TASK",
      staffName: "Alex Carter",
      staffUserId: "user-alex",
      title: "Upload photos for aged inventory"
    }
  ],
  workbook: {
    id: "workbook-1",
    boardDayId: "board-day-1",
    userId: "user-alex",
    scope: "COO",
    status: "ACTIVE",
    closedAt: null,
    closedByUserId: null,
    closeSnapshot: null,
    createdAt: "2026-07-20T14:00:00.000Z",
    updatedAt: "2026-07-20T14:00:00.000Z",
    checklistItems: [
      {
        id: "checklist-1",
        text: "Review morning approval queue",
        status: "YELLOW",
        priority: "HIGH",
        riskLevel: "WATCH",
        riskNote: "Customer callback may delay close.",
        update: "Waiting on customer callback.",
        done: false,
        carryoverReady: true,
        convertedTaskId: null,
        createdAt: "2026-07-20T14:05:00.000Z",
        updatedAt: "2026-07-20T14:06:00.000Z"
      }
    ],
    dailyFocusItems: [
      {
        id: "focus-1",
        outcome: "Resolve top approval blocker",
        mustCloseToday: true,
        priority: "CRITICAL",
        riskLevel: "WATCH",
        riskNote: "Customer callback may delay close.",
        supportNeeded: "Need manager backup if no response.",
        progressUpdate: "",
        lastProgressAt: null,
        status: "PLANNED",
        sortOrder: 0,
        convertedTaskId: null,
        createdAt: "2026-07-20T14:04:00.000Z",
        updatedAt: "2026-07-20T14:04:00.000Z"
      }
    ],
    carryovers: [
      {
        id: "carryover-1",
        sourceType: "CHECKLIST_ITEM",
        sourceId: "checklist-1",
        sourceHref: null,
        title: "Review morning approval queue",
        detail: "Waiting on customer callback.",
        status: "OPEN",
        targetBoardDate: "2026-07-21",
        convertedTaskId: null,
        dismissedReason: "",
        confirmedAt: null,
        dismissedAt: null,
        convertedAt: null,
        createdAt: "2026-07-20T14:12:00.000Z",
        updatedAt: "2026-07-20T14:12:00.000Z"
      }
    ],
    incomingCarryovers: [],
    bringForwardCandidates: [],
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
        cadence: "DAILY",
        periodStart: "2026-07-20",
        periodEnd: "2026-07-20",
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
    activitySignals: [],
    attentionSessions: [],
    closeReadiness: {
      score: 64,
      tone: "SUPPORT",
      checklistCompletion: 0,
      checklistDone: 0,
      checklistTotal: 1,
      checklistNeedsSupport: 1,
      dailyFocusDone: 0,
      dailyFocusTotal: 1,
      dailyFocusNeedsSupport: 1,
      mustCloseOpen: 1,
      quickFollowUps: 1,
      carryoverItems: 1,
      supportActions: 0,
      reportSeedCount: 1,
      reviewedSeedCount: 0,
      includedSeedCount: 0,
      excludedSeedCount: 0,
      latestDraftVersion: 1,
      prompts: [
        "Review daily focus items that need support or have risk.",
        "Review yellow/red checklist items and decide what needs help.",
        "Confirm Quick Update follow-ups have an owner or due window.",
        "Review remaining report seeds before generating the final draft."
      ]
    },
    supportActions: [],
    planning: {
      score: 44,
      status: "NEEDS_SUPPORT",
      focusItemCount: 1,
      topOutcomeCount: 1,
      mustCloseCount: 1,
      unresolvedMustCloseCount: 1,
      riskItemCount: 1,
      supportNeededCount: 1,
      suggestedFirstAction: "Resolve top approval blocker",
      staffGuidance: "Review focus items already marked watch or blocked.",
      managerSummary: "1 focus outcome(s), 1 must-close item(s), and 1 planning risk(s).",
      prompts: ["Review focus items already marked watch or blocked."]
    },
    execution: {
      score: 0,
      status: "NEEDS_SUPPORT",
      plannedDailyFocus: 1,
      completedDailyFocus: 0,
      checklistCount: 1,
      completedChecklist: 0,
      plannedWorkCount: 2,
      completedWorkCount: 0,
      unplannedWorkCount: 1,
      taskConversionCount: 0,
      unfinishedWorkCount: 2,
      carryoverReadyCount: 1,
      updatedChecklistCount: 1,
      blockedOrDelayedCount: 1,
      executionSummary: "0 of 2 planned item(s) complete with 1 unplanned update(s).",
      staffGuidance: "Review unfinished work and mark done, update, or carry over.",
      managerSummary: "0/2 planned complete, 2 unfinished, 0 converted to formal task(s).",
      prompts: ["Review unfinished work and mark done, update, or carry over."]
    },
    risk: {
      score: 79,
      status: "NEEDS_REVIEW",
      blockerCount: 0,
      watchCount: 3,
      dailyFocusBlockerCount: 0,
      checklistRedCount: 0,
      checklistYellowCount: 1,
      quickFollowUpCount: 1,
      missingDueWindowCount: 0,
      openSupportCount: 0,
      operatingExceptionCount: 1,
      blockerQueue: [],
      tomorrowCarryoverCandidates: [{ id: "focus-1", sourceType: "DAILY_FOCUS", title: "Resolve top approval blocker" }],
      staffGuidance: "Confirm tomorrow ownership for carryover candidates.",
      managerSummary: "0 blocker(s), 3 watch signal(s), and 1 tomorrow candidate(s).",
      prompts: ["Confirm tomorrow ownership for carryover candidates."]
    },
    coaching: {
      effectivenessScore: 39,
      status: "NEEDS_SUPPORT",
      reportingScore: 20,
      supportNeededPrompt: "Support is needed to keep at least one item moving.",
      staffSummary: "Review focus items already marked watch or blocked.",
      managerSummary: "0 of 2 planned item(s) complete, 0 blocker(s), 1 carryover candidate(s).",
      coachingPrompts: ["Review focus items already marked watch or blocked.", "Close, update, or carry over unfinished work."],
      strengths: ["Captured meaningful unplanned work."],
      opportunities: ["Review focus items already marked watch or blocked.", "Close, update, or carry over unfinished work."],
      planning: {} as never,
      execution: {} as never,
      risk: {} as never
    },
    reporting: {
      score: 40,
      status: "NEEDS_SUPPORT",
      sourceBackedCount: 4,
      reviewedCount: 0,
      includedSeedCount: 0,
      candidateSeedCount: 1,
      carriedSeedCount: 0,
      excludedSeedCount: 0,
      completedFocusCount: 0,
      unresolvedFocusCount: 1,
      meaningfulChecklistCount: 1,
      quickUpdateCount: 1,
      supportSignalCount: 0,
      reportActivitySignalCount: 0,
      dailyDraftInputs: [{ id: "seed-1", sourceType: "CHECKLIST_ITEM", title: "Review morning approval queue", status: "CANDIDATE" }],
      weeklyRollupInputs: [{ id: "seed-1", sourceType: "CHECKLIST_ITEM", title: "Review morning approval queue", status: "CANDIDATE" }],
      monthlyRollupInputs: [{ id: "seed-1", sourceType: "CHECKLIST_ITEM", title: "Review morning approval queue", status: "CANDIDATE" }],
      auditTrail: [{ sourceId: "seed-1", sourceType: "CHECKLIST_ITEM" }],
      staffGuidance: "Review candidate Report Seeds before finalizing the draft.",
      managerSummary: "4 source-backed report signal(s), 0 reviewed seed(s), and 1 candidate seed(s).",
      prompts: ["Review candidate Report Seeds before finalizing the draft."]
    },
    activityIntelligence: {
      score: 45,
      status: "NEEDS_SUPPORT",
      signalCount: 0,
      reportRelevantCount: 0,
      coachingRelevantCount: 0,
      completedWorkCount: 0,
      customerCommunicationCount: 0,
      blockerRiskCount: 0,
      followUpCount: 0,
      supportRequestCount: 0,
      taskConversionCount: 0,
      promiseCommitmentCount: 0,
      feedback: [],
      recentSignals: [],
      staffGuidance: "No app activity signals have been attached to this workbook day yet.",
      managerSummary: "0 activity signal(s), 0 report-ready, 0 blocker/risk signal(s)."
    },
    timeAttention: {
      score: 40,
      status: "NEEDS_SUPPORT",
      activeMinutes: 0,
      idleMinutes: 0,
      sessionCount: 0,
      areas: [],
      staffGuidance: "Time-in-area tracking has not started for this workbook day.",
      managerSummary: "0 active minute(s) captured across 0 area(s)."
    },
    governance: {
      currentStage: "WORK_THE_DAY",
      nextRecommendedAction: "Review unfinished work and mark done, update, or carry over.",
      closeReadinessState: "BLOCKED",
      closeBlockers: ["1 must-close item(s) unresolved."],
      allowedActions: {
        canEdit: true,
        canAskForSupport: true,
        canPrepareTomorrow: true,
        canGenerateReport: true,
        canCloseDay: true,
        canReopenDay: false
      },
      managerReviewPrompts: ["1 must-close item(s) unresolved."]
    },
    effectiveness: {
      overallScore: 62,
      focusScore: 70,
      executionScore: 0,
      communicationScore: 64,
      riskScore: 58,
      carryoverQualityScore: 79,
      plannedWork: 2,
      completedWork: 0,
      dailyFocusTotal: 1,
      dailyFocusDone: 0,
      mustCloseOpen: 1,
      followUps: 1,
      riskFlags: 3,
      carryoverItems: 2,
      supportNeeded: "Need manager backup if no response.",
      staffGuidance: "Finish or carry over must-close outcomes before the day ends.",
      managerSummary: "0 of 2 planned item(s) completed, 3 risk/support signal(s), and 2 carryover item(s) identified.",
      coachingPrompts: [
        "Finish or carry over must-close outcomes before the day ends.",
        "Raise blocked or watch items early so support can arrive sooner."
      ]
    }
  },
  staffWorkbook: {
    id: "staff-workbook-1",
    boardDayId: "board-day-1",
    userId: "user-alex",
    scope: "STAFF",
    status: "ACTIVE",
    closedAt: null,
    closedByUserId: null,
    closeSnapshot: null,
    createdAt: "2026-07-20T14:00:00.000Z",
    updatedAt: "2026-07-20T14:00:00.000Z",
    checklistItems: [
      {
        id: "staff-checklist-1",
        text: "Finish customer callbacks",
        status: "GREEN",
        priority: "MEDIUM",
        riskLevel: "NONE",
        riskNote: "",
        update: "All morning callbacks are done.",
        done: true,
        carryoverReady: false,
        convertedTaskId: null,
        createdAt: "2026-07-20T14:05:00.000Z",
        updatedAt: "2026-07-20T14:06:00.000Z"
      }
    ],
    dailyFocusItems: [
      {
        id: "staff-focus-1",
        outcome: "Complete scheduled callbacks",
        mustCloseToday: true,
        priority: "HIGH",
        riskLevel: "NONE",
        riskNote: "",
        supportNeeded: "",
        progressUpdate: "",
        lastProgressAt: null,
        status: "DONE",
        sortOrder: 0,
        convertedTaskId: null,
        createdAt: "2026-07-20T14:04:00.000Z",
        updatedAt: "2026-07-20T14:04:00.000Z"
      }
    ],
    carryovers: [],
    incomingCarryovers: [],
    bringForwardCandidates: [],
    quickUpdates: [],
    reportSeeds: [],
    reportDrafts: [],
    activitySignals: [],
    attentionSessions: [],
    closeReadiness: {
      score: 100,
      tone: "READY",
      checklistCompletion: 100,
      checklistDone: 1,
      checklistTotal: 1,
      checklistNeedsSupport: 0,
      dailyFocusDone: 1,
      dailyFocusTotal: 1,
      dailyFocusNeedsSupport: 0,
      mustCloseOpen: 0,
      quickFollowUps: 0,
      carryoverItems: 0,
      supportActions: 0,
      reportSeedCount: 0,
      reviewedSeedCount: 0,
      includedSeedCount: 0,
      excludedSeedCount: 0,
      latestDraftVersion: null,
      prompts: ["Daily close is ready for a manager review."]
    },
    supportActions: [],
    planning: {
      score: 98,
      status: "READY",
      focusItemCount: 1,
      topOutcomeCount: 1,
      mustCloseCount: 1,
      unresolvedMustCloseCount: 0,
      riskItemCount: 0,
      supportNeededCount: 0,
      suggestedFirstAction: "Complete scheduled callbacks",
      staffGuidance: "Today's focus is clear. Work from the highest-priority outcome first.",
      managerSummary: "1 focus outcome(s), 1 must-close item(s), and 0 planning risk(s).",
      prompts: ["Today's focus is clear. Work from the highest-priority outcome first."]
    },
    execution: {
      score: 90,
      status: "READY",
      plannedDailyFocus: 1,
      completedDailyFocus: 1,
      checklistCount: 1,
      completedChecklist: 1,
      plannedWorkCount: 2,
      completedWorkCount: 2,
      unplannedWorkCount: 0,
      taskConversionCount: 0,
      unfinishedWorkCount: 0,
      carryoverReadyCount: 0,
      updatedChecklistCount: 1,
      blockedOrDelayedCount: 0,
      executionSummary: "2 of 2 planned item(s) complete with 0 unplanned update(s).",
      staffGuidance: "Execution is clean. Keep work updated through close.",
      managerSummary: "2/2 planned complete, 0 unfinished, 0 converted to formal task(s).",
      prompts: ["Execution is clean. Keep work updated through close."]
    },
    risk: {
      score: 100,
      status: "READY",
      blockerCount: 0,
      watchCount: 0,
      dailyFocusBlockerCount: 0,
      checklistRedCount: 0,
      checklistYellowCount: 0,
      quickFollowUpCount: 0,
      missingDueWindowCount: 0,
      openSupportCount: 0,
      operatingExceptionCount: 0,
      blockerQueue: [],
      tomorrowCarryoverCandidates: [],
      staffGuidance: "Risk is controlled. Keep watching promise and handoff signals.",
      managerSummary: "0 blocker(s), 0 watch signal(s), and 0 tomorrow candidate(s).",
      prompts: ["Risk is controlled. Keep watching promise and handoff signals."]
    },
    coaching: {
      effectivenessScore: 83,
      status: "NEEDS_REVIEW",
      reportingScore: 45,
      supportNeededPrompt: "",
      staffSummary: "Keep the day current and close it cleanly.",
      managerSummary: "2 of 2 planned item(s) complete, 0 blocker(s), 0 carryover candidate(s).",
      coachingPrompts: ["Keep the day current and close it cleanly.", "Started with clear daily focus."],
      strengths: ["Started with clear daily focus.", "Moved planned work forward."],
      opportunities: ["Keep the day current and close it cleanly."],
      planning: {} as never,
      execution: {} as never,
      risk: {} as never
    },
    reporting: {
      score: 35,
      status: "NEEDS_SUPPORT",
      sourceBackedCount: 0,
      reviewedCount: 0,
      includedSeedCount: 0,
      candidateSeedCount: 0,
      carriedSeedCount: 0,
      excludedSeedCount: 0,
      completedFocusCount: 1,
      unresolvedFocusCount: 0,
      meaningfulChecklistCount: 1,
      quickUpdateCount: 0,
      supportSignalCount: 0,
      reportActivitySignalCount: 0,
      dailyDraftInputs: [],
      weeklyRollupInputs: [],
      monthlyRollupInputs: [],
      auditTrail: [],
      staffGuidance: "Work the day before generating a report draft.",
      managerSummary: "0 source-backed report signal(s), 0 reviewed seed(s), and 0 candidate seed(s).",
      prompts: ["Work the day before generating a report draft."]
    },
    activityIntelligence: {
      score: 45,
      status: "NEEDS_SUPPORT",
      signalCount: 0,
      reportRelevantCount: 0,
      coachingRelevantCount: 0,
      completedWorkCount: 0,
      customerCommunicationCount: 0,
      blockerRiskCount: 0,
      followUpCount: 0,
      supportRequestCount: 0,
      taskConversionCount: 0,
      promiseCommitmentCount: 0,
      feedback: [],
      recentSignals: [],
      staffGuidance: "No app activity signals have been attached to this workbook day yet.",
      managerSummary: "0 activity signal(s), 0 report-ready, 0 blocker/risk signal(s)."
    },
    timeAttention: {
      score: 40,
      status: "NEEDS_SUPPORT",
      activeMinutes: 0,
      idleMinutes: 0,
      sessionCount: 0,
      areas: [],
      staffGuidance: "Time-in-area tracking has not started for this workbook day.",
      managerSummary: "0 active minute(s) captured across 0 area(s)."
    },
    governance: {
      currentStage: "CLOSE_THE_DAY",
      nextRecommendedAction: "Close the day and generate the report.",
      closeReadinessState: "CLEAN",
      closeBlockers: [],
      allowedActions: {
        canEdit: true,
        canAskForSupport: true,
        canPrepareTomorrow: false,
        canGenerateReport: false,
        canCloseDay: true,
        canReopenDay: false
      },
      managerReviewPrompts: ["Workbook is ready for manager review."]
    },
    effectiveness: {
      overallScore: 88,
      focusScore: 100,
      executionScore: 100,
      communicationScore: 40,
      riskScore: 100,
      carryoverQualityScore: 100,
      plannedWork: 2,
      completedWork: 2,
      dailyFocusTotal: 1,
      dailyFocusDone: 1,
      mustCloseOpen: 0,
      followUps: 0,
      riskFlags: 0,
      carryoverItems: 0,
      supportNeeded: "",
      staffGuidance: "The day is clear. Keep updates current before close.",
      managerSummary: "2 of 2 planned item(s) completed, 0 risk/support signal(s), and 0 carryover item(s) identified.",
      coachingPrompts: ["The day is clear. Keep updates current before close."]
    }
  },
  staffWorkbookSummaries: [
    {
      workbookId: "staff-workbook-1",
      staffUserId: "user-alex",
      staffName: "Alex Carter",
      checklistCount: 1,
      completedChecklistCount: 1,
      dailyFocusCount: 1,
      completedDailyFocusCount: 1,
      dailyFocusRiskCount: 0,
      redYellowItemCount: 0,
      quickUpdateCount: 0,
      followUpNeededCount: 0,
      carryoverCount: 0,
      openSupportActions: 0,
      reportSeedCount: 0,
      reviewedSeedCount: 0,
      closeReadinessScore: 100,
      closeReadinessTone: "READY",
      closeReadinessPrompts: ["Ready for daily close review."],
      effectivenessScore: 100,
      managerCoachingSummary: "2 of 2 planned item(s) complete with 0 support signal(s).",
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
    expect(html).toContain("Find customer, vehicle, appointment, VIN, phone, or RO");
    expect(html).toContain("Record decision");
    expect(html).toContain("Inbox");
    expect(html).toContain("Can you explain the brake recommendation?");
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

  it("renders the role workbook as a simple daily execution landing page", () => {
    const html = renderToStaticMarkup(<CooDailyWorkbook model={model} />);

    expect(html).toContain("A simple daily workspace for planning, execution, accountability, and reporting.");
    expect(html).toContain("Service Advisor Workbook");
    expect(html).not.toContain("Management Workbook");
    expect(html).toContain("Today&#x27;s Command");
    expect(html).toContain("Today’s Execution");
    expect(html).toContain("Work selected focus items first. Review attached risks when they affect delivery.");
    expect(html).toContain("Other Attention");
    expect(html).toContain("Open a Tool");
    expect(html).toContain("Keep the landing page clean. Open only what you need to execute.");
    expect(html).toContain("Start The Day");
    expect(html).toContain("/vehicles/coo-workbook/effectiveness-pilot?workbookScope=MY#start-the-day");
    expect(html).toContain("More Tools");
    expect(html).toContain("/vehicles/coo-workbook/more-tools?workbookScope=MY");
    expect(html).toContain("Daily Purse");
    expect(html.match(/aria-expanded="false"/g)).toHaveLength(2);
    expect(html).toContain("Recommended Now");
    expect(html).toContain("Daily workflow");
    expect(html).toContain("Work The Day");
    expect(html).toContain("End The Day");
    expect(html).toContain("Staff Execution Home");
    expect(html).toContain("Open the next thing, update what changed, ask for help, or close the day without hunting through the workbook.");
    expect(html).toContain("Due Next");
    expect(html).toContain("Needs Help");
    expect(html).toContain("Recently Updated");
    expect(html).toContain("Open work");
    expect(html).toContain("Add update");
    expect(html).toContain("Ask for help");
    expect(html).toContain("Set follow-up");
    expect(html).toContain("Attach photo/document");
    expect(html).toContain("Resolve today, protect tomorrow, review the evidence, and close with an explicit approval.");
    expect(html).toContain("Review today’s results");
    expect(html).toContain("Protect tomorrow");
    expect(html).toContain("Review the daily report evidence");
    expect(html).toContain("Prepare tomorrow");
    expect(html).toContain("Generate daily draft");
    expect(html).toContain("Review End The Day");
    expect(html).toContain("Add missing item");
    expect(html).toContain("Daily Close");
    expect(html).toContain("Needs Attention");
    expect(html).toContain("Today’s Work");
    expect(html).toContain("2 items");
    expect(html).toContain("Report Ready");
    expect(html).toContain("role=\"tablist\"");
    expect(html).toContain("aria-selected=\"false\"");
    expect(html).not.toContain("Daily Close details");
    expect(html).not.toContain("Review what must be cleaned up before the day is closed.");
    expect(html).toContain("Ready");
    expect(html).toContain("Review now");
    expect(html).toContain("Focus Compass");
    expect(html).toContain("Daily Checklist");
    expect(html).toContain("To-Do List");
    expect(html).toContain("Quick Update");
    expect(html).toContain("Daily Action Plan");
    expect(html).toContain("Carryover");
    expect(html).toContain("Report Seeds");
    expect(html).toContain("Staff Support");
    expect(html).toContain("Purchase / Appraisal Capture");
    expect(html).toContain("Drafts");
    expect(html).toContain("Daily");
    expect(html).toContain("Weekly");
    expect(html).toContain("Monthly");
    expect(html).toContain("Seeds ready");
    expect(html).toContain("Latest draft");
    expect(html).toContain("Staff source");
    expect(html).toContain("Generate Report");
    expect(html).toContain("All workspace sources connected");
    expect(html).toContain("Finish customer callbacks");
    expect(html).toContain("/vehicles/coo-workbook/focus-compass");
    expect(html).toContain("/vehicles/coo-workbook/checklist");
    expect(html).toContain("/vehicles/coo-workbook/to-do-list");
    expect(html).toContain("/vehicles/coo-workbook/quick-update");
    expect(html).toContain("/vehicles/coo-workbook/action-plan");
    expect(html).toContain("/vehicles/coo-workbook/carryover");
    expect(html).toContain("/vehicles/coo-workbook/report-seeds");
    expect(html).toContain("/vehicles/coo-workbook/staff-support");
    expect(html).toContain("/vehicles/coo-workbook/purchase-appraisal-capture");
    expect(html).toContain("/vehicles/coo-workbook/drafts");
    expect(html).toContain("returnTo=%2Fvehicles%2Fcoo-workbook");
    expect(html).toContain("Review source");
    expect(html).not.toContain("Create task");
    expect(html).not.toContain("title=Complete+scheduled+callbacks");
    expect(html).not.toContain("brief=Review+this+Daily+Focus+item");
  });

  it("shows checklist carryover decisions as selected and protects them for tomorrow", () => {
    const carryoverModel = {
      ...model,
      staffWorkbook: {
        ...model.staffWorkbook,
        checklistItems: model.staffWorkbook.checklistItems.map((item) => ({ ...item, carryoverReady: true, done: false }))
      }
    } as ServiceAdvisorWorkspaceModel;
    const html = renderToStaticMarkup(<CooDailyWorkbook model={carryoverModel} />);

    expect(html).toContain('class="selected carry"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain("Candidate · All morning callbacks are done.");
  });

  it("makes closed-day status override work-the-day recommendations", () => {
    const closedModel = {
      ...model,
      staffWorkbook: {
        ...model.staffWorkbook,
        carryovers: model.workbook.carryovers,
        closedAt: "2026-07-20T23:13:00.000Z",
        reportDrafts: model.workbook.reportDrafts,
        status: "CLOSED"
      }
    } as ServiceAdvisorWorkspaceModel;
    const html = renderToStaticMarkup(<CooDailyWorkbook model={closedModel} />);

    expect(html).toContain("Day Closed — Review Report");
    expect(html).toContain("Today is closed. Review the saved report; 1 carryover item is protected for tomorrow.");
    expect(html).toContain("Closed · 1 protected for tomorrow");
    expect(html).toContain("Review report");
    expect(html).toContain("Attention at Close");
    expect(html).toContain("Carried or reported");
    expect(html).toContain("Daily Report");
    expect(html).toContain("Ready to review");
  });

  it("opens existing task and repair-order sources instead of offering duplicate task creation", () => {
    const sourceAwareModel = {
      ...model,
      staffWorkbook: {
        ...model.staffWorkbook,
        dailyFocusItems: [
          { ...model.staffWorkbook.dailyFocusItems[0], id: "focus-task-source", outcome: "Call Maria about approval" },
          { ...model.staffWorkbook.dailyFocusItems[0], id: "focus-ro-source", outcome: "Promise risk: RO-1001 2024 Ford F-150" }
        ]
      }
    } satisfies ServiceAdvisorWorkspaceModel;

    const html = renderToStaticMarkup(<CooDailyWorkbook model={sourceAwareModel} />);

    expect(html).toContain('href="/tasks/task-priority-1">Open task');
    expect(html).toContain('repairOrderId=ro_1&amp;returnLabel=Service+Advisor+Workbook&amp;returnTo=%2Fvehicles%2Fcoo-workbook%3FworkbookScope%3DMY">Open RO');
    expect(html).not.toContain("title=Call+Maria+about+approval");
    expect(html).not.toContain("title=Promise+risk%3A+RO-1001+2024+Ford+F-150");
  });

  it("removes a repair order from COO workbook attention when it was closed from the summary card", () => {
    const closedModel = {
      ...model,
      actionQueue: [{
        ...model.actionQueue[0],
        id: "closed_ro_1",
        customerName: "Closed Customer",
        repairOrderNumber: "RO-CLOSED",
        vehicleLabel: "2018 Honda Accord"
      }]
    } satisfies ServiceAdvisorWorkspaceModel;

    const html = renderToStaticMarkup(<CooDailyWorkbook closedRepairOrderId="closed_ro_1" model={closedModel} />);

    expect(html).not.toContain("Closed Customer");
    expect(html).not.toContain("RO-CLOSED");
    expect(html).not.toContain("2018 Honda Accord");
  });

  it("renders focused role workbook tools with working controls", () => {
    const toolModel = {
      ...model,
      staffWorkbook: {
        ...model.staffWorkbook,
        quickUpdates: model.workbook.quickUpdates,
        bringForwardCandidates: [{
          detail: "Waiting on AJ to confirm timing.",
          id: "DAILY_FOCUS:focus-prior",
          priority: "HIGH",
          recommendedTarget: "FOCUS",
          riskLevel: "WATCH",
          sourceBoardDate: "2026-07-19",
          sourceHref: "/vehicles/coo-workbook/effectiveness-pilot#focus-focus-prior",
          sourceId: "focus-prior",
          sourceType: "DAILY_FOCUS",
          title: "Recover roof follow-up"
        }],
        reportDrafts: model.workbook.reportDrafts,
        reportSeeds: model.workbook.reportSeeds
      }
    } satisfies ServiceAdvisorWorkspaceModel;
    const checklistHtml = renderToStaticMarkup(<CooDailyWorkbook initialTool="CHECKLIST" model={toolModel} />);
    const todoHtml = renderToStaticMarkup(<CooDailyWorkbook initialTool="TO_DO_LIST" model={toolModel} />);
    const quickUpdateHtml = renderToStaticMarkup(<CooDailyWorkbook initialTool="QUICK_UPDATE" model={toolModel} />);
    const actionPlanHtml = renderToStaticMarkup(<CooDailyWorkbook initialTool="ACTION_PLAN" model={toolModel} />);
    const carryoverHtml = renderToStaticMarkup(<CooDailyWorkbook initialTool="CARRYOVER" model={toolModel} />);
    const reportSeedsHtml = renderToStaticMarkup(<CooDailyWorkbook initialTool="REPORT_SEEDS" model={toolModel} />);
    const draftsHtml = renderToStaticMarkup(<CooDailyWorkbook initialTool="DRAFTS" model={toolModel} />);
    const bringForwardHtml = renderToStaticMarkup(<CooDailyWorkbook initialTool="BRING_FORWARD" model={toolModel} />);
    const purchaseCaptureHtml = renderToStaticMarkup(<CooDailyWorkbook initialTool="PURCHASE_APPRAISAL_CAPTURE" model={toolModel} />);
    const focusCompassHtml = renderToStaticMarkup(<CooDailyWorkbook initialTool="FOCUS_COMPASS" model={toolModel} />);
    const moreToolsHtml = renderToStaticMarkup(<CooDailyWorkbook initialTool="MORE_TOOLS" model={toolModel} />);

    expect(checklistHtml).toContain("Add Daily Checklist item");
    expect(checklistHtml).toContain("Status for Finish customer callbacks");
    expect(checklistHtml).toContain("Convert");
    expect(todoHtml).toContain("Open Daily Checklist");
    expect(todoHtml).toContain("Open Tasks");
    expect(todoHtml).toContain("/tasks?returnTo=/vehicles/coo-workbook");
    expect(quickUpdateHtml).toContain("Quick Update details");
    expect(quickUpdateHtml).toContain("Service / Repair");
    expect(quickUpdateHtml).toContain("Promise / Commitment");
    expect(quickUpdateHtml).toContain("Process Improvement");
    expect(quickUpdateHtml).toContain("Title / Registration");
    expect(quickUpdateHtml).toContain("Documentation");
    expect(quickUpdateHtml).toContain("Customer Issue");
    expect(quickUpdateHtml).toContain("Compliance");
    expect(quickUpdateHtml).toContain("Warranty");
    expect(quickUpdateHtml).toContain("Towing");
    expect(quickUpdateHtml).toContain("Follow-up date");
    expect(quickUpdateHtml).toContain("type=\"date\"");
    expect(quickUpdateHtml).toContain("Save update");
    expect(quickUpdateHtml).toContain("Convert to task");
    expect(quickUpdateHtml).toContain("Find related context");
    expect(quickUpdateHtml).toContain("Related Quick Update context");
    expect(actionPlanHtml).toContain("Create overall action plan task");
    expect(actionPlanHtml).toContain("Create+Service+Advisor+Workbook+daily+action+plan");
    expect(carryoverHtml).toContain("Convert to task gives it an owner, due time, checklist, comments, and status tracking.");
    expect(reportSeedsHtml).toContain("Include");
    expect(reportSeedsHtml).toContain("Exclude");
    expect(reportSeedsHtml).toContain("Optional review note");
    expect(draftsHtml).toContain("Weekly");
    expect(draftsHtml).toContain("Monthly");
    expect(draftsHtml).toContain("Copy Draft");
    expect(bringForwardHtml).toContain("Bring Forward Work");
    expect(bringForwardHtml).toContain("Search prior unfinished work");
    expect(bringForwardHtml).toContain("Recover roof follow-up");
    expect(bringForwardHtml).toContain("Today&#x27;s Focus");
    expect(bringForwardHtml).toContain("Action Plan");
    expect(bringForwardHtml).toContain("Checklist");
    expect(purchaseCaptureHtml).toContain("TAI Purchase Assist");
    expect(purchaseCaptureHtml).toContain("Build the buy/appraisal packet in one pass");
    expect(purchaseCaptureHtml).toContain("Purchase capture purpose");
    expect(purchaseCaptureHtml).toContain("VIN / plate / stock reference");
    expect(purchaseCaptureHtml).toContain("Photo or document proof");
    expect(purchaseCaptureHtml).toContain("Send to TAI review");
    expect(purchaseCaptureHtml).toContain("No customer, inventory, quote, invoice, or appraisal records were changed");
    expect(focusCompassHtml).toContain("Focus Compass");
    expect(focusCompassHtml).toContain("Now Focus");
    expect(focusCompassHtml).toContain("Today’s Must-Wins");
    expect(focusCompassHtml).toContain("Risk Radar");
    expect(focusCompassHtml).toContain("Distraction Filter");
    expect(focusCompassHtml).toContain("Carryover &amp; Reset");
    expect(focusCompassHtml).toContain("Company Focus Alignment");
    expect(focusCompassHtml).toContain("Week");
    expect(focusCompassHtml).toContain("Month");
    expect(focusCompassHtml).toContain("Quarter");
    expect(focusCompassHtml).toContain("Year");
    expect(moreToolsHtml).toContain("Service Advisor Workbook More Tools");
    expect(moreToolsHtml).toContain("Each tool opens a real workbook area");
    expect(moreToolsHtml).toContain("13 tools");
    expect(moreToolsHtml).toContain("Focus Compass");
    expect(moreToolsHtml).toContain("Bring Forward Work");
    expect(moreToolsHtml).toContain("Purchase / Appraisal Capture");
    expect(moreToolsHtml).toContain("Priority Triage");
    expect(moreToolsHtml).toContain("Follow-Up Center");
    expect(moreToolsHtml).toContain("Blocker Escalation");
    expect(moreToolsHtml).toContain("Promise Tracker");
    expect(moreToolsHtml).toContain("Training Moment Capture");
    expect(moreToolsHtml).toContain("End-of-Day Assistant");
    expect(moreToolsHtml).toContain("/vehicles/coo-workbook/action-plan");
    expect(moreToolsHtml).toContain("/vehicles/coo-workbook/focus-compass");
    expect(moreToolsHtml).toContain("/vehicles/coo-workbook/purchase-appraisal-capture");
    expect(moreToolsHtml).toContain("/vehicles/coo-workbook/report-seeds");
  });

  it("colors execution focus cards by work status", () => {
    const statusModel = {
      ...model,
      generatedAt: "2026-07-20T17:00:00.000Z",
      staffWorkbook: {
        ...model.staffWorkbook,
        dailyFocusItems: [
          { ...model.staffWorkbook.dailyFocusItems[0], id: "focus-done", outcome: "Completed delivery", progressUpdate: "", status: "DONE" },
          { ...model.staffWorkbook.dailyFocusItems[0], id: "focus-updated", outcome: "Updated customer promise", progressUpdate: "Customer was called.", status: "PLANNED" },
          { ...model.staffWorkbook.dailyFocusItems[0], id: "focus-carryover", outcome: "Carry roof follow-up", progressUpdate: "", status: "CARRY_OVER" },
          { ...model.staffWorkbook.dailyFocusItems[0], id: "focus-untouched", outcome: "Untouched close-window focus", priority: "LOW", progressUpdate: "", riskLevel: "NONE", status: "PLANNED" }
        ]
      }
    } satisfies ServiceAdvisorWorkspaceModel;

    const html = renderToStaticMarkup(<CooDailyWorkbook model={statusModel} />);

    expect(html).toContain('class="done"');
    expect(html).toContain('class="updated"');
    expect(html).toContain('class="carryover"');
    expect(html).toContain('class="red"');
  });

  it("renders Start The Day without exposing workbook mode switching", () => {
    const html = renderToStaticMarkup(<CooEffectivenessPilotWorkbook model={model} />);

    expect(html).toContain("Start The Day: start clear, work the day, close with accountability.");
    expect(html).not.toContain("Current Workbook");
    expect(html).not.toContain("Effectiveness Pilot");
    expect(html).not.toContain('aria-label="Workbook version"');
    expect(html).toContain("Start The Day");
    expect(html).toContain("Build a clear plan before work begins");
    expect(html).toContain("What needs your attention today?");
    expect(html).toContain("Choose today&#x27;s outcomes");
    expect(html).toContain("Confirm capacity and support");
    expect(html).toContain("Review Start Day");
    expect(html).toContain("Any revision requires a fresh review and approval.");
    expect(html).not.toContain("Quick progress update");
    expect(html).not.toContain("Coaching Panel");
    expect(html).not.toContain("Tomorrow Setup");
    expect(html).not.toContain("Prepare Tomorrow");
    expect(html).not.toContain("Generate Draft");
    expect(html).not.toContain("Manager View");
    expect(html).not.toContain("Light Checklist");
    expect(html).not.toContain("Report Seeds");
    expect(html).toContain("Complete scheduled callbacks");
  });

  it("shows source-backed staff priorities for Daily Focus approval", () => {
    const staffPriorityModel = {
      ...model,
      staffWorkbook: {
        ...model.staffWorkbook,
        checklistItems: [],
        carryovers: [],
        dailyFocusItems: [],
        quickUpdates: []
      }
    } satisfies ServiceAdvisorWorkspaceModel;

    const html = renderToStaticMarkup(<CooEffectivenessPilotWorkbook model={staffPriorityModel} />);

    expect(html).toContain("What needs your attention today?");
    expect(html).toContain("Call Maria about approval");
    expect(html).toContain("Finish TMS-001 delivery packet");
    expect(html).toContain("Review assigned daily duties");
    expect(html).toContain("Task · role match");
    expect(html).toContain("Staff duty · role match");
    expect(html).toContain("Suggested from an open critical task that is blocked.");
    expect(html).toContain("href=\"/tasks/task-priority-1\"");
    expect(html).toContain("href=\"/my-day\"");
    expect(html).toContain("Add to Today");
    expect(html).toContain("Upload photos for aged inventory");
    expect(html).toContain("View source context");
  });

  it("shows unfinished prior assignments as explicit carryover choices", () => {
    const carryoverModel = {
      ...model,
      staffWorkbook: {
        ...model.staffWorkbook,
        incomingCarryovers: [{
          ...model.workbook.carryovers[0],
          id: "incoming-carryover-1",
          targetBoardDate: model.boardDate,
          title: "Call AJ for the final roof repair decision"
        }]
      }
    } satisfies ServiceAdvisorWorkspaceModel;

    const html = renderToStaticMarkup(<CooEffectivenessPilotWorkbook model={carryoverModel} />);

    expect(html).toContain("Unfinished prior assignments");
    expect(html).toContain("Call AJ for the final roof repair decision");
    expect(html).toContain("Prior carryover");
    expect(html).toContain("Add to Today");
  });

  it("shows fewer than three source-backed suggestions and prompts staff to add the rest", () => {
    const partialPriorityModel = {
      ...model,
      morningPrioritySources: model.morningPrioritySources.slice(0, 1),
      staffWorkbook: {
        ...model.staffWorkbook,
        checklistItems: [],
        carryovers: [],
        dailyFocusItems: [],
        quickUpdates: []
      }
    } satisfies ServiceAdvisorWorkspaceModel;

    const html = renderToStaticMarkup(<CooEffectivenessPilotWorkbook model={partialPriorityModel} />);

    expect(html).toContain("What needs your attention today?");
    expect(html).toContain("Call Maria about approval");
    expect(html).toContain("Design an outcome manually");
    expect(html).toContain("Add at least one meaningful outcome");
  });

  it("lets staff approve or edit a selected Daily Focus item", () => {
    const html = renderToStaticMarkup(<CooEffectivenessPilotWorkbook model={model} />);

    expect(html).toContain("Approve");
    expect(html).toContain("Edit outcome");
    expect(html).toContain("Edit the outcome and refine its scope.");
    expect(html).toContain("Design an outcome manually");
  });

  it("identifies an unlinked manual outcome without pretending it is an existing task", () => {
    const manualOutcomeModel = {
      ...model,
      morningPrioritySources: [],
      staffWorkbook: {
        ...model.staffWorkbook,
        checklistItems: [],
        carryovers: [],
        dailyFocusItems: [{
          ...model.staffWorkbook.dailyFocusItems[0],
          convertedTaskId: null,
          outcome: "Identify Pending/Almost Done Vehicles - Devise a Plan to Fix them"
        }],
        incomingCarryovers: [],
        bringForwardCandidates: [],
        quickUpdates: []
      }
    } satisfies ServiceAdvisorWorkspaceModel;

    const html = renderToStaticMarkup(<CooEffectivenessPilotWorkbook model={manualOutcomeModel} />);

    expect(html).toContain("Manual outcome · not a task");
    expect(html).toContain("Manually added Daily Focus outcome. No task has been created.");
    expect(html).toContain("Convert to task");
    expect(html).not.toContain("Open linked task");
  });

  it("opens a linked task instead of offering to create a duplicate", () => {
    const linkedOutcomeModel = {
      ...model,
      morningPrioritySources: [],
      staffWorkbook: {
        ...model.staffWorkbook,
        checklistItems: [],
        carryovers: [],
        dailyFocusItems: [{ ...model.staffWorkbook.dailyFocusItems[0], convertedTaskId: "task-linked-1" }],
        incomingCarryovers: [],
        bringForwardCandidates: [],
        quickUpdates: []
      }
    } satisfies ServiceAdvisorWorkspaceModel;

    const html = renderToStaticMarkup(<CooEffectivenessPilotWorkbook model={linkedOutcomeModel} />);

    expect(html).toContain("Linked task");
    expect(html).toContain("href=\"/tasks/task-linked-1\"");
    expect(html).toContain("Open linked task");
    expect(html).not.toContain("Manual outcome · not a task");
  });

  it("opens an existing matching task source instead of offering conversion", () => {
    const matchingTaskModel = {
      ...model,
      morningPrioritySources: [
        {
          ...model.morningPrioritySources[0],
          href: "/tasks/task-existing-1",
          sourceId: "task-existing-1",
          sourceType: "TASK",
          staffUserId: "user-other",
          title: "Review DealerCenter Updating - Resolve Known Issues"
        }
      ],
      staffWorkbook: {
        ...model.staffWorkbook,
        checklistItems: [],
        carryovers: [],
        dailyFocusItems: [{
          ...model.staffWorkbook.dailyFocusItems[0],
          convertedTaskId: null,
          outcome: "DealerCenter Updating - Resolve Known Issues"
        }],
        incomingCarryovers: [],
        bringForwardCandidates: [],
        quickUpdates: []
      }
    } satisfies ServiceAdvisorWorkspaceModel;

    const html = renderToStaticMarkup(<CooEffectivenessPilotWorkbook model={matchingTaskModel} />);

    expect(html).toContain("Linked task");
    expect(html).toContain("href=\"/tasks/task-existing-1\"");
    expect(html).toContain("Open task");
    expect(html).not.toContain("Convert to task");
  });

  it("allows additional outcomes when three have already been chosen", () => {
    const fullPlanModel = {
      ...model,
      staffWorkbook: {
        ...model.staffWorkbook,
        dailyFocusItems: [
          model.staffWorkbook.dailyFocusItems[0],
          { ...model.staffWorkbook.dailyFocusItems[0], id: "staff-focus-2", outcome: "Confirm the first delivery promise", sortOrder: 1 },
          { ...model.staffWorkbook.dailyFocusItems[0], id: "staff-focus-3", outcome: "Resolve the open approval", sortOrder: 2 }
        ]
      }
    } satisfies ServiceAdvisorWorkspaceModel;

    const html = renderToStaticMarkup(<CooEffectivenessPilotWorkbook model={fullPlanModel} />);

    expect(html).toContain("3 chosen");
    expect(html).toContain("Add to Today");
    expect(html).toContain("Design an outcome manually");
    expect(html).toContain("Add outcome");
    expect(html).not.toContain("Swap into Today");
    expect(html).not.toContain("Plan full");
  });

  it("removes legacy generic advisor focus rows from the Start The Day panel", () => {
    const legacyGenericModel = {
      ...model,
      morningPrioritySources: [],
      staffWorkbook: {
        ...model.staffWorkbook,
        checklistItems: [],
        carryovers: [],
        dailyFocusItems: [
          { ...model.staffWorkbook.dailyFocusItems[0], id: "legacy-authorization", outcome: "Authorization needed", progressUpdate: "", supportNeeded: "" },
          { ...model.staffWorkbook.dailyFocusItems[0], id: "legacy-promise", outcome: "Promise risk", progressUpdate: "", supportNeeded: "" }
        ],
        quickUpdates: []
      }
    } satisfies ServiceAdvisorWorkspaceModel;

    const html = renderToStaticMarkup(<CooEffectivenessPilotWorkbook model={legacyGenericModel} />);

    expect(html).toContain("0 chosen");
    expect(html).not.toContain("Authorization needed");
    expect(html).not.toContain("Promise risk");
  });

  it("does not use generic advisor queue labels as Daily Focus outcomes", () => {
    const genericQueueOnlyModel = {
      ...model,
      morningPrioritySources: [],
      staffWorkbook: {
        ...model.staffWorkbook,
        checklistItems: [],
        carryovers: [],
        dailyFocusItems: [],
        quickUpdates: []
      }
    } satisfies ServiceAdvisorWorkspaceModel;

    const html = renderToStaticMarkup(<CooEffectivenessPilotWorkbook model={genericQueueOnlyModel} />);

    expect(html).not.toContain("Authorization needed");
    expect(html).not.toContain("Promise risk");
    expect(html).not.toContain("Suggested from unfinished work");
  });
});
