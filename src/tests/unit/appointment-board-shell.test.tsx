import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  buildAppointmentAgendaSections,
  buildAppointmentAuditTimeline,
  buildAppointmentCommandCenterDigestPreview,
  buildAppointmentCommandCenterDigestSummaries,
  buildAppointmentCommandCenterExport,
  buildAppointmentCommandCenterReport,
  buildAppointmentCommandCenterSearchResults,
  buildAppointmentCommandCenterSavedViewDescription,
  buildAppointmentCommandCenterSubscriptionSummaries,
  buildAppointmentExecutiveReviewBrief,
  buildAppointmentExecutiveReviewModel,
  buildAppointmentOpsIntelligenceModel,
  buildAppointmentOpsLeadershipExport,
  buildAppointmentMonthCells,
  buildAppointmentWeekColumns,
  AppointmentBoardShell,
  buildAppointmentExceptionQueues,
  buildAppointmentResolutionWorkbench,
  buildOutcomeSuccessNotice,
  isProposedScheduleStartInPast,
  isUnscheduledDraftAppointment
} from "@/features/appointments/appointment-board-shell";

describe("appointment board shell", () => {
  it("renders the mockup-aligned board surface with enterprise controls", () => {
    const markup = renderToStaticMarkup(<AppointmentBoardShell />);

    expect(markup).toContain("Appointment Board");
    expect(markup).toContain("1101 E. Lake Street");
    expect(markup).toContain("New Appointment");
    expect(markup).toContain("Total Appointments");
    expect(markup).toContain("Service / Repair");
    expect(markup).toContain("Linked Tasks");
    expect(markup).toContain("Enterprise Controls");
    expect(markup).toContain("Upcoming Appointments");
    expect(markup).toContain("Command Center Exception Queues");
    expect(markup).toContain("Needs Scheduling");
    expect(markup).toContain("Conflict Watch");
    expect(markup).toContain("No-Show Recovery");
    expect(markup).toContain("Follow-Up Required");
    expect(markup).toContain("Resolution Workbench");
    expect(markup).toContain("Queue focus");
    expect(markup).toContain("Select visible");
    expect(markup).toContain("Command Center Audit Timeline");
    expect(markup).toContain("Timeline focus");
    expect(markup).toContain("Reporting &amp; Exports");
    expect(markup).toContain("Export preview");
    expect(markup).toContain("Cross-Appointment Search");
    expect(markup).toContain("Search scope");
    expect(markup).toContain("Saved Views &amp; Subscriptions");
    expect(markup).toContain("Save current view");
    expect(markup).toContain("My Watched Queues");
    expect(markup).toContain("Notification Digests");
    expect(markup).toContain("Digest Preview &amp; Delivery");
    expect(markup).toContain("Shift Handoff Summary");
    expect(markup).toContain("Send now");
    expect(markup).toContain("Executive Review Suite");
    expect(markup).toContain("Daily Operations Brief");
    expect(markup).toContain("Executive Scorecard");
    expect(markup).toContain("Ops Intelligence Suite");
    expect(markup).toContain("Operational Intelligence");
    expect(markup).toContain("Leadership export package");
    expect(markup).toContain("Staff");
    expect(markup).toContain("Location");
    expect(markup).toContain("Resource");
  });

  it("renders admin-provided board settings when available", () => {
    const markup = renderToStaticMarkup(
      <AppointmentBoardShell
        boardSettings={{
          organizationId: "org-time-motor-sales",
          locationId: "loc-time-motor-sales-minneapolis",
          locationName: "Time Motor Sales — Minneapolis",
          timezone: "America/Chicago",
          addressLine: "1101 E. Lake Street, Minneapolis MN 55407",
          phoneNumber: "(612) 724-3631",
          businessHoursLabel: "9:00 AM - 6:00 PM"
        }}
      />
    );

    expect(markup).toContain("1101 E. Lake Street, Minneapolis MN 55407");
    expect(markup).toContain("(612) 724-3631");
    expect(markup).toContain("9:00 AM - 6:00 PM");
  });

  it("summarizes generated follow-up automation after outcome save", () => {
    expect(
      buildOutcomeSuccessNotice({
        appointmentId: "APT-10245",
        result: {
          execution: {
            resultSnapshot: {
              generatedFollowUpAppointmentNumbers: ["FUP-APT-10245-MOCK"],
              automatedTaskCount: 1
            }
          }
        }
      })
    ).toBe(
      "Outcome saved for APT-10245. Completion, outcome, follow-up, history, and command ledger were updated. Draft follow-up appointment created: FUP-APT-10245-MOCK. 1 follow-up task created."
    );
  });

  it("builds a readable description for saved command-center views", () => {
    expect(
      buildAppointmentCommandCenterSavedViewDescription({
        searchQuery: "brock",
        searchPreset: "escalated",
        searchScope: "timeline",
        resolutionFilter: "escalated",
        reportQueueFilter: "escalated",
        reportOwnerFilter: "brock",
        auditTimelineFilter: "manager"
      } as any)
    ).toBe('Preset: escalated · timeline only · query "brock" · manager lane');
  });

  it("summarizes watched queue subscriptions for the command center", () => {
    const summaries = buildAppointmentCommandCenterSubscriptionSummaries({
      appointments: [
        {
          id: "APT-DRAFT",
          title: "Follow-up Draft",
          customer: "Amina Said",
          vehicle: "Registration",
          category: "dmv",
          status: "draft",
          staffId: "rayana",
          staffName: "Rayana Hassan",
          startMinutes: 0,
          durationMinutes: 60,
          phone: "612-555-0100",
          complaint: "Draft needs scheduling",
          location: "Front office",
          confirmation: "Needs schedule placement",
          taskAutomation: [],
          governanceNotes: [],
          startsAtIso: null,
          endsAtIso: null
        },
        {
          id: "APT-NOSHOW",
          title: "Test Drive",
          customer: "Ahmed Ibrahim",
          vehicle: "2018 Toyota Camry",
          category: "sales",
          status: "no-show",
          staffId: "abdi",
          staffName: "Abdi Farah",
          startMinutes: 540,
          durationMinutes: 60,
          phone: "612-555-0102",
          complaint: "Customer did not arrive",
          location: "Sales floor",
          confirmation: "No-show follow-up required",
          attendanceStatus: "NO_SHOW",
          followUpDispositionCode: "CALLBACK_REQUIRED",
          taskAutomation: [],
          governanceNotes: [],
          startsAtIso: "2026-07-07T14:00:00.000Z",
          endsAtIso: "2026-07-07T15:00:00.000Z"
        },
        {
          id: "APT-ESC",
          title: "Service / Repair",
          customer: "Khalid Mohamud",
          vehicle: "Brake Inspection",
          category: "service",
          status: "confirmed",
          staffId: "brock",
          staffName: "Brock Peterson",
          startMinutes: 600,
          durationMinutes: 60,
          phone: "612-555-0101",
          complaint: "Conflict active",
          location: "Service bay",
          confirmation: "Resource conflict needs manager review",
          conflict: true,
          taskAutomation: [],
          governanceNotes: [],
          startsAtIso: "2026-07-07T15:00:00.000Z",
          endsAtIso: "2026-07-07T16:00:00.000Z"
        }
      ] as any,
      resolutionStateByAppointmentId: {
        "APT-ESC": {
          status: "escalated",
          ownerId: "brock",
          ownerName: "Brock Peterson",
          updatedAtLabel: "Just now"
        }
      },
      commandCenterAuditEvents: [
        {
          id: "manager-1",
          appointmentId: "APT-ESC",
          lane: "manager",
          tone: "purple",
          title: "Manager escalation recorded",
          detail: "Manager moved the conflict into an escalation lane.",
          actor: "Abdi Farah",
          occurredAtLabel: "Just now"
        }
      ],
      subscriptions: [
        {
          id: "watch-escalations",
          label: "Escalations",
          description: "Escalated work.",
          enabled: true,
          watchType: "escalated"
        },
        {
          id: "watch-no-show-recovery",
          label: "No-Show Recovery",
          description: "Missed arrivals.",
          enabled: true,
          watchType: "no-show-recovery"
        },
        {
          id: "watch-follow-up-backlog",
          label: "Follow-Up Backlog",
          description: "Follow-up work.",
          enabled: false,
          watchType: "follow-up-backlog"
        },
        {
          id: "watch-manager-activity",
          label: "Manager Activity",
          description: "Manager lane events.",
          enabled: true,
          watchType: "manager-activity"
        }
      ] as any
    });

    expect(summaries.find((summary) => summary.watchType === "escalated")?.count).toBe(1);
    expect(summaries.find((summary) => summary.watchType === "no-show-recovery")?.count).toBe(1);
    expect(summaries.find((summary) => summary.watchType === "follow-up-backlog")?.count).toBe(1);
    expect(summaries.find((summary) => summary.watchType === "manager-activity")?.count).toBeGreaterThan(0);
  });

  it("summarizes notification digests for exception queues and shift handoff", () => {
    const summaries = buildAppointmentCommandCenterDigestSummaries({
      appointments: [
        {
          id: "APT-NOSHOW",
          title: "Test Drive",
          customer: "Ahmed Ibrahim",
          vehicle: "2018 Toyota Camry",
          category: "sales",
          status: "no-show",
          staffId: "abdi",
          staffName: "Abdi Farah",
          startMinutes: 540,
          durationMinutes: 60,
          phone: "612-555-0102",
          complaint: "Customer did not arrive",
          location: "Sales floor",
          confirmation: "No-show follow-up required",
          attendanceStatus: "NO_SHOW",
          followUpDispositionCode: "CALLBACK_REQUIRED",
          taskAutomation: [],
          governanceNotes: [],
          startsAtIso: "2026-07-07T14:00:00.000Z",
          endsAtIso: "2026-07-07T15:00:00.000Z"
        },
        {
          id: "APT-ESC",
          title: "Service / Repair",
          customer: "Khalid Mohamud",
          vehicle: "Brake Inspection",
          category: "service",
          status: "confirmed",
          staffId: "brock",
          staffName: "Brock Peterson",
          startMinutes: 600,
          durationMinutes: 60,
          phone: "612-555-0101",
          complaint: "Conflict active",
          location: "Service bay",
          confirmation: "Resource conflict needs manager review",
          conflict: true,
          taskAutomation: [],
          governanceNotes: [],
          startsAtIso: "2026-07-07T15:00:00.000Z",
          endsAtIso: "2026-07-07T16:00:00.000Z"
        }
      ] as any,
      resolutionStateByAppointmentId: {
        "APT-ESC": {
          status: "escalated",
          ownerId: "brock",
          ownerName: "Brock Peterson",
          updatedAtLabel: "Just now"
        }
      },
      commandCenterAuditEvents: [
        {
          id: "manager-1",
          appointmentId: "APT-ESC",
          lane: "manager",
          tone: "purple",
          title: "Manager escalation recorded",
          detail: "Manager moved the conflict into an escalation lane.",
          actor: "Abdi Farah",
          occurredAtLabel: "Just now"
        }
      ],
      digests: [
        {
          id: "digest-escalations",
          label: "Escalation Digest",
          description: "Escalated work.",
          enabled: true,
          watchType: "escalated",
          channel: "email-summary",
          cadence: "hourly",
          recipientLabel: "General Manager"
        },
        {
          id: "digest-shift-handoff",
          label: "Shift Handoff Digest",
          description: "Handoff scope.",
          enabled: true,
          watchType: "shift-handoff",
          channel: "shift-handoff",
          cadence: "shift-change",
          recipientLabel: "Opening + Closing Manager"
        }
      ] as any
    });

    expect(summaries.find((summary) => summary.watchType === "escalated")?.count).toBe(1);
    expect(summaries.find((summary) => summary.watchType === "shift-handoff")?.count).toBeGreaterThan(0);
    expect(summaries.find((summary) => summary.watchType === "shift-handoff")?.headline).toContain(
      "shift handoff"
    );
  });

  it("builds a digest preview with delivery and queue context", () => {
    const preview = buildAppointmentCommandCenterDigestPreview({
      digest: {
        id: "digest-escalations",
        label: "Escalation Digest",
        description: "Escalated work.",
        enabled: true,
        watchType: "escalated",
        channel: "email-summary",
        cadence: "hourly",
        recipientLabel: "General Manager",
        count: 1,
        tone: "purple",
        headline: "1 escalated appointment still needs ownership or resolution."
      } as any,
      report: {
        generatedForLabel: "Monday, July 6, 2026 · Focus APT-ESC",
        summary: {
          visibleExceptions: 2,
          breachedSla: 1,
          escalated: 1,
          managerEvents: 1
        },
        rows: [
          {
            appointmentId: "APT-ESC",
            customer: "Khalid Mohamud",
            vehicle: "Brake Inspection",
            queueLabel: "Conflict Watch",
            priority: "Critical",
            slaStatus: "breached",
            resolutionStatus: "escalated",
            ownerName: "Brock Peterson",
            recommendedAction: "Manager callback"
          }
        ]
      },
      focusedAppointment: {
        id: "APT-ESC",
        title: "Service / Repair",
        customer: "Khalid Mohamud"
      } as any,
      auditTimelineEvents: [
        {
          id: "manager-1",
          appointmentId: "APT-ESC",
          lane: "manager",
          tone: "purple",
          title: "Manager escalation recorded",
          detail: "Manager moved the conflict into an escalation lane.",
          actor: "Abdi Farah",
          occurredAtLabel: "Just now"
        }
      ],
      businessDate: "Monday, July 6, 2026"
    });

    expect(preview).toContain("Appointment notification digest - Escalation Digest");
    expect(preview).toContain("Recipients: General Manager");
    expect(preview).toContain("Top queue items:");
    expect(preview).toContain("APT-ESC | Conflict Watch | Critical | Brock Peterson | Manager callback");
  });

  it("builds an executive review model from command-center state", () => {
    const report = {
      generatedForLabel: "Monday, July 6, 2026 · Focus APT-ESC",
      summary: {
        visibleExceptions: 3,
        breachedSla: 1,
        escalated: 1,
        managerEvents: 2
      },
      rows: [
        {
          appointmentId: "APT-ESC",
          customer: "Khalid Mohamud",
          vehicle: "Brake Inspection",
          queueLabel: "Conflict Watch",
          priority: "Critical",
          slaStatus: "breached",
          resolutionStatus: "escalated",
          ownerName: "Brock Peterson",
          recommendedAction: "Manager callback"
        }
      ]
    } as any;

    const model = buildAppointmentExecutiveReviewModel({
      report,
      exceptionQueues: [
        { key: "no-show-recovery", items: [{ id: "APT-NOSHOW" }] },
        { key: "follow-up-required", items: [{ id: "APT-FOLLOW" }, { id: "APT-FOLLOW-2" }] }
      ] as any,
      selectedAppointmentAuditTimeline: [
        { lane: "manager" },
        { lane: "automation" }
      ] as any,
      subscriptions: [
        { enabled: true },
        { enabled: true },
        { enabled: false }
      ] as any,
      digests: [
        { enabled: true },
        { enabled: true },
        { enabled: false }
      ] as any,
      digestHistory: [
        { status: "sent", channel: "email-summary" },
        { status: "previewed", channel: "in-app" },
        { status: "sent", channel: "email-summary" }
      ] as any
    });

    expect(model.headline).toContain("breached SLA");
    expect(model.metrics.find((metric) => metric.label === "Breached SLA")?.value).toBe("1");
    expect(model.trends.find((trend) => trend.label === "Customer recovery")?.value).toContain(
      "3 recovery items"
    );
    expect(
      model.digestPerformance.find((metric) => metric.label === "Delivered digests")?.value
    ).toBe("2");
  });

  it("builds an executive review brief with scorecard and trend sections", () => {
    const brief = buildAppointmentExecutiveReviewBrief({
      preset: "daily-ops",
      businessDate: "Monday, July 6, 2026",
      model: {
        headline: "Board operations are stable.",
        metrics: [
          {
            label: "Visible exceptions",
            value: "3",
            tone: "blue",
            detail: "Current command-center workbench items visible in the active scope."
          }
        ],
        trends: [
          {
            label: "SLA pressure",
            status: "watch",
            value: "1 breached",
            detail: "Leadership intervention is recommended."
          }
        ],
        digestPerformance: [
          {
            label: "Delivered digests",
            value: "2",
            detail: "Notification digests sent from the command center."
          }
        ]
      } as any,
      report: {
        rows: [
          {
            appointmentId: "APT-ESC",
            queueLabel: "Conflict Watch",
            priority: "Critical",
            slaStatus: "breached",
            ownerName: "Brock Peterson"
          }
        ]
      } as any,
      selectedAppointment: {
        id: "APT-ESC",
        title: "Service / Repair",
        customer: "Khalid Mohamud"
      } as any
    });

    expect(brief).toContain("Appointment executive review brief - Daily Ops");
    expect(brief).toContain("Scorecard:");
    expect(brief).toContain("Trend watch:");
    expect(brief).toContain("Digest performance:");
    expect(brief).toContain("APT-ESC | Conflict Watch | Critical | breached | Brock Peterson");
  });

  it("builds agenda, week, and month board views from the visible appointment scope", () => {
    const appointments = [
      {
        id: "APT-1",
        title: "Service / Repair",
        customer: "Khalid Mohamud",
        vehicle: "Brake Inspection",
        category: "service",
        status: "confirmed",
        staffId: "brock",
        staffName: "Brock Peterson",
        startMinutes: 600,
        durationMinutes: 60,
        phone: "612-555-0101",
        complaint: "Conflict active",
        location: "Service bay",
        confirmation: "Resource conflict needs manager review",
        taskAutomation: [],
        governanceNotes: [],
        startsAtIso: "2026-07-06T15:00:00.000Z",
        endsAtIso: "2026-07-06T16:00:00.000Z"
      },
      {
        id: "APT-2",
        title: "Vehicle Delivery",
        customer: "Farah Abdi",
        vehicle: "2021 Toyota RAV4",
        category: "delivery",
        status: "follow-up",
        staffId: "mohamed",
        staffName: "Mohamed Ali",
        startMinutes: 780,
        durationMinutes: 60,
        phone: "612-555-0103",
        complaint: "Delivery follow-up",
        location: "Delivery bay",
        confirmation: "Callback required",
        taskAutomation: [],
        governanceNotes: [],
        startsAtIso: "2026-07-08T18:00:00.000Z",
        endsAtIso: "2026-07-08T19:00:00.000Z"
      }
    ] as any;

    const agenda = buildAppointmentAgendaSections({
      appointments,
      timezone: "America/Chicago",
      fallbackDateKey: "2026-07-06"
    });
    const week = buildAppointmentWeekColumns({
      appointments,
      timezone: "America/Chicago",
      boardDateKey: "2026-07-06"
    });
    const month = buildAppointmentMonthCells({
      appointments,
      timezone: "America/Chicago",
      boardDateKey: "2026-07-06"
    });

    expect(agenda).toHaveLength(2);
    expect(agenda[0]?.items[0]?.id).toBe("APT-1");
    expect(week.find((column) => column.dateKey === "2026-07-06")?.items).toHaveLength(1);
    expect(week.find((column) => column.dateKey === "2026-07-08")?.items).toHaveLength(1);
    expect(month.find((cell) => cell.dateKey === "2026-07-06")?.items).toHaveLength(1);
    expect(month.find((cell) => cell.dateKey === "2026-07-08")?.items).toHaveLength(1);
  });

  it("builds ops intelligence metrics, drilldowns, and digest analytics", () => {
    const model = buildAppointmentOpsIntelligenceModel({
      report: {
        generatedForLabel: "Monday, July 6, 2026 · Focus APT-ESC",
        summary: {
          visibleExceptions: 5,
          breachedSla: 1,
          escalated: 2,
          managerEvents: 3
        },
        rows: []
      } as any,
      exceptionQueues: [
        { key: "no-show-recovery", items: [{ id: "APT-NOSHOW" }] },
        { key: "follow-up-required", items: [{ id: "APT-FOLLOW" }, { id: "APT-FOLLOW-2" }] }
      ] as any,
      subscriptions: [
        { label: "Breached SLA", enabled: true, count: 1 },
        { label: "Escalations", enabled: true, count: 2 },
        { label: "Follow-Up Backlog", enabled: false, count: 2 }
      ] as any,
      digests: [
        { enabled: true },
        { enabled: true },
        { enabled: false }
      ] as any,
      digestHistory: [
        { status: "sent" },
        { status: "previewed" },
        { status: "sent" }
      ] as any
    });

    expect(model.headline).toContain("escalated");
    expect(model.metrics.find((metric) => metric.label === "Digest send rate")?.value).toBe("67%");
    expect(model.drilldowns.find((drilldown) => drilldown.label === "Escalation drilldown")?.count).toBe(2);
    expect(model.digestAnalytics.find((metric) => metric.label === "Most active watch")?.value).toBe(
      "Escalations"
    );
  });

  it("builds an ops intelligence leadership export package", () => {
    const exportPreview = buildAppointmentOpsLeadershipExport({
      preset: "leadership-daily",
      businessDate: "Monday, July 6, 2026",
      model: {
        headline: "2 escalated and 1 breached item define the highest operational pressure right now.",
        metrics: [
          {
            label: "Queue coverage",
            value: "5",
            tone: "blue",
            detail: "Visible command-center exception items."
          }
        ],
        drilldowns: [
          {
            label: "Escalation drilldown",
            count: 2,
            detail: "Manager-owned workbench items.",
            actionHint: "Open escalated workbench scope",
            tone: "purple",
            filter: "escalated"
          }
        ],
        digestAnalytics: [
          {
            label: "Sent vs previewed",
            value: "2 / 1",
            detail: "Recent digest history split."
          }
        ]
      } as any,
      report: {
        rows: [{ appointmentId: "APT-ESC" }]
      } as any,
      executiveBrief: "Embedded executive review brief"
    });

    expect(exportPreview).toContain("Appointment ops intelligence export - Leadership Daily");
    expect(exportPreview).toContain("Operational scorecard:");
    expect(exportPreview).toContain("Drilldowns:");
    expect(exportPreview).toContain("Digest analytics:");
    expect(exportPreview).toContain("Embedded executive review brief");
  });

  it("classifies missing-time draft appointments as unscheduled board items", () => {
    expect(
      isUnscheduledDraftAppointment({
        status: "draft",
        startsAtIso: null,
        endsAtIso: null
      })
    ).toBe(true);

    expect(
      isUnscheduledDraftAppointment({
        status: "draft",
        startsAtIso: "2026-07-06T15:00:00.000Z",
        endsAtIso: "2026-07-06T16:00:00.000Z"
      })
    ).toBe(false);

    expect(
      isUnscheduledDraftAppointment({
        status: "confirmed",
        startsAtIso: null,
        endsAtIso: null
      })
    ).toBe(false);
  });

  it("builds manager exception queues for scheduling gaps, conflicts, no-shows, and follow-up work", () => {
    const queues = buildAppointmentExceptionQueues([
      {
        id: "APT-DRAFT",
        title: "Follow-up Draft",
        customer: "Amina Said",
        vehicle: "Registration",
        category: "dmv",
        status: "draft",
        staffId: "rayana",
        staffName: "Rayana Hassan",
        startMinutes: 0,
        durationMinutes: 60,
        phone: "612-555-0100",
        complaint: "Draft needs scheduling",
        location: "Front office",
        confirmation: "Needs schedule placement",
        taskAutomation: [],
        governanceNotes: [],
        startsAtIso: null,
        endsAtIso: null
      },
      {
        id: "APT-CONFLICT",
        title: "Service / Repair",
        customer: "Khalid Mohamud",
        vehicle: "Brake Inspection",
        category: "service",
        status: "confirmed",
        staffId: "brock",
        staffName: "Brock Peterson",
        startMinutes: 600,
        durationMinutes: 60,
        phone: "612-555-0101",
        complaint: "Conflict active",
        location: "Service bay",
        confirmation: "Resource conflict needs manager review",
        conflict: true,
        taskAutomation: [],
        governanceNotes: [],
        startsAtIso: "2026-07-07T15:00:00.000Z",
        endsAtIso: "2026-07-07T16:00:00.000Z"
      },
      {
        id: "APT-NOSHOW",
        title: "Test Drive",
        customer: "Ahmed Ibrahim",
        vehicle: "2018 Toyota Camry",
        category: "sales",
        status: "no-show",
        staffId: "abdi",
        staffName: "Abdi Farah",
        startMinutes: 540,
        durationMinutes: 60,
        phone: "612-555-0102",
        complaint: "Customer did not arrive",
        location: "Sales floor",
        confirmation: "No-show follow-up required",
        attendanceStatus: "NO_SHOW",
        followUpDispositionCode: "CALLBACK_REQUIRED",
        taskAutomation: [],
        governanceNotes: [],
        startsAtIso: "2026-07-07T14:00:00.000Z",
        endsAtIso: "2026-07-07T15:00:00.000Z"
      },
      {
        id: "APT-FOLLOWUP",
        title: "Vehicle Delivery",
        customer: "Farah Abdi",
        vehicle: "2021 Toyota RAV4",
        category: "delivery",
        status: "follow-up",
        staffId: "mohamed",
        staffName: "Mohamed Ali",
        startMinutes: 780,
        durationMinutes: 60,
        phone: "612-555-0103",
        complaint: "Delivery follow-up",
        location: "Delivery bay",
        confirmation: "Callback required",
        needsFollowUp: true,
        followUpDispositionCode: "FOLLOW_UP_APPOINTMENT_REQUIRED",
        taskAutomation: [],
        governanceNotes: [],
        startsAtIso: "2026-07-07T18:00:00.000Z",
        endsAtIso: "2026-07-07T19:00:00.000Z"
      }
    ] as any);

    expect(queues.find((queue) => queue.key === "needs-scheduling")?.items.map((item) => item.id)).toEqual([
      "APT-DRAFT"
    ]);
    expect(queues.find((queue) => queue.key === "conflict-watch")?.items.map((item) => item.id)).toEqual([
      "APT-CONFLICT"
    ]);
    expect(queues.find((queue) => queue.key === "no-show-recovery")?.items.map((item) => item.id)).toEqual([
      "APT-NOSHOW"
    ]);
    expect(queues.find((queue) => queue.key === "follow-up-required")?.items.map((item) => item.id)).toEqual([
      "APT-NOSHOW",
      "APT-FOLLOWUP"
    ]);
  });

  it("builds a sorted resolution workbench and hides dormant items by default", () => {
    const workbenchItems = buildAppointmentResolutionWorkbench(
      [
        {
          id: "APT-SNOOZED",
          title: "Draft Follow-Up",
          customer: "Amina Said",
          vehicle: "Registration",
          category: "dmv",
          status: "draft",
          staffId: "rayana",
          staffName: "Rayana Hassan",
          startMinutes: 0,
          durationMinutes: 60,
          phone: "612-555-0100",
          complaint: "Draft needs scheduling",
          location: "Front office",
          confirmation: "Needs schedule placement",
          taskAutomation: [],
          governanceNotes: [],
          startsAtIso: null,
          endsAtIso: null
        },
        {
          id: "APT-CONFLICT",
          title: "Service / Repair",
          customer: "Khalid Mohamud",
          vehicle: "Brake Inspection",
          category: "service",
          status: "confirmed",
          staffId: "brock",
          staffName: "Brock Peterson",
          startMinutes: 600,
          durationMinutes: 60,
          phone: "612-555-0101",
          complaint: "Conflict active",
          location: "Service bay",
          confirmation: "Resource conflict needs manager review",
          conflict: true,
          taskAutomation: [],
          governanceNotes: [],
          startsAtIso: "2026-07-07T15:00:00.000Z",
          endsAtIso: "2026-07-07T16:00:00.000Z"
        },
        {
          id: "APT-NOSHOW",
          title: "Test Drive",
          customer: "Ahmed Ibrahim",
          vehicle: "2018 Toyota Camry",
          category: "sales",
          status: "no-show",
          staffId: "abdi",
          staffName: "Abdi Farah",
          startMinutes: 540,
          durationMinutes: 60,
          phone: "612-555-0102",
          complaint: "Customer did not arrive",
          location: "Sales floor",
          confirmation: "No-show follow-up required",
          attendanceStatus: "NO_SHOW",
          followUpDispositionCode: "CALLBACK_REQUIRED",
          taskAutomation: [],
          governanceNotes: [],
          startsAtIso: "2026-07-07T14:00:00.000Z",
          endsAtIso: "2026-07-07T15:00:00.000Z"
        }
      ] as any,
      {
        "APT-SNOOZED": {
          status: "snoozed",
          ownerId: "rayana",
          ownerName: "Rayana Hassan",
          snoozedUntilLabel: "Tomorrow 9:00 AM",
          updatedAtLabel: "Snoozed just now"
        },
        "APT-CONFLICT": {
          status: "escalated",
          ownerId: "abdi",
          ownerName: "Abdi Farah",
          updatedAtLabel: "Escalated just now"
        }
      },
      {
        sort: "priority"
      }
    );

    expect(workbenchItems.map((item) => item.appointment.id)).toEqual([
      "APT-NOSHOW",
      "APT-CONFLICT"
    ]);
    expect(workbenchItems[0]?.priority).toBe("Critical");
    expect(workbenchItems[0]?.slaStatus).toBe("breached");
    expect(workbenchItems[1]?.resolutionStatus).toBe("escalated");
  });

  it("can include dormant items and filter workbench results", () => {
    const workbenchItems = buildAppointmentResolutionWorkbench(
      [
        {
          id: "APT-DRAFT",
          title: "Draft Follow-Up",
          customer: "Amina Said",
          vehicle: "Registration",
          category: "dmv",
          status: "draft",
          staffId: "rayana",
          staffName: "Rayana Hassan",
          startMinutes: 0,
          durationMinutes: 60,
          phone: "612-555-0100",
          complaint: "Draft needs scheduling",
          location: "Front office",
          confirmation: "Needs schedule placement",
          taskAutomation: [],
          governanceNotes: [],
          startsAtIso: null,
          endsAtIso: null
        },
        {
          id: "APT-CONFLICT",
          title: "Service / Repair",
          customer: "Khalid Mohamud",
          vehicle: "Brake Inspection",
          category: "service",
          status: "confirmed",
          staffId: "brock",
          staffName: "Brock Peterson",
          startMinutes: 600,
          durationMinutes: 60,
          phone: "612-555-0101",
          complaint: "Conflict active",
          location: "Service bay",
          confirmation: "Resource conflict needs manager review",
          conflict: true,
          taskAutomation: [],
          governanceNotes: [],
          startsAtIso: "2026-07-07T15:00:00.000Z",
          endsAtIso: "2026-07-07T16:00:00.000Z"
        }
      ] as any,
      {
        "APT-DRAFT": {
          status: "snoozed",
          ownerId: "rayana",
          ownerName: "Rayana Hassan",
          snoozedUntilLabel: "Tomorrow 9:00 AM",
          updatedAtLabel: "Snoozed just now"
        }
      },
      {
        includeDormant: true,
        filter: "needs-scheduling",
        sort: "age"
      }
    );

    expect(workbenchItems.map((item) => item.appointment.id)).toEqual(["APT-DRAFT"]);
    expect(workbenchItems[0]?.resolutionStatus).toBe("snoozed");
    expect(workbenchItems[0]?.snoozedUntilLabel).toBe("Tomorrow 9:00 AM");
  });

  it("builds an audit timeline with baseline history and manager actions", () => {
    const timeline = buildAppointmentAuditTimeline({
      appointment: {
        id: "APT-NOSHOW",
        title: "Test Drive",
        customer: "Ahmed Ibrahim",
        vehicle: "2018 Toyota Camry",
        category: "sales",
        status: "no-show",
        staffId: "abdi",
        staffName: "Abdi Farah",
        startMinutes: 540,
        durationMinutes: 60,
        phone: "612-555-0102",
        complaint: "Customer did not arrive",
        location: "Sales floor",
        confirmation: "No-show follow-up required",
        attendanceStatus: "NO_SHOW",
        followUpDispositionCode: "CALLBACK_REQUIRED",
        taskAutomation: ["No-show callback", "Lead recovery"],
        linkedTasks: [
          {
            id: "task-link-1",
            taskId: "TASK-1",
            title: "Call customer back",
            status: "IN_PROGRESS",
            dueAt: "2026-07-07T16:00:00.000Z",
            assignedUserName: "Abdi Farah",
            linkType: "FOLLOW_UP",
            linkTitle: "Lead recovery",
            explanation: null,
            isRequired: true,
            blocksAppointment: false,
            appointmentRequiredForTask: false
          }
        ],
        governanceNotes: []
      } as any,
      resolutionState: {
        status: "escalated",
        ownerId: "abdi",
        ownerName: "Abdi Farah",
        note: "Customer asked for manager callback.",
        updatedAtLabel: "Escalated just now"
      },
      commandCenterEvents: [
        {
          id: "manual-event-1",
          appointmentId: "APT-NOSHOW",
          lane: "manager",
          tone: "purple",
          title: "Manager escalation recorded",
          detail: "Escalated into the manager lane under Abdi Farah.",
          actor: "Abdi Farah",
          occurredAtLabel: "Just now"
        }
      ]
    });

    expect(timeline[0]?.title).toBe("Manager escalation recorded");
    expect(timeline.map((event) => event.lane)).toEqual(
      expect.arrayContaining(["manager", "automation", "task", "appointment"])
    );
    expect(timeline.some((event) => event.title === "Exception queue surfaced")).toBe(true);
  });

  it("builds a command-center report snapshot from visible workbench items", () => {
    const report = buildAppointmentCommandCenterReport({
      generatedForLabel: "Monday, July 6, 2026 · Focus APT-NOSHOW",
      workbenchItems: [
        {
          appointment: {
            id: "APT-NOSHOW",
            customer: "Ahmed Ibrahim",
            vehicle: "2018 Toyota Camry"
          },
          queueKey: "no-show-recovery",
          queueLabel: "No-Show Recovery",
          priority: "Critical",
          priorityRank: 0,
          ageHours: 2.5,
          slaStatus: "breached",
          recommendedAction: "Recover customer",
          ownerName: "Abdi Farah",
          resolutionStatus: "escalated",
          lastActionLabel: "Escalated just now"
        },
        {
          appointment: {
            id: "APT-CONFLICT",
            customer: "Khalid Mohamud",
            vehicle: "Brake Inspection"
          },
          queueKey: "conflict-watch",
          queueLabel: "Conflict Watch",
          priority: "High",
          priorityRank: 1,
          ageHours: 1.2,
          slaStatus: "at-risk",
          recommendedAction: "Rebalance resources",
          ownerName: "Brock Peterson",
          resolutionStatus: "assigned",
          lastActionLabel: "Assigned just now"
        }
      ] as any,
      auditTimelineEvents: [
        {
          id: "manager-event-1",
          appointmentId: "APT-NOSHOW",
          lane: "manager",
          tone: "purple",
          title: "Manager escalation recorded",
          detail: "Escalated into the manager lane under Abdi Farah.",
          actor: "Abdi Farah",
          occurredAtLabel: "Just now"
        }
      ]
    });

    expect(report.summary).toEqual({
      visibleExceptions: 2,
      breachedSla: 1,
      escalated: 1,
      managerEvents: 1
    });
    expect(report.rows[0]).toMatchObject({
      appointmentId: "APT-NOSHOW",
      queueLabel: "No-Show Recovery",
      priority: "Critical"
    });
  });

  it("renders command-center exports in summary, csv, and audit json formats", () => {
    const report = buildAppointmentCommandCenterReport({
      generatedForLabel: "Monday, July 6, 2026 · Focus APT-NOSHOW",
      workbenchItems: [
        {
          appointment: {
            id: "APT-NOSHOW",
            customer: "Ahmed Ibrahim",
            vehicle: "2018 Toyota Camry"
          },
          queueKey: "no-show-recovery",
          queueLabel: "No-Show Recovery",
          priority: "Critical",
          priorityRank: 0,
          ageHours: 2.5,
          slaStatus: "breached",
          recommendedAction: "Recover customer",
          ownerName: "Abdi Farah",
          resolutionStatus: "escalated",
          lastActionLabel: "Escalated just now"
        }
      ] as any,
      auditTimelineEvents: [
        {
          id: "manager-event-1",
          appointmentId: "APT-NOSHOW",
          lane: "manager",
          tone: "purple",
          title: "Manager escalation recorded",
          detail: "Escalated into the manager lane under Abdi Farah.",
          actor: "Abdi Farah",
          occurredAtLabel: "Just now"
        }
      ]
    });

    const summaryExport = buildAppointmentCommandCenterExport({
      format: "summary",
      report,
      auditTimelineEvents: []
    });
    const csvExport = buildAppointmentCommandCenterExport({
      format: "csv",
      report,
      auditTimelineEvents: []
    });
    const jsonExport = buildAppointmentCommandCenterExport({
      format: "audit-json",
      report,
      auditTimelineEvents: [
        {
          id: "manager-event-1",
          appointmentId: "APT-NOSHOW",
          lane: "manager",
          tone: "purple",
          title: "Manager escalation recorded",
          detail: "Escalated into the manager lane under Abdi Farah.",
          actor: "Abdi Farah",
          occurredAtLabel: "Just now"
        }
      ]
    });

    expect(summaryExport).toContain("Appointment command center report");
    expect(summaryExport).toContain("Visible exceptions: 1");
    expect(csvExport).toContain("appointment_id,customer,vehicle,queue");
    expect(csvExport).toContain("\"APT-NOSHOW\"");
    expect(jsonExport).toContain("\"auditTimelineEvents\"");
    expect(jsonExport).toContain("\"Manager escalation recorded\"");
  });

  it("builds cross-appointment search results for appointment and manager activity discovery", () => {
    const results = buildAppointmentCommandCenterSearchResults({
      appointments: [
        {
          id: "APT-NOSHOW",
          title: "Test Drive",
          customer: "Ahmed Ibrahim",
          vehicle: "2018 Toyota Camry",
          category: "sales",
          status: "no-show",
          staffId: "abdi",
          staffName: "Abdi Farah",
          startMinutes: 540,
          durationMinutes: 60,
          phone: "612-555-0102",
          complaint: "Customer did not arrive",
          location: "Sales floor",
          confirmation: "No-show follow-up required",
          attendanceStatus: "NO_SHOW",
          followUpDispositionCode: "CALLBACK_REQUIRED",
          taskAutomation: ["No-show callback"],
          governanceNotes: []
        },
        {
          id: "APT-CONFLICT",
          title: "Service / Repair",
          customer: "Khalid Mohamud",
          vehicle: "Brake Inspection",
          category: "service",
          status: "confirmed",
          staffId: "brock",
          staffName: "Brock Peterson",
          startMinutes: 600,
          durationMinutes: 60,
          phone: "612-555-0101",
          complaint: "Conflict active",
          location: "Service bay",
          confirmation: "Resource conflict needs manager review",
          conflict: true,
          taskAutomation: [],
          governanceNotes: []
        }
      ] as any,
      resolutionStateByAppointmentId: {
        "APT-NOSHOW": {
          status: "escalated",
          ownerId: "abdi",
          ownerName: "Abdi Farah",
          updatedAtLabel: "Escalated just now"
        }
      },
      query: "abdi",
      preset: "manager-activity",
      scope: "all",
      commandCenterAuditEvents: [
        {
          id: "manager-event-1",
          appointmentId: "APT-NOSHOW",
          lane: "manager",
          tone: "purple",
          title: "Manager escalation recorded",
          detail: "Escalated into the manager lane under Abdi Farah.",
          actor: "Abdi Farah",
          occurredAtLabel: "Just now"
        }
      ]
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results.every((result) => result.kind === "timeline")).toBe(true);
    expect(results[0]?.title).toContain("APT-NOSHOW");
    expect(results[0]?.badge).toContain("event");
  });

  it("finds appointment discovery results across ids, owners, and queue state", () => {
    const results = buildAppointmentCommandCenterSearchResults({
      appointments: [
        {
          id: "APT-FOLLOWUP",
          title: "Vehicle Delivery",
          customer: "Farah Abdi",
          vehicle: "2021 Toyota RAV4",
          category: "delivery",
          status: "follow-up",
          staffId: "mohamed",
          staffName: "Mohamed Ali",
          startMinutes: 780,
          durationMinutes: 60,
          phone: "612-555-0103",
          complaint: "Delivery follow-up",
          location: "Delivery bay",
          confirmation: "Callback required",
          needsFollowUp: true,
          followUpDispositionCode: "FOLLOW_UP_APPOINTMENT_REQUIRED",
          taskAutomation: [],
          governanceNotes: []
        }
      ] as any,
      resolutionStateByAppointmentId: {
        "APT-FOLLOWUP": {
          status: "assigned",
          ownerId: "mohamed",
          ownerName: "Mohamed Ali",
          updatedAtLabel: "Assigned just now"
        }
      },
      query: "mohamed",
      preset: "all",
      scope: "appointments"
    });

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      appointmentId: "APT-FOLLOWUP",
      kind: "appointment"
    });
    expect(results[0]?.detail).toContain("Mohamed Ali");
  });

  it("detects proposed draft schedule starts that are already in the past", () => {
    expect(
      isProposedScheduleStartInPast({
        localDate: "2026-07-06",
        startTime: "09:30",
        now: new Date("2026-07-06T15:00:00.000Z")
      })
    ).toBe(true);

    expect(
      isProposedScheduleStartInPast({
        localDate: "2026-07-06",
        startTime: "10:30",
        now: new Date("2026-07-06T15:00:00.000Z")
      })
    ).toBe(false);
  });
});
