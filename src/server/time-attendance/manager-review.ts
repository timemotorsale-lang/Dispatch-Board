import type { AuthenticatedUser } from "@/server/auth/store";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { assertAuthenticatedUser, isManager } from "@/server/policies/access";
import { prisma } from "@/server/db/client";

export type TimeAttendanceManagerReviewItem = {
  id: string;
  ageLabel: string;
  category: "CORRECTION_REQUEST" | "CARD_EXCEPTION" | "ATTESTATION_DISPUTE";
  detail: string;
  href: string;
  occurredAt: string;
  severity: "info" | "warning" | "danger";
  staffName: string;
  status: string;
  title: string;
};

export type TimeAttendanceManagerReviewQueue = {
  permitted: boolean;
  generatedAt: string;
  totals: {
    all: number;
    blocking: number;
    corrections: number;
    disputes: number;
    exceptions: number;
  };
  items: TimeAttendanceManagerReviewItem[];
};

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

export function createTimeAttendanceManagerReviewRepository(
  database: TimeAttendanceManagerReviewDatabase = prisma as unknown as TimeAttendanceManagerReviewDatabase
): TimeAttendanceManagerReviewRepository {
  return {
    async list(input) {
      const [corrections, exceptions, disputes] = await Promise.all([
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
        })
      ]);

      const items = sortItems([
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
          exceptions: exceptions.length
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
  if (!isManager(user)) {
    return {
      permitted: false,
      generatedAt: now.toISOString(),
      totals: { all: 0, blocking: 0, corrections: 0, disputes: 0, exceptions: 0 },
      items: []
    } satisfies TimeAttendanceManagerReviewQueue;
  }

  const repository = input.repository ?? createTimeAttendanceManagerReviewRepository();
  return repository.list({
    organizationId: input.organizationId ?? INITIAL_ORGANIZATION.id,
    now
  });
}
