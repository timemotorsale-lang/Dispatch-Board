import type { AuthenticatedUser } from "@/server/auth/store";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { assertAuthenticatedUser } from "@/server/policies/access";
import { prisma } from "@/server/db/client";
import { evaluateTimeAttendanceCapability, getTimeAttendanceCapabilityGrants } from "./capabilities";

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
        database.timeCardCorrectionRequest.findMany({
          where: {
            organizationId: input.organizationId,
            status: { in: ["SUBMITTED", "RETURNED"] }
          },
          orderBy: { requestedAt: "asc" },
          take: 50,
          include: { staffUser: { select: { name: true } } }
        }),
        database.timeCardException.findMany({
          where: {
            organizationId: input.organizationId,
            status: { in: ["OPEN", "ACKNOWLEDGED"] }
          },
          orderBy: { createdAt: "asc" },
          take: 50,
          include: { timeCard: { include: { staffUser: { select: { name: true } } } } }
        }),
        database.timeCardAttestation.findMany({
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
            status: { in: ["SUBMITTED", "LEAVE_ADMIN_REVIEW"] }
          },
          orderBy: { startsAt: "asc" },
          take: 50,
          include: { requesterUser: { select: { name: true } } }
        }),
        database.timeCard ? database.timeCard.findMany({
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
          status: label(request.status),
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
          detail: request.protectedRouting
            ? `${minutesLabel(request.requestedMinutes)} requested. Private ESST reason is restricted from ordinary manager view.`
            : request.operationalNote ?? `${minutesLabel(request.requestedMinutes)} requested.`,
          href: `/time-attendance?timeOff=${encodeURIComponent(request.id)}`,
          occurredAt: request.startsAt.toISOString(),
          severity: request.protectedRouting ? "warning" as const : "info" as const,
          staffName: request.requesterUser.name,
          status: request.protectedRouting ? "Leave admin review" : label(request.status),
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
  if (!evaluateTimeAttendanceCapability({ actor: user, capability: "TIME_ATTENDANCE_MANAGER", grants }).allowed) {
    return emptyQueue({ generatedAt: now.toISOString(), permitted: false });
  }

  const repository = input.repository ?? createTimeAttendanceManagerReviewRepository();
  return repository.list({
    organizationId: input.organizationId ?? INITIAL_ORGANIZATION.id,
    now
  });
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
