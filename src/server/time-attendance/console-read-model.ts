import { Prisma } from "@prisma/client";

import type { AuthenticatedUser } from "@/server/auth/store";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { prisma } from "@/server/db/client";
import { getTimeAttendanceCapabilitySet } from "./capabilities";

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
  generatedAt: string;
  sourceLabel: string;
  dataState: "LIVE" | "EMPTY" | "UNAVAILABLE";
  unavailableReason?: string;
  currentUserName: string;
  nextAction: { label: string; detail: string; href: string };
  permissions: {
    employee: boolean;
    manager: boolean;
    policies: boolean;
    payroll: boolean;
  };
  headline: {
    paidHours: string;
    regularHours: string;
    overtimeHours: string;
    esstAccrued: string;
  };
  employeeCard: {
    available: boolean;
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
    attestationStatus: string;
    approvalStatus: string;
  };
  timeline: {
    id: string;
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
  policies: {
    id: string;
    name: string;
    description: string;
    scheduledMealPolicy: { expectedMealMinutes: number; paid: boolean };
  }[];
  managerQueue: {
    label: string;
    count: number;
    detail: string;
    tone: "good" | "warning" | "danger" | "neutral";
  }[];
  team: TimeAttendanceConsoleStaff[];
  timeOff: {
    statusLabel: string;
    requestType: string;
    startsAt: string;
  }[];
  corrections: {
    id: string;
    changeType: string;
    requestedAt: string;
    statusLabel: string;
    managerReason: string | null;
  }[];
  notifications: {
    id: string;
    title: string;
    body: string;
    severity: string;
    createdAt: string;
    unread: boolean;
  }[];
};

function objectValue(value: Prisma.JsonValue | null | undefined) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, Prisma.JsonValue>;
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function projectionFromSnapshot(value: Prisma.JsonValue) {
  const replay = objectValue(objectValue(value).replay);
  const projection = objectValue(replay.projection);
  const totals = objectValue(projection.totals);
  const intervals = objectValue(projection.intervals);
  return {
    totals: {
      attendanceMinutes: numberValue(totals.attendanceMinutes),
      mealMinutes: numberValue(totals.mealMinutes),
      paidWorkMinutes: numberValue(totals.paidWorkMinutes),
      regularMinutes: numberValue(totals.regularMinutes),
      overtimeMinutes: numberValue(totals.overtimeMinutes),
      esstNewlyAccruedMinutes: numberValue(totals.esstNewlyAccruedMinutes)
    },
    intervals: {
      attendance: Array.isArray(intervals.attendance) ? intervals.attendance : []
    }
  };
}

function mealPolicy(value: Prisma.JsonValue) {
  const policy = objectValue(value);
  return {
    expectedMealMinutes: numberValue(policy.expectedMealMinutes),
    paid: policy.paid === true
  };
}

function hoursLabel(minutes: number) {
  return `${(minutes / 60).toFixed(2)}h`;
}

function dateTimeLabel(value: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone
  }).format(value);
}

function timeLabel(value: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone
  }).format(value);
}

function label(value: string) {
  return value.toLowerCase().split("_").map((part) =>
    `${part.charAt(0).toUpperCase()}${part.slice(1)}`
  ).join(" ");
}

function eventDetail(event: { actorUserId: string; staffUserId: string; source: string }) {
  if (event.actorUserId !== event.staffUserId) {
    return `Recorded by an authorized reviewer from ${label(event.source)}.`;
  }
  return `Accepted from ${label(event.source)}; exact recorded time preserved.`;
}

function eventTone(eventType: string): "good" | "warning" | "neutral" {
  if (eventType === "CLOCK_IN" || eventType === "CLOCK_OUT") return "good";
  if (eventType.includes("MEAL")) return "neutral";
  return "warning";
}

function emptyModel(
  user: AuthenticatedUser,
  now: Date,
  permissions: TimeAttendanceConsoleModel["permissions"],
  reason?: string
): TimeAttendanceConsoleModel {
  return {
    asOfLabel: dateTimeLabel(now, "America/Chicago"),
    generatedAt: now.toISOString(),
    sourceLabel: reason ? "Live database unavailable" : "Live database — no time card yet",
    dataState: reason ? "UNAVAILABLE" : "EMPTY",
    ...(reason ? { unavailableReason: reason } : {}),
    currentUserName: user.name,
    nextAction: {
      label: reason ? "Retry live data" : "Record your next punch",
      detail: reason
        ? "Capture may still be available. Retry before making a duplicate entry."
        : "Your first accepted punch will appear here; card projection requires an active policy assignment.",
      href: "/time-attendance?view=today"
    },
    permissions,
    headline: { paidHours: "0.00h", regularHours: "0.00h", overtimeHours: "0.00h", esstAccrued: "0 min" },
    employeeCard: {
      available: false,
      cardChecksum: "",
      cardId: "",
      shiftLabel: "No projected pay-period card",
      policyLabel: "Policy assignment required",
      statusLabel: reason ? "Card data unavailable" : "Waiting for live card",
      timeCardVersion: 0,
      paidMinutes: 0,
      attendanceMinutes: 0,
      mealMinutes: 0,
      payrollReady: false,
      attestationStatus: "Not available",
      approvalStatus: "Not available"
    },
    timeline: [],
    exceptions: [],
    policies: [],
    managerQueue: [],
    team: [],
    timeOff: [],
    corrections: [],
    notifications: []
  };
}

export async function getTimeAttendanceConsoleModel(
  user: AuthenticatedUser,
  input: { now?: Date; organizationId?: string } = {}
): Promise<TimeAttendanceConsoleModel> {
  const now = input.now ?? new Date();
  const organizationId = input.organizationId ?? INITIAL_ORGANIZATION.id;
  let permissions: TimeAttendanceConsoleModel["permissions"] = {
    employee: true,
    manager: false,
    policies: false,
    payroll: false
  };

  try {
    const capabilities = await getTimeAttendanceCapabilitySet({ actor: user, organizationId });
    permissions = {
      employee: capabilities.TIME_SELF_SERVICE,
      manager: capabilities.TIME_ATTENDANCE_MANAGER || capabilities.TIME_LEAVE_ADMIN,
      policies: capabilities.TIME_POLICY_ADMIN,
      payroll: capabilities.TIME_PAYROLL_ADMIN || capabilities.TIME_PERIOD_LOCK_REOPEN || capabilities.TIME_EXPORT_RECONCILIATION
    };
    const manager = permissions.manager;
    const today = new Date(now.toISOString().slice(0, 10));
    const [card, events, assignment, policies, timeOff, corrections, notifications, activeSessions, reviewCards, queueCounts] = await Promise.all([
      prisma.timeCard.findFirst({
        where: {
          organizationId,
          staffUserId: user.id,
          periodStart: { lte: today },
          periodEnd: { gte: today }
        },
        orderBy: { version: "desc" },
        include: {
          exceptions: { where: { status: { in: ["OPEN", "ACKNOWLEDGED"] } } },
          attestations: { orderBy: { attestedAt: "desc" }, take: 1 },
          approvals: { orderBy: { approvedAt: "desc" }, take: 1 },
          policyProfile: true
        }
      }),
      prisma.timeAttendanceEvent.findMany({
        where: { organizationId, staffUserId: user.id, occurredAt: { gte: new Date(now.getTime() - 14 * 86_400_000) } },
        orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
        take: 30
      }),
      prisma.timeAttendancePolicyAssignment.findFirst({
        where: {
          organizationId,
          staffUserId: user.id,
          effectiveFrom: { lte: now },
          OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }],
          policyProfile: { status: "ACTIVE" }
        },
        include: { policyProfile: true },
        orderBy: { effectiveFrom: "desc" }
      }),
      prisma.timeAttendancePolicyProfile.findMany({
        where: manager
          ? { organizationId }
          : { organizationId, assignments: { some: { staffUserId: user.id } } },
        orderBy: [{ status: "asc" }, { name: "asc" }]
      }),
      prisma.timeOffRequest.findMany({
        where: { organizationId, requesterUserId: user.id, status: { notIn: ["DRAFT", "CANCELLED"] } },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, requestType: true, status: true, startsAt: true }
      }),
      prisma.timeCardCorrectionRequest.findMany({
        where: { organizationId, staffUserId: user.id },
        orderBy: { requestedAt: "desc" },
        take: 10,
        select: { id: true, requestedChangeType: true, requestedAt: true, status: true, managerReason: true }
      }),
      prisma.timeAttendanceNotification.findMany({
        where: { organizationId, recipientUserId: user.id, status: { in: ["UNREAD", "READ"] } },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: { id: true, title: true, body: true, severity: true, status: true, createdAt: true }
      }),
      manager ? prisma.timeAttendanceSession.findMany({
        where: { organizationId, state: { in: ["OPEN", "ON_MEAL"] } },
        include: { staffUser: { include: { userRoles: { include: { role: true } } } } },
        orderBy: { openedAt: "asc" }
      }) : Promise.resolve([]),
      manager ? prisma.timeCard.findMany({
        where: { organizationId, status: { in: ["OPEN", "EMPLOYEE_REVIEW", "ATTESTED", "MANAGER_REVIEW", "REOPENED"] } },
        include: {
          staffUser: { include: { userRoles: { include: { role: true } } } },
          policyProfile: true,
          exceptions: { where: { status: { in: ["OPEN", "ACKNOWLEDGED"] } } }
        },
        orderBy: [{ updatedAt: "desc" }, { version: "desc" }],
        take: 100
      }) : Promise.resolve([]),
      manager ? Promise.all([
        prisma.timeCardException.count({ where: { organizationId, status: { in: ["OPEN", "ACKNOWLEDGED"] } } }),
        prisma.timeCardCorrectionRequest.count({ where: { organizationId, status: { in: ["SUBMITTED", "RETURNED", "APPROVED"] } } }),
        prisma.timeCard.count({ where: { organizationId, payrollReady: false, status: { notIn: ["VOID", "EXPORTED"] } } })
      ]) : Promise.resolve([0, 0, 0])
    ]);

    const model = emptyModel(user, now, permissions);
    const timezone = assignment?.policyProfile.timezone ?? card?.policyProfile.timezone ?? "America/Chicago";
    const projection = card ? projectionFromSnapshot(card.calculationSnapshot) : null;
    const attendance = projection?.intervals.attendance[0];
    const attendanceObject = objectValue(attendance as Prisma.JsonValue);
    const shiftLabel = attendance
      ? `${timeLabel(new Date(stringValue(attendanceObject.startAt)), timezone)} – ${timeLabel(new Date(stringValue(attendanceObject.endAt)), timezone)}`
      : card ? `${card.periodStart.toISOString().slice(0, 10)} – ${card.periodEnd.toISOString().slice(0, 10)}` : "No completed shift in this period";
    const latestAttestation = card?.attestations[0];
    const latestApproval = card?.approvals[0];
    const activeIds = new Set(activeSessions.map((session) => session.staffUserId));
    const latestReviewCardByStaff = new Map<string, (typeof reviewCards)[number]>();
    for (const reviewCard of reviewCards) {
      if (!latestReviewCardByStaff.has(reviewCard.staffUserId)) {
        latestReviewCardByStaff.set(reviewCard.staffUserId, reviewCard);
      }
    }
    const activeTeam = activeSessions.map((session) => {
      const reviewCard = latestReviewCardByStaff.get(session.staffUserId);
      const totals = reviewCard ? projectionFromSnapshot(reviewCard.calculationSnapshot).totals : null;
      return {
        id: session.staffUserId,
        name: session.staffUser.name,
        role: session.staffUser.userRoles.map((entry) => entry.role.name).join(", ") || "Staff",
        shift: `Since ${timeLabel(session.openedAt, session.timezone)}`,
        policyName: reviewCard?.policyProfile.name ?? "Policy not projected",
        status: session.state === "ON_MEAL" ? "ON_MEAL" as const : "CLOCKED_IN" as const,
        statusLabel: session.state === "ON_MEAL" ? "On meal" : "Clocked in",
        paidMinutes: totals?.paidWorkMinutes ?? 0,
        mealMinutes: totals?.mealMinutes ?? 0,
        exceptionCount: reviewCard?.exceptions.length ?? 0
      };
    });
    const reviewTeam = [...latestReviewCardByStaff.values()]
      .filter((reviewCard) => !activeIds.has(reviewCard.staffUserId))
      .map((reviewCard) => {
        const totals = projectionFromSnapshot(reviewCard.calculationSnapshot).totals;
        return {
          id: reviewCard.staffUserId,
          name: reviewCard.staffUser.name,
          role: reviewCard.staffUser.userRoles.map((entry) => entry.role.name).join(", ") || "Staff",
          shift: `${reviewCard.periodStart.toISOString().slice(0, 10)} – ${reviewCard.periodEnd.toISOString().slice(0, 10)}`,
          policyName: reviewCard.policyProfile.name,
          status: "NEEDS_REVIEW" as const,
          statusLabel: reviewCard.exceptions.some((exception) => exception.blocking) ? "Blocking review" : "Needs review",
          paidMinutes: totals.paidWorkMinutes,
          mealMinutes: totals.mealMinutes,
          exceptionCount: reviewCard.exceptions.length
        };
      });

    return {
      ...model,
      asOfLabel: dateTimeLabel(now, timezone),
      sourceLabel: "Live persisted attendance, policy, card, and review records",
      dataState: card || events.length > 0 || assignment ? "LIVE" : "EMPTY",
      nextAction: card
        ? card.exceptions.some((exception) => exception.blocking)
          ? { label: "Resolve card exception", detail: "A blocking exception must be corrected or reviewed before this card can advance.", href: "/time-attendance?view=my-time#exceptions" }
          : latestAttestation
            ? { label: "Review current status", detail: "Your attestation is recorded for this exact card version.", href: "/time-attendance?view=my-time" }
            : { label: "Review and attest", detail: "Confirm this exact card version or dispute it for manager review.", href: "/time-attendance?view=my-time#attestation" }
        : assignment
          ? { label: "Record your next punch", detail: "Accepted punches will build your first live pay-period card.", href: "/time-attendance?view=today" }
          : { label: "Policy setup required", detail: "An authorized policy administrator must assign an active policy before a card can be projected.", href: manager ? "/time-attendance?view=policies" : "/time-attendance?view=my-time" },
      headline: {
        paidHours: hoursLabel(projection?.totals.paidWorkMinutes ?? 0),
        regularHours: hoursLabel(projection?.totals.regularMinutes ?? 0),
        overtimeHours: hoursLabel(projection?.totals.overtimeMinutes ?? 0),
        esstAccrued: `${projection?.totals.esstNewlyAccruedMinutes ?? 0} min`
      },
      employeeCard: card ? {
        available: true,
        cardChecksum: card.sourceEventChecksum,
        cardId: card.id,
        shiftLabel,
        policyLabel: card.policyProfile.name,
        statusLabel: card.payrollReady ? "Payroll handoff eligible" : label(card.status),
        timeCardVersion: card.version,
        paidMinutes: projection?.totals.paidWorkMinutes ?? 0,
        attendanceMinutes: projection?.totals.attendanceMinutes ?? 0,
        mealMinutes: projection?.totals.mealMinutes ?? 0,
        payrollReady: card.payrollReady,
        attestationStatus: latestAttestation ? `Recorded for version ${latestAttestation.timeCardVersion}` : "Not yet attested",
        approvalStatus: latestApproval ? label(latestApproval.decision) : "Not yet approved"
      } : {
        ...model.employeeCard,
        policyLabel: assignment?.policyProfile.name ?? "Policy assignment required"
      },
      timeline: events.map((event) => ({
        id: event.id,
        label: label(event.eventType),
        time: dateTimeLabel(event.occurredAt, event.timezone || timezone),
        detail: eventDetail(event),
        tone: eventTone(event.eventType)
      })),
      exceptions: card?.exceptions.map((exception) => ({
        code: exception.code,
        message: exception.message,
        blocking: exception.blocking
      })) ?? [],
      policies: policies.map((policy) => ({
        id: policy.id,
        name: `${policy.name} · v${policy.version} · ${label(policy.status)}`,
        description: `${policy.jurisdiction}; effective ${policy.effectiveFrom.toISOString().slice(0, 10)}. Source review evidence is preserved with the profile.`,
        scheduledMealPolicy: mealPolicy(policy.scheduledMealPolicy)
      })),
      managerQueue: manager ? [
        { label: "Open exceptions", count: queueCounts[0], detail: "Blocking and informational exceptions requiring individual review.", tone: queueCounts[0] > 0 ? "warning" : "good" },
        { label: "Corrections", count: queueCounts[1], detail: "Submitted, returned, or approved correction requests.", tone: queueCounts[1] > 0 ? "warning" : "good" },
        { label: "Payroll blocks", count: queueCounts[2], detail: "Current card versions that are not eligible for payroll handoff.", tone: queueCounts[2] > 0 ? "danger" : "good" }
      ] : [],
      team: manager ? [...activeTeam, ...reviewTeam] : [],
      timeOff: timeOff.map((request) => ({
        statusLabel: label(request.status),
        requestType: label(request.requestType),
        startsAt: request.startsAt.toISOString()
      })),
      corrections: corrections.map((request) => ({
        id: request.id,
        changeType: label(request.requestedChangeType),
        requestedAt: request.requestedAt.toISOString(),
        statusLabel: label(request.status),
        managerReason: request.managerReason
      })),
      notifications: notifications.map((notification) => ({
        id: notification.id,
        title: notification.title,
        body: notification.body,
        severity: notification.severity,
        createdAt: notification.createdAt.toISOString(),
        unread: notification.status === "UNREAD"
      }))
    };
  } catch (error) {
    return emptyModel(user, now, permissions, error instanceof Error ? error.message : "Live time attendance data is unavailable.");
  }
}
