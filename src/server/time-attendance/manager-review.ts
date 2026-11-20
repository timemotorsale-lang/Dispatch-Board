import type { AuthenticatedUser } from "@/server/auth/store";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { assertAuthenticatedUser } from "@/server/policies/access";
import { prisma } from "@/server/db/client";
import { evaluateTimeAttendanceCapability, getTimeAttendanceCapabilityGrants } from "./capabilities";
import { pendingTimeOffStatuses, storedTimeOffWindows, timeOffEvidence, type TimeOffWindow } from "./time-off-windows";
import { getLocationLocalDate } from "@/server/appointments/location-time-service";

export type TimeAttendanceManagerReviewItem = {
  id: string;
  ageLabel: string;
  category: "CARD_APPROVAL" | "CORRECTION_REQUEST" | "CARD_EXCEPTION" | "ATTESTATION_DISPUTE" | "TIME_OFF_REQUEST";
  detail: string;
  href: string;
  occurredAt: string;
  severity: "info" | "warning" | "danger";
  staffName: string;
  status: string;
  title: string;
  cardChecksum?: string;
  timeCardVersion?: number;
  correctionRebuildPending?: boolean;
  timeOffVersion?: string;
  timeOffReview?: {
    version: string;
    actions: ("APPROVE_COVERAGE" | "APPROVE" | "DENY" | "RETURN")[];
    projectionPending: boolean;
    dates: string[];
    calendarHref: string;
    appointmentConflicts: number | null;
    overlappingAbsences: number | null;
  };
};

export type TimeAttendanceManagerReviewQueue = {
  permitted: boolean;
  generatedAt: string;
  unavailableReason?: string;
  totals: {
    all: number;
    blocking: number;
    corrections: number;
    disputes: number;
    exceptions: number;
    timeOff: number;
  };
  items: TimeAttendanceManagerReviewItem[];
};

function emptyQueue(input: {
  generatedAt: string;
  permitted: boolean;
  unavailableReason?: string;
}): TimeAttendanceManagerReviewQueue {
  return {
    permitted: input.permitted,
    generatedAt: input.generatedAt,
    totals: { all: 0, blocking: 0, corrections: 0, disputes: 0, exceptions: 0, timeOff: 0 },
    items: [],
    ...(input.unavailableReason ? { unavailableReason: input.unavailableReason } : {})
  };
}

type CorrectionRequestRecord = {
  id: string;
  employeeExplanation: string;
  requestedAt: Date;
  requestedChangeType: string;
  status: string;
  staffUser: { name: string };
};

type ExceptionRecord = {
  id: string;
  blocking: boolean;
  code: string;
  createdAt: Date;
  message: string;
  status: string;
  timeCard: { staffUser: { name: string } };
};

type AttestationRecord = {
  id: string;
  attestedAt: Date;
  statement: string;
  timeCard: { staffUser: { name: string } };
  timeCardId: string;
  timeCardVersion: number;
};

type TimeOffRecord = {
  createdAt: Date;
  endsAt: Date;
  id: string;
  operationalNote: string | null;
  protectedRouting: boolean;
  requestType: string;
  requestedMinutes: number;
  requesterUser: { name: string };
  startsAt: Date;
  status: string;
  updatedAt?: Date;
  locationId?: string;
  requesterUserId?: string;
  evidence?: unknown;
};

type CardRecord = {
  id: string;
  staffUserId: string;
  periodEnd: Date;
  periodStart: Date;
  sourceEventChecksum: string;
  status: string;
  updatedAt: Date;
  version: number;
  staffUser: { name: string };
  approvals: { decision: string; timeCardVersion: number }[];
  attestations: { cardChecksum: string; statement: string; timeCardVersion: number }[];
  correctionRequests: { status: string }[];
  exceptions: { blocking: boolean; status: string }[];
};

type TimeAttendanceManagerReviewDatabase = {
  timeCardCorrectionRequest: {
    findMany(input: Record<string, unknown>): Promise<CorrectionRequestRecord[]>;
  };
  timeCardException: {
    findMany(input: Record<string, unknown>): Promise<ExceptionRecord[]>;
  };
  timeCardAttestation: {
    findMany(input: Record<string, unknown>): Promise<AttestationRecord[]>;
  };
  timeOffRequest: {
    findMany(input: Record<string, unknown>): Promise<TimeOffRecord[]>;
  };
  timeCard?: {
    findMany(input: Record<string, unknown>): Promise<CardRecord[]>;
  };
};

export type TimeAttendanceManagerReviewRepository = {
  list(input: {
    organizationId: string;
    now: Date;
    timeOffLocations?: string[];
    includeOperations?: boolean;
  }): Promise<TimeAttendanceManagerReviewQueue>;
};

function label(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function ageLabel(value: Date, now: Date) {
  const minutes = Math.max(0, Math.round((now.getTime() - value.getTime()) / 60000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

function sortItems(items: TimeAttendanceManagerReviewItem[]) {
  const rank = { danger: 0, warning: 1, info: 2 } satisfies Record<TimeAttendanceManagerReviewItem["severity"], number>;
  return [...items].sort((left, right) => {
    const severity = rank[left.severity] - rank[right.severity];
    if (severity !== 0) return severity;
    return new Date(left.occurredAt).getTime() - new Date(right.occurredAt).getTime();
  });
}

function minutesLabel(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (hours === 0) return `${remaining}m`;
  if (remaining === 0) return `${hours}h`;
  return `${hours}h ${remaining}m`;
}

export function createTimeAttendanceManagerReviewRepository(
  database: TimeAttendanceManagerReviewDatabase = prisma as unknown as TimeAttendanceManagerReviewDatabase
): TimeAttendanceManagerReviewRepository {
  return {
    async list(input) {
      const [corrections, exceptions, disputes, timeOffRequests, cardVersions] = await Promise.all([
        input.includeOperations === false ? Promise.resolve([]) : database.timeCardCorrectionRequest.findMany({
          where: {
            organizationId: input.organizationId,
            OR: [
              { status: { in: ["SUBMITTED", "RETURNED", "APPROVED"] } },
              { status: "APPLIED", evidence: { path: ["projectionPending"], equals: true } }
            ]
          },
          orderBy: { requestedAt: "asc" },
          take: 50,
          include: { staffUser: { select: { name: true } } }
        }),
        input.includeOperations === false ? Promise.resolve([]) : database.timeCardException.findMany({
          where: {
            organizationId: input.organizationId,
            status: { in: ["OPEN", "ACKNOWLEDGED"] }
          },
          orderBy: { createdAt: "asc" },
          take: 50,
          include: { timeCard: { include: { staffUser: { select: { name: true } } } } }
        }),
        input.includeOperations === false ? Promise.resolve([]) : database.timeCardAttestation.findMany({
          where: {
            organizationId: input.organizationId,
            statement: { contains: "disputes" }
          },
          orderBy: { attestedAt: "asc" },
          take: 50,
          include: { timeCard: { include: { staffUser: { select: { name: true } } } } }
        }),
        database.timeOffRequest.findMany({
          where: {
            organizationId: input.organizationId,
            ...(input.timeOffLocations ? { locationId: { in: input.timeOffLocations } } : {}),
            OR: [
              { status: { in: [...pendingTimeOffStatuses] } },
              { status: "APPROVED", evidence: { path: ["projectionPending"], equals: true } }
            ]
          },
          orderBy: { startsAt: "asc" },
          take: 50,
          include: { requesterUser: { select: { name: true } } }
        }),
        database.timeCard && input.includeOperations !== false ? database.timeCard.findMany({
          where: {
            organizationId: input.organizationId,
            status: { in: ["EMPLOYEE_REVIEW", "ATTESTED", "MANAGER_REVIEW"] }
          },
          orderBy: [{ staffUserId: "asc" }, { periodStart: "desc" }, { version: "desc" }],
          take: 150,
          include: {
            staffUser: { select: { name: true } },
            approvals: true,
            attestations: true,
            correctionRequests: true,
            exceptions: true
          }
        }) : Promise.resolve([])
      ]);

      const newestCards = cardVersions.filter((card, index, all) =>
        all.findIndex((candidate) => candidate.staffUserId === card.staffUserId && candidate.periodStart.getTime() === card.periodStart.getTime()) === index
      );
      const cards = newestCards.filter((card) => {
        const attested = card.attestations.some((entry) =>
          entry.timeCardVersion === card.version && entry.cardChecksum === card.sourceEventChecksum && !entry.statement.toLowerCase().includes("disputes")
        );
        const approved = card.approvals.some((entry) => entry.timeCardVersion === card.version && entry.decision === "APPROVE");
        return attested && !approved;
      });

      const items = sortItems([
        ...cards.map((card) => {
          const blocking = card.exceptions.filter((entry) => entry.blocking && ["OPEN", "ACKNOWLEDGED"].includes(entry.status)).length;
          const corrections = card.correctionRequests.filter((entry) => ["SUBMITTED", "RETURNED", "APPROVED"].includes(entry.status)).length;
          const clean = blocking === 0 && corrections === 0;
          return {
            id: card.id,
            ageLabel: ageLabel(card.updatedAt, input.now),
            category: "CARD_APPROVAL" as const,
            cardChecksum: card.sourceEventChecksum,
            timeCardVersion: card.version,
            detail: clean
              ? `Attested card v${card.version} has no blocking exceptions or open corrections.`
              : `Card v${card.version} has ${blocking} blocking exception(s) and ${corrections} open correction request(s).`,
            href: `/time-attendance?view=manager&card=${encodeURIComponent(card.id)}`,
            occurredAt: card.updatedAt.toISOString(),
            severity: clean ? "info" as const : "danger" as const,
            staffName: card.staffUser.name,
            status: clean ? "Eligible for approval" : "Review required",
            title: `Pay-period card ${card.periodStart.toISOString().slice(0, 10)} – ${card.periodEnd.toISOString().slice(0, 10)}`
          };
        }),
        ...corrections.map((request) => ({
          id: request.id,
          ageLabel: ageLabel(request.requestedAt, input.now),
          category: "CORRECTION_REQUEST" as const,
          detail: request.employeeExplanation,
          href: `/time-attendance?managerReview=${encodeURIComponent(request.id)}`,
          occurredAt: request.requestedAt.toISOString(),
          severity: "warning" as const,
          staffName: request.staffUser.name,
          status: request.status === "APPLIED" ? "Applied · card rebuild pending" : request.status === "APPROVED" ? "Approved · ready to apply" : label(request.status),
          correctionRebuildPending: request.status === "APPLIED",
          title: `${label(request.requestedChangeType)} correction request`
        })),
        ...exceptions.map((exception) => ({
          id: exception.id,
          ageLabel: ageLabel(exception.createdAt, input.now),
          category: "CARD_EXCEPTION" as const,
          detail: exception.message,
          href: `/time-attendance?exception=${encodeURIComponent(exception.id)}`,
          occurredAt: exception.createdAt.toISOString(),
          severity: exception.blocking ? "danger" as const : "warning" as const,
          staffName: exception.timeCard.staffUser.name,
          status: exception.blocking ? "Blocks payroll" : label(exception.status),
          title: label(exception.code)
        })),
        ...disputes.map((attestation) => ({
          id: attestation.id,
          ageLabel: ageLabel(attestation.attestedAt, input.now),
          category: "ATTESTATION_DISPUTE" as const,
          detail: attestation.statement,
          href: `/time-attendance?attestation=${encodeURIComponent(attestation.id)}`,
          occurredAt: attestation.attestedAt.toISOString(),
          severity: "danger" as const,
          staffName: attestation.timeCard.staffUser.name,
          status: `Card v${attestation.timeCardVersion}`,
          title: "Employee disputed time card"
        })),
        ...timeOffRequests.map((request) => ({
          id: request.id,
          ageLabel: ageLabel(request.createdAt, input.now),
          category: "TIME_OFF_REQUEST" as const,
          detail: `${minutesLabel(request.requestedMinutes)} requested.${!request.protectedRouting && request.operationalNote ? ` ${request.operationalNote}` : ""}`,
          href: `/time-attendance?view=manager&review=${encodeURIComponent(request.id)}#time-review-${encodeURIComponent(request.id)}`,
          occurredAt: request.startsAt.toISOString(),
          severity: request.protectedRouting ? "warning" as const : "info" as const,
          staffName: request.requesterUser.name,
          status: request.status === "APPROVED" ? "Approved · card update pending" : request.status === "MANAGER_APPROVED" ? "Coverage approved · awaiting final approval" : request.protectedRouting ? "Leave admin review" : label(request.status),
          timeOffVersion: request.updatedAt?.toISOString(),
          title: `${label(request.requestType)} time-off request`
        }))
      ]);

      return {
        permitted: true,
        generatedAt: input.now.toISOString(),
        totals: {
          all: items.length,
          blocking: items.filter((item) => item.severity === "danger").length,
          corrections: corrections.length,
          disputes: disputes.length,
          exceptions: exceptions.length,
          timeOff: timeOffRequests.length
        },
        items
      };
    }
  };
}

export async function getTimeAttendanceManagerReviewQueue(
  actor: AuthenticatedUser | null,
  input: {
    now?: Date;
    organizationId?: string;
    repository?: TimeAttendanceManagerReviewRepository;
  } = {}
) {
  const user = assertAuthenticatedUser(actor);
  const now = input.now ?? new Date();
  const grants = await getTimeAttendanceCapabilityGrants({
    actor: user,
    organizationId: input.organizationId ?? INITIAL_ORGANIZATION.id
  });
  const includeOperations = evaluateTimeAttendanceCapability({ actor: user, capability: "TIME_ATTENDANCE_MANAGER", grants }).allowed;
  const repository = input.repository ?? createTimeAttendanceManagerReviewRepository();
  const organizationId = input.organizationId ?? INITIAL_ORGANIZATION.id;
  if (input.repository) return includeOperations ? repository.list({ organizationId, now }) : emptyQueue({ generatedAt: now.toISOString(), permitted: false });
  const locations = await prisma.location.findMany({ where: { organizationId }, select: { id: true } });
  const capabilityAt = (locationId: string, capability: "TIME_ATTENDANCE_MANAGER" | "TIME_LEAVE_ADMIN", priorActorUserId?: string | null) =>
    evaluateTimeAttendanceCapability({ actor: user, grants, locationId, capability, priorActorUserId }).allowed;
  const timeOffLocations = locations.filter(location =>
    capabilityAt(location.id, "TIME_ATTENDANCE_MANAGER") || capabilityAt(location.id, "TIME_LEAVE_ADMIN")
  ).map(location => location.id);
  if (!includeOperations && timeOffLocations.length === 0) return emptyQueue({ generatedAt: now.toISOString(), permitted: false });
  const queue = await repository.list({ organizationId, now, timeOffLocations, includeOperations });
  const timeOffIds = queue.items.filter(item => item.category === "TIME_OFF_REQUEST").map(item => item.id);
  if (timeOffIds.length === 0) return queue;
  const records = await prisma.timeOffRequest.findMany({
    where: { organizationId, id: { in: timeOffIds }, locationId: { in: timeOffLocations } },
    select: { id: true, locationId: true, requesterUserId: true, startsAt: true, endsAt: true, status: true, updatedAt: true,
      protectedRouting: true, evidence: true, decisionActorUserId: true, location: { select: { timezone: true } } }
  });
  const byId = new Map(records.map(record => [record.id, record]));
  const items = await Promise.all(queue.items.map(async item => {
    const request = item.category === "TIME_OFF_REQUEST" ? byId.get(item.id) : undefined;
    if (!request) return item;
    const leaveAdmin = capabilityAt(request.locationId, "TIME_LEAVE_ADMIN");
    const manager = capabilityAt(request.locationId, "TIME_ATTENDANCE_MANAGER");
    const projectionPending = request.status === "APPROVED" && timeOffEvidence(request.evidence).projectionPending === true;
    const actions: NonNullable<TimeAttendanceManagerReviewItem["timeOffReview"]>["actions"] = [];
    if (request.requesterUserId !== user.id && item.timeOffVersion === request.updatedAt.toISOString()) {
      if (projectionPending) {
        if (leaveAdmin) actions.push("APPROVE");
      } else {
        if (manager && !request.protectedRouting && request.status === "SUBMITTED") actions.push("APPROVE_COVERAGE");
        const priorReviewer = request.status === "MANAGER_APPROVED" ? request.decisionActorUserId : null;
        if (leaveAdmin && capabilityAt(request.locationId, "TIME_LEAVE_ADMIN", priorReviewer)) actions.push("APPROVE");
        if (leaveAdmin) actions.push("DENY");
        if (request.protectedRouting ? leaveAdmin : manager || leaveAdmin) actions.push("RETURN");
      }
    }
    const [appointmentConflicts, overlappingAbsences] = await coverageCounts(organizationId, request);
    const date = new Intl.DateTimeFormat("en-US", { timeZone: request.location.timezone, month: "short", day: "numeric", year: "numeric" });
    const clock = new Intl.DateTimeFormat("en-US", { timeZone: request.location.timezone, hour: "numeric", minute: "numeric" });
    const dates = storedTimeOffWindows(request).map(window => {
      const start = date.format(window.startsAt);
      const end = date.format(window.endsAt);
      return start === end ? `${start}, ${clock.format(window.startsAt)}–${clock.format(window.endsAt)}`
        : `${start}, ${clock.format(window.startsAt)} – ${end}, ${clock.format(window.endsAt)}`;
    });
    const calendarHref = `/appointments?view=calendar&localDate=${getLocationLocalDate(request.startsAt, request.location.timezone)}`;
    return {
      ...item,
      title: request.protectedRouting && !leaveAdmin ? "Protected time-off request" : item.title,
      timeOffReview: { version: request.updatedAt.toISOString(), actions, projectionPending, dates, calendarHref, appointmentConflicts, overlappingAbsences }
    };
  }));
  return { ...queue, items };
}

async function coverageCounts(
  organizationId: string,
  request: TimeOffWindow & { id: string; locationId: string; requesterUserId: string; evidence: unknown }
): Promise<[number | null, number | null]> {
  const windows = storedTimeOffWindows(request);
  const overlap = windows.map(window => ({ startsAt: { lt: window.endsAt }, endsAt: { gt: window.startsAt } }));
  try {
    const [appointments, absences] = await Promise.all([
      prisma.appointment.count({
        where: { organizationId, locationId: request.locationId, bookingStatus: "SCHEDULED", AND: [
          { OR: [{ ownerUserId: request.requesterUserId }, { participants: { some: { userId: request.requesterUserId } } }] },
          { OR: overlap }
        ] }
      }),
      prisma.timeOffRequest.findMany({
        where: { organizationId, locationId: request.locationId, status: "APPROVED", requesterUserId: { not: request.requesterUserId }, OR: overlap },
        select: { requesterUserId: true, startsAt: true, endsAt: true, evidence: true }
      })
    ]);
    const people = new Set(absences.filter(absence => storedTimeOffWindows(absence).some(window => windows.some(
      target => window.startsAt < target.endsAt && target.startsAt < window.endsAt
    ))).map(absence => absence.requesterUserId));
    return [appointments, people.size];
  } catch {
    return [null, null];
  }
}

export async function getSafeTimeAttendanceManagerReviewQueue(
  actor: AuthenticatedUser | null,
  input: {
    now?: Date;
    organizationId?: string;
    repository?: TimeAttendanceManagerReviewRepository;
  } = {}
) {
  const user = assertAuthenticatedUser(actor);
  const now = input.now ?? new Date();

  try {
    return await getTimeAttendanceManagerReviewQueue(user, { ...input, now });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Time attendance manager review is unavailable.";
    return emptyQueue({
      generatedAt: now.toISOString(),
      permitted: evaluateTimeAttendanceCapability({ actor: user, capability: "TIME_ATTENDANCE_MANAGER" }).allowed,
      unavailableReason: message
    });
  }
}
