import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { TimeAttendanceConsole } from "@/features/time-attendance/time-attendance-console";
import type { TimeAttendanceCaptureState } from "@/server/time-attendance/capture-state";
import type { TimeAttendanceConsoleModel } from "@/server/time-attendance/console-read-model";
import type { TimeAttendanceHardeningPilotReadiness } from "@/server/time-attendance/hardening-pilot-service";
import type { TimeAttendanceManagerReviewQueue } from "@/server/time-attendance/manager-review";
import type { PayrollHandoffReadiness } from "@/server/time-attendance/payroll-handoff-service";

const captureState: TimeAttendanceCaptureState = {
  allowedActions: ["START_MEAL", "CLOCK_OUT"],
  expectedVersion: 7,
  lastAcceptedPunch: { eventType: "CLOCK_IN", occurredAt: "2026-09-15T13:00:00.000Z" },
  locationId: "loc-1",
  nextPrimaryAction: "START_MEAL",
  paidRestActive: false,
  session: { id: "session-1", openedAt: "2026-09-15T13:00:00.000Z", state: "OPEN", version: 3 },
  staffUserId: "staff-1",
  state: "OPEN",
  statusLabel: "Clocked in",
  timezone: "America/Chicago"
};

const model: TimeAttendanceConsoleModel = {
  asOfLabel: "Sep 15, 2026, 10:00 AM",
  currentUserName: "Morgan Manager",
  dataState: "LIVE",
  employeeCard: {
    approvalStatus: "Not yet approved",
    attendanceMinutes: 480,
    attestationStatus: "Recorded for version 4",
    available: true,
    cardChecksum: "sha256:clean-card",
    cardId: "card-clean-1",
    mealMinutes: 30,
    paidMinutes: 450,
    payrollReady: false,
    policyLabel: "Standard hourly",
    shiftLabel: "8:00 AM - 4:30 PM",
    statusLabel: "Attested",
    timeCardVersion: 4
  },
  exceptions: [{ blocking: false, code: "EARLY_MEAL", message: "Meal started before the policy target." }],
  generatedAt: "2026-09-15T15:00:00.000Z",
  headline: { esstAccrued: "14 min", overtimeHours: "0.00h", paidHours: "7.50h", regularHours: "7.50h" },
  managerQueue: [
    { count: 1, detail: "Clean attested cards ready for approval.", label: "Clean approvals", tone: "good" }
  ],
  nextAction: {
    detail: "Confirm this exact card version or dispute it for manager review.",
    href: "/time-attendance?view=my-time#card-attestation",
    label: "Review and attest"
  },
  notifications: [{
    body: "No active approved time policy assignment covers this employee, location, and work date.",
    createdAt: "2026-09-15T14:45:00.000Z",
    id: "notice-1",
    severity: "WARNING",
    title: "Time card policy setup required",
    unread: true
  }],
  permissions: { employee: true, manager: true, payroll: true, policies: true },
  policies: [{
    description: "Weekly policy with unpaid meal.",
    id: "policy-1",
    name: "Standard hourly - v1 - Active",
    scheduledMealPolicy: { expectedMealMinutes: 30, paid: false }
  }],
  corrections: [],
  sourceLabel: "Live persisted attendance, policy, card, and review records",
  team: [{
    exceptionCount: 0,
    id: "staff-2",
    mealMinutes: 30,
    name: "Alex Staff",
    paidMinutes: 450,
    policyName: "Standard hourly",
    role: "Advisor",
    shift: "8:00 AM - 4:30 PM",
    status: "NEEDS_REVIEW",
    statusLabel: "Needs review"
  }],
  timeOff: [],
  timeline: [{
    detail: "Accepted from kiosk; exact recorded time preserved.",
    id: "event-1",
    label: "Clock in",
    time: "Sep 15, 2026, 8:00 AM",
    tone: "good"
  }]
};

const managerReviewQueue: TimeAttendanceManagerReviewQueue = {
  generatedAt: "2026-09-15T15:00:00.000Z",
  items: [{
    ageLabel: "20m",
    cardChecksum: "sha256:clean-card",
    category: "CARD_APPROVAL",
    detail: "Attested card v4 has no blocking exceptions or open corrections.",
    href: "/time-attendance?view=manager&card=card-clean-1",
    id: "card-clean-1",
    occurredAt: "2026-09-15T14:40:00.000Z",
    severity: "info",
    staffName: "Alex Staff",
    status: "Eligible for approval",
    timeCardVersion: 4,
    title: "Pay-period card 2026-09-09 - 2026-09-15"
  }],
  permitted: true,
  totals: { all: 1, blocking: 0, corrections: 0, disputes: 0, exceptions: 0, timeOff: 0 }
};

const payrollReadiness: PayrollHandoffReadiness = {
  generatedAt: "2026-09-15T15:00:00.000Z",
  items: [],
  locationId: "loc-1",
  organizationId: "org-1",
  payPeriod: { end: "2026-09-15", start: "2026-09-09" },
  ready: true,
  totals: {
    approvedCards: 1,
    blockingItems: 0,
    cardCount: 1,
    lockedOrExportedBatches: 0,
    openSessions: 0,
    pendingCorrections: 0,
    pendingTimeOff: 0,
    warningItems: 0
  }
};

const hardeningReadiness: TimeAttendanceHardeningPilotReadiness = {
  generatedAt: "2026-09-15T15:00:00.000Z",
  gates: [],
  permitted: true,
  phase: "TA-G5",
  pilotEligible: false,
  productionEligible: false,
  totals: { blocked: 0, evidenceRequired: 0, gates: 0, sourceReady: 0 }
};

describe("time attendance console release UX", () => {
  it("puts clock actions at the top of employee views", () => {
    const markup = renderToStaticMarkup(
      <TimeAttendanceConsole
        activeView="today"
        captureState={captureState}
        density="calm"
        hardeningReadiness={hardeningReadiness}
        managerReviewQueue={managerReviewQueue}
        model={model}
        payrollReadiness={payrollReadiness}
      />
    );

    expect(markup.indexOf("Clock in / clock out")).toBeLessThan(markup.indexOf("Time card command bar"));
    expect(markup).toContain("Clock out");
    expect(markup).toContain("Meal and break actions");
  });

  it("renders command search, responsive jumps, manager bulk approval, and audit affordances", () => {
    const markup = renderToStaticMarkup(
      <TimeAttendanceConsole
        activeView="manager"
        captureState={captureState}
        density="calm"
        hardeningReadiness={hardeningReadiness}
        managerReviewQueue={managerReviewQueue}
        model={model}
        payrollReadiness={payrollReadiness}
      />
    );

    expect(markup).toContain("Time card command bar");
    expect(markup).toContain("Search staff, actions, exceptions, or payroll work");
    expect(markup).toContain("Time card workflow");
    expect(markup).toContain("Jump to time card section");
    expect(markup).toContain("Bulk approval");
    expect(markup).toContain("Only attested cards with no blocking exceptions or open corrections can be bulk approved.");
    expect(markup).toContain("Select Pay-period card 2026-09-09 - 2026-09-15 for bulk approval");
    expect(markup).toContain("Audit");
    expect(markup).toContain("Internal inbox");
    expect(markup).toContain("1 unread");
    expect(markup).toContain("/time-attendance?view=my-time#card-attestation");
  });
});
