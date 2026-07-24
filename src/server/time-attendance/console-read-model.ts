import type { AuthenticatedUser } from "@/server/auth/store";

import { calculateTimeCardProjection } from "./time-card";
import {
  TIME_POLICY_PROFILE_TEMPLATES,
  type TimePolicyProfileTemplate
} from "./policy-registry";
import type { TimePolicyAssignmentCandidate } from "./policy-resolution";
import type { TimeAttendanceSourceEvent } from "./normalization";
import { hashTimeCardReplay } from "./replay";

export type TimeAttendanceConsoleStaff = {
  id: string;
  name: string;
  role: string;
  shift: string;
  policyName: string;
  status: "CLOCKED_IN" | "ON_MEAL" | "READY" | "NEEDS_REVIEW";
  statusLabel: string;
  paidMinutes: number;
  mealMinutes: number;
  exceptionCount: number;
};

export type TimeAttendanceConsoleModel = {
  asOfLabel: string;
  currentUserName: string;
  headline: {
    paidHours: string;
    regularHours: string;
    overtimeHours: string;
    esstAccrued: string;
  };
  employeeCard: {
    cardChecksum: string;
    cardId: string;
    shiftLabel: string;
    policyLabel: string;
    statusLabel: string;
    timeCardVersion: number;
    paidMinutes: number;
    attendanceMinutes: number;
    mealMinutes: number;
    payrollReady: boolean;
  };
  timeline: {
    label: string;
    time: string;
    detail: string;
    tone: "good" | "warning" | "neutral";
  }[];
  exceptions: {
    code: string;
    message: string;
    blocking: boolean;
  }[];
  policies: Pick<TimePolicyProfileTemplate, "id" | "name" | "description" | "scheduledMealPolicy">[];
  managerQueue: {
    label: string;
    count: number;
    detail: string;
    tone: "good" | "warning" | "danger" | "neutral";
  }[];
  team: TimeAttendanceConsoleStaff[];
};

const previewAssignments: TimePolicyAssignmentCandidate[] = [
  {
    id: "preview-policy-amina",
    staffUserId: "preview-staff-amina",
    locationId: "TMS-001",
    profileTemplateId: "MN-HOURLY-60-MIN-UNPAID-MEAL",
    effectiveFrom: "2026-01-01T00:00:00.000Z",
    effectiveTo: null,
    overtimeCoverage: "US_FLSA_NONEXEMPT"
  },
  {
    id: "preview-policy-daniel",
    staffUserId: "preview-staff-daniel",
    locationId: "TMS-001",
    profileTemplateId: "MN-HOURLY-30-MIN-PAID-MEAL",
    effectiveFrom: "2026-01-01T00:00:00.000Z",
    effectiveTo: null,
    overtimeCoverage: "US_FLSA_NONEXEMPT"
  }
];

const previewEvents: TimeAttendanceSourceEvent[] = [
  {
    id: "preview-clock-in",
    eventType: "CLOCK_IN",
    occurredAt: "2026-07-23T14:00:00.000Z"
  },
  {
    id: "preview-start-meal",
    eventType: "START_MEAL",
    occurredAt: "2026-07-23T18:00:00.000Z",
    paid: false
  },
  {
    id: "preview-end-meal",
    eventType: "END_MEAL",
    occurredAt: "2026-07-23T18:30:00.000Z",
    paid: false,
    completelyRelieved: true
  },
  {
    id: "preview-clock-out",
    eventType: "CLOCK_OUT",
    occurredAt: "2026-07-23T23:00:00.000Z"
  }
];

function hoursLabel(minutes: number) {
  return `${(minutes / 60).toFixed(2)}h`;
}

export function getTimeAttendanceConsoleModel(user: AuthenticatedUser): TimeAttendanceConsoleModel {
  const projection = calculateTimeCardProjection({
    assignments: previewAssignments,
    events: previewEvents,
    locationId: "TMS-001",
    staffUserId: "preview-staff-amina",
    timeZone: "America/Chicago",
    workInstant: "2026-07-23T14:00:00.000Z"
  });
  const cardChecksum = hashTimeCardReplay({
    exceptions: projection.exceptions,
    intervals: projection.intervals,
    policyId: projection.policy?.profileTemplate.id ?? null,
    staffUserId: projection.staffUserId,
    totals: projection.totals
  });
  const exceptionCount = projection.exceptions.length;

  return {
    asOfLabel: "MVP preview for today’s CCC review",
    currentUserName: user.name,
    headline: {
      paidHours: hoursLabel(projection.totals.paidWorkMinutes),
      regularHours: hoursLabel(projection.totals.regularMinutes),
      overtimeHours: hoursLabel(projection.totals.overtimeMinutes),
      esstAccrued: `${projection.totals.esstNewlyAccruedMinutes} min`
    },
    employeeCard: {
      cardChecksum,
      cardId: "preview-time-card-current-user",
      shiftLabel: "9:00 AM – 6:00 PM",
      policyLabel: projection.policy?.profileTemplate.name ?? "Policy needs assignment",
      statusLabel: projection.payrollReady ? "Ready for payroll review" : "Needs manager review",
      timeCardVersion: 1,
      paidMinutes: projection.totals.paidWorkMinutes,
      attendanceMinutes: projection.totals.attendanceMinutes,
      mealMinutes: projection.totals.mealMinutes,
      payrollReady: projection.payrollReady
    },
    timeline: [
      {
        label: "Clock in",
        time: "9:00 AM",
        detail: "Recorded exact time. No rounding is applied.",
        tone: "good"
      },
      {
        label: "Meal break",
        time: "1:00 PM – 1:30 PM",
        detail: "30 minutes unpaid and completely relieved.",
        tone: "warning"
      },
      {
        label: "Clock out",
        time: "6:00 PM",
        detail: "Total span 9 hours; paid time 8.5 hours after unpaid meal.",
        tone: "neutral"
      }
    ],
    exceptions: projection.exceptions.map((entry) => ({
      code: entry.code,
      message: entry.message,
      blocking: entry.blocking
    })),
    policies: TIME_POLICY_PROFILE_TEMPLATES.map((template) => ({
      id: template.id,
      name: template.name,
      description: template.description,
      scheduledMealPolicy: template.scheduledMealPolicy
    })),
    managerQueue: [
      {
        label: "Meal exceptions",
        count: exceptionCount,
        detail: "Short or missed meal cases need human review before payroll handoff.",
        tone: exceptionCount > 0 ? "warning" : "good"
      },
      {
        label: "Corrections",
        count: 2,
        detail: "Pending requests must keep the original punch trail and manager decision.",
        tone: "neutral"
      },
      {
        label: "Payroll blocks",
        count: projection.payrollReady ? 0 : 1,
        detail: "Blocked cards are held until exceptions are approved or corrected.",
        tone: projection.payrollReady ? "good" : "danger"
      }
    ],
    team: [
      {
        id: "preview-staff-amina",
        name: user.name || "Amina Yusuf",
        role: "Sales / Operations",
        shift: "9:00 AM – 6:00 PM",
        policyName: "60 min unpaid meal",
        status: "NEEDS_REVIEW",
        statusLabel: "Meal review",
        paidMinutes: projection.totals.paidWorkMinutes,
        mealMinutes: projection.totals.mealMinutes,
        exceptionCount
      },
      {
        id: "preview-staff-daniel",
        name: "Daniel Carter",
        role: "Service Advisor",
        shift: "9:00 AM – 5:30 PM",
        policyName: "30 min paid meal",
        status: "CLOCKED_IN",
        statusLabel: "Clocked in",
        paidMinutes: 390,
        mealMinutes: 30,
        exceptionCount: 0
      },
      {
        id: "preview-staff-maya",
        name: "Maya Johnson",
        role: "Office",
        shift: "8:30 AM – 5:00 PM",
        policyName: "60 min unpaid meal",
        status: "READY",
        statusLabel: "Ready",
        paidMinutes: 450,
        mealMinutes: 60,
        exceptionCount: 0
      }
    ]
  };
}
