import { INITIAL_MINNEAPOLIS_LOCATION, INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import type { AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";
import { hashTimeCardReplay } from "@/server/time-attendance/replay";
import { assertAuthenticatedUser } from "@/server/policies/access";
import { requireTimeAttendanceCapability, type TimeAttendanceCapability } from "./capabilities";
import { anchoredPeriodForInstant, weeklyPeriodForInstant } from "./period";
import { recordSafeInternalTimeAttendanceNotification, notifyTimeAttendanceReviewers } from "./notification-service";

export type PayrollHandoffBlockerCode =
  | "OPEN_SESSION"
  | "CARD_NOT_READY"
  | "BLOCKING_EXCEPTION"
  | "PENDING_CORRECTION"
  | "MISSING_EMPLOYEE_ATTESTATION"
  | "MISSING_MANAGER_APPROVAL"
  | "MISSING_ROSTER_CARD"
  | "PAY_PERIOD_NOT_CONFIGURED"
  | "PENDING_TIME_OFF"
  | "EXISTING_LOCK_OR_EXPORT";

export type PayrollHandoffReadinessItem = {
  code: PayrollHandoffBlockerCode;
  detail: string;
  staffName?: string;
  severity: "blocking" | "warning";
  sourceId: string;
};

export type PayrollHandoffReadiness = {
  generatedAt: string;
  locationId: string;
  organizationId: string;
  payPeriod: {
    start: string;
    end: string;
  };
  ready: boolean;
  totals: {
    approvedCards: number;
    blockingItems: number;
    cardCount: number;
    lockedOrExportedBatches: number;
    openSessions: number;
    pendingCorrections: number;
    pendingTimeOff: number;
    warningItems: number;
  };
  items: PayrollHandoffReadinessItem[];
};

export type PayrollExportPreviewLine = {
  amountCents: number | null;
  earningCode: "REGULAR" | "OVERTIME" | "ESST" | "PTO" | "UNPAID" | "HOLIDAY";
  minutes: number;
  staffName: string;
  staffUserId: string;
  timeCardId: string;
  timeCardVersion: number;
};

export type PayrollExportPreview = {
  batchId: string | null;
  checksum: string;
  controlTotals: Record<PayrollExportPreviewLine["earningCode"], number>;
  generatedAt: string;
  lineCount: number;
  lines: PayrollExportPreviewLine[];
  payPeriod: { start: string; end: string };
};

type TimeCardRecord = {
  id: string;
  calculationSnapshot: unknown;
  exceptions: { id: string; blocking: boolean; code: string; message: string; status: string }[];
  payrollReady: boolean;
  staffUser: { name: string };
  staffUserId: string;
  status: string;
  version: number;
  approvals: { id: string; timeCardVersion: number }[];
  attestations?: { cardChecksum: string; statement: string; timeCardVersion: number }[];
  correctionRequests: { id: string; status: string }[];
};

type ExportBatchRecord = {
  id: string;
  batchNumber: string;
  exportSnapshot: unknown;
  fileChecksum: string | null;
  status: string;
  locationId?: string | null;
  periodEnd?: Date;
  periodStart?: Date;
  lines?: {
    amountCents: number | null;
    earningCode: string;
    lineSnapshot: unknown;
    minutes: number;
    timeCardId: string;
    timeCardVersion: number;
  }[];
};

type PayrollHandoffDatabase = {
  $transaction?<T>(work: (tx: PayrollHandoffDatabase) => Promise<T>, options?: Record<string, unknown>): Promise<T>;
  timeAttendanceSession: {
    findMany(input: Record<string, unknown>): Promise<{ id: string; staffUser: { name: string }; state: string }[]>;
  };
  timeAttendanceExportBatch: {
    create(input: Record<string, unknown>): Promise<ExportBatchRecord>;
    findFirst(input: Record<string, unknown>): Promise<ExportBatchRecord | null>;
    update(input: Record<string, unknown>): Promise<ExportBatchRecord>;
  };
  timeAttendanceExportLine: {
    createMany(input: Record<string, unknown>): Promise<{ count: number }>;
  };
  timeCard: {
    findMany(input: Record<string, unknown>): Promise<TimeCardRecord[]>;
    updateMany(input: Record<string, unknown>): Promise<{ count: number }>;
  };
  timeOffRequest: {
    findMany(input: Record<string, unknown>): Promise<{ id: string; protectedRouting: boolean; requesterUser: { name: string }; status: string }[]>;
  };
  user?: {
    findMany(input: Record<string, unknown>): Promise<{ id: string; name: string }[]>;
  };
};

function dateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

function parseDate(value: string, label: string) {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) throw new Error(`${label} must be a YYYY-MM-DD date.`);
  return parsed;
}

function periodEndExclusive(end: Date) {
  return new Date(end.getTime() + 24 * 60 * 60 * 1000);
}

async function requirePayrollAuthority(
  actor: AuthenticatedUser | null,
  capability: TimeAttendanceCapability,
  organizationId: string = INITIAL_ORGANIZATION.id,
  locationId: string | null = INITIAL_MINNEAPOLIS_LOCATION.id
) {
  const user = assertAuthenticatedUser(actor);
  try {
    await requireTimeAttendanceCapability({ actor: user, capability, organizationId, locationId });
  } catch {
    throw new Error(`Only managers with ${capability.toLowerCase().replaceAll("_", " ")} authority can manage this payroll handoff action.`);
  }
  return user;
}

function calculationTotals(snapshot: unknown) {
  const value = snapshot as {
    totals?: Record<string, unknown>;
    replay?: { projection?: { totals?: Record<string, unknown> } };
    timeOffTotals?: Record<string, unknown>;
  } | null;
  const totals = value?.replay?.projection?.totals ?? value?.totals;
  return {
    esst: value?.timeOffTotals
      ? numberValue(value.timeOffTotals.ESST)
      : numberValue(totals?.esstNewlyAccruedMinutes),
    holiday: numberValue(value?.timeOffTotals?.HOLIDAY),
    overtime: numberValue(totals?.overtimeMinutes),
    pto: numberValue(value?.timeOffTotals?.PTO),
    regular: numberValue(totals?.regularMinutes),
    unpaid: numberValue(value?.timeOffTotals?.UNPAID)
  };
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function batchNumber(periodStart: Date, periodEnd: Date) {
  return `TA-${dateOnly(periodStart)}-${dateOnly(periodEnd)}`;
}

function buildPreview(input: {
  batchId?: string | null;
  cards: TimeCardRecord[];
  generatedAt: Date;
  periodEnd: Date;
  periodStart: Date;
}): PayrollExportPreview {
  const lines = input.cards.flatMap((card) => {
    const totals = calculationTotals(card.calculationSnapshot);
    const base = {
      amountCents: null,
      staffName: card.staffUser.name,
      staffUserId: card.staffUserId,
      timeCardId: card.id,
      timeCardVersion: card.version
    };
    return [
      { ...base, earningCode: "REGULAR" as const, minutes: totals.regular },
      { ...base, earningCode: "OVERTIME" as const, minutes: totals.overtime },
      { ...base, earningCode: "ESST" as const, minutes: totals.esst },
      { ...base, earningCode: "PTO" as const, minutes: totals.pto },
      { ...base, earningCode: "UNPAID" as const, minutes: totals.unpaid },
      { ...base, earningCode: "HOLIDAY" as const, minutes: totals.holiday }
    ].filter((line) => line.minutes > 0);
  });
  const earningCodes: PayrollExportPreviewLine["earningCode"][] = ["REGULAR", "OVERTIME", "ESST", "PTO", "UNPAID", "HOLIDAY"];
  const controlTotals = Object.fromEntries(earningCodes.map((code) => [
    code,
    lines.filter((line) => line.earningCode === code).reduce((sum, line) => sum + line.minutes, 0)
  ])) as Record<PayrollExportPreviewLine["earningCode"], number>;
  const payPeriod = { start: dateOnly(input.periodStart), end: dateOnly(input.periodEnd) };
  const checksum = hashTimeCardReplay({ controlTotals, lines, payPeriod });

  return {
    batchId: input.batchId ?? null,
    checksum,
    controlTotals,
    generatedAt: input.generatedAt.toISOString(),
    lineCount: lines.length,
    lines,
    payPeriod
  };
}

function snapshotObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function renderPayrollHandoffCsv(preview: PayrollExportPreview) {
  const escape = (value: string | number | null) => {
    const raw = value === null ? "" : String(value);
    return /[",\r\n]/.test(raw) ? `"${raw.replaceAll('"', '""')}"` : raw;
  };
  const rows = [
    ["staff_user_id", "staff_name", "time_card_id", "card_version", "earning_code", "minutes", "amount_cents"],
    ...preview.lines.map((line) => [line.staffUserId, line.staffName, line.timeCardId, line.timeCardVersion, line.earningCode, line.minutes, line.amountCents])
  ];
  return `${rows.map((row) => row.map(escape).join(",")).join("\r\n")}\r\n`;
}

export function createPayrollHandoffRepository(database: PayrollHandoffDatabase = prisma as unknown as PayrollHandoffDatabase) {
  async function loadPeriod(input: {
    locationId: string;
    organizationId: string;
    periodEnd: Date;
    periodStart: Date;
  }) {
    const endExclusive = periodEndExclusive(input.periodEnd);
    const [cards, openSessions, timeOff, existingBatch, roster] = await Promise.all([
      database.timeCard.findMany({
        where: {
          organizationId: input.organizationId,
          locationId: input.locationId,
          periodStart: input.periodStart,
          periodEnd: input.periodEnd,
          status: { notIn: ["VOID", "REOPENED"] }
        },
        include: {
          approvals: true,
          attestations: true,
          correctionRequests: true,
          exceptions: true,
          staffUser: { select: { name: true } }
        },
        orderBy: [{ staffUserId: "asc" }, { version: "desc" }]
      }),
      database.timeAttendanceSession.findMany({
        where: {
          organizationId: input.organizationId,
          locationId: input.locationId,
          openedAt: { lt: endExclusive },
          state: { in: ["OPEN", "ON_MEAL"] }
        },
        include: { staffUser: { select: { name: true } } }
      }),
      database.timeOffRequest.findMany({
        where: {
          organizationId: input.organizationId,
          locationId: input.locationId,
          startsAt: { lt: endExclusive },
          endsAt: { gt: input.periodStart },
          status: { in: ["SUBMITTED", "LEAVE_ADMIN_REVIEW", "MANAGER_APPROVED"] }
        },
        include: { requesterUser: { select: { name: true } } }
      }),
      database.timeAttendanceExportBatch.findFirst({
        where: {
          organizationId: input.organizationId,
          locationId: input.locationId,
          periodStart: input.periodStart,
          periodEnd: input.periodEnd,
          status: { in: ["LOCKED", "EXPORTED", "ACKNOWLEDGED", "REJECTED", "RECONCILED"] }
        },
        orderBy: { createdAt: "desc" }
      }),
      database.user ? database.user.findMany({
        where: {
          isActive: true,
          timeAttendancePolicyAssignments: {
            some: {
              organizationId: input.organizationId,
              effectiveFrom: { lte: input.periodEnd },
              OR: [{ effectiveTo: null }, { effectiveTo: { gte: input.periodStart } }]
            }
          }
        },
        orderBy: { name: "asc" },
        select: { id: true, name: true }
      }) : Promise.resolve([])
    ]);

    const currentCards = cards.filter((card, index, all) => all.findIndex((candidate) => candidate.staffUserId === card.staffUserId) === index);
    return { cards: currentCards, existingBatch, openSessions, timeOff, roster };
  }

  return {
    async readiness(input: {
      generatedAt: Date;
      locationId: string;
      organizationId: string;
      periodEnd: Date;
      periodStart: Date;
    }): Promise<PayrollHandoffReadiness> {
      const { cards, existingBatch, openSessions, timeOff, roster } = await loadPeriod(input);
      const items: PayrollHandoffReadinessItem[] = [];

      for (const session of openSessions) {
        items.push({
          code: "OPEN_SESSION",
          detail: `${session.state === "ON_MEAL" ? "Meal" : "Active"} session must be closed before payroll lock.`,
          severity: "blocking",
          sourceId: session.id,
          staffName: session.staffUser.name
        });
      }
      for (const card of cards) {
        if (!card.payrollReady || !["APPROVED", "LOCKED", "EXPORTED"].includes(card.status)) {
          items.push({
            code: "CARD_NOT_READY",
            detail: `Time card is ${card.status.toLowerCase()} and not approved for payroll handoff.`,
            severity: "blocking",
            sourceId: card.id,
            staffName: card.staffUser.name
          });
        }
        for (const exception of card.exceptions.filter((entry) => entry.blocking && ["OPEN", "ACKNOWLEDGED"].includes(entry.status))) {
          items.push({
            code: "BLOCKING_EXCEPTION",
            detail: `${exception.code}: ${exception.message}`,
            severity: "blocking",
            sourceId: exception.id,
            staffName: card.staffUser.name
          });
        }
        for (const correction of card.correctionRequests.filter((entry) => ["SUBMITTED", "RETURNED", "APPROVED"].includes(entry.status))) {
          items.push({
            code: "PENDING_CORRECTION",
            detail: `Correction request is ${correction.status.toLowerCase()} and must be resolved or applied.`,
            severity: "blocking",
            sourceId: correction.id,
            staffName: card.staffUser.name
          });
        }
        if (!card.approvals.some((approval) => approval.timeCardVersion === card.version)) {
          items.push({
            code: "MISSING_MANAGER_APPROVAL",
            detail: `Card version ${card.version} has no manager approval record.`,
            severity: "blocking",
            sourceId: card.id,
            staffName: card.staffUser.name
          });
        }
        if (card.attestations && !card.attestations.some((attestation) =>
          attestation.timeCardVersion === card.version &&
          !attestation.statement.toLowerCase().includes("disputes")
        )) {
          items.push({
            code: "MISSING_EMPLOYEE_ATTESTATION",
            detail: `Card version ${card.version} has no confirming employee attestation.`,
            severity: "blocking",
            sourceId: card.id,
            staffName: card.staffUser.name
          });
        }
      }
      const cardStaffIds = new Set(cards.map((card) => card.staffUserId));
      for (const staff of roster.filter((member) => !cardStaffIds.has(member.id))) {
        items.push({
          code: "MISSING_ROSTER_CARD",
          detail: "Active roster member has no card for this configured pay period.",
          severity: "blocking",
          sourceId: staff.id,
          staffName: staff.name
        });
      }
      for (const request of timeOff) {
        items.push({
          code: "PENDING_TIME_OFF",
          detail: request.protectedRouting
            ? "Protected leave/ESST request requires leave-admin resolution before payroll handoff."
            : `Time-off request is ${request.status.toLowerCase()} and must be approved or denied.`,
          severity: "blocking",
          sourceId: request.id,
          staffName: request.requesterUser.name
        });
      }
      if (existingBatch) {
        items.push({
          code: "EXISTING_LOCK_OR_EXPORT",
          detail: `Existing payroll handoff batch ${existingBatch.batchNumber} is ${existingBatch.status.toLowerCase()}.`,
          severity: "warning",
          sourceId: existingBatch.id
        });
      }

      const blockingItems = items.filter((item) => item.severity === "blocking").length;
      return {
        generatedAt: input.generatedAt.toISOString(),
        locationId: input.locationId,
        organizationId: input.organizationId,
        payPeriod: { start: dateOnly(input.periodStart), end: dateOnly(input.periodEnd) },
        ready: cards.length > 0 && blockingItems === 0 && !existingBatch,
        totals: {
          approvedCards: cards.filter((card) => ["APPROVED", "LOCKED", "EXPORTED"].includes(card.status)).length,
          blockingItems,
          cardCount: cards.length,
          lockedOrExportedBatches: existingBatch ? 1 : 0,
          openSessions: openSessions.length,
          pendingCorrections: items.filter((item) => item.code === "PENDING_CORRECTION").length,
          pendingTimeOff: timeOff.length,
          warningItems: items.filter((item) => item.severity === "warning").length
        },
        items
      };
    },
    async lock(input: {
      actor: AuthenticatedUser;
      locationId: string;
      organizationId: string;
      periodEnd: Date;
      periodStart: Date;
      reason: string;
    }): Promise<{ batchId: string; duplicate: boolean; readiness: PayrollHandoffReadiness; status: string }> {
      if (database.$transaction) {
        return database.$transaction(
          (tx) => createPayrollHandoffRepository(tx).lock(input),
          { isolationLevel: "Serializable" }
        );
      }
      const loaded = await loadPeriod(input);
      if (loaded.existingBatch) {
        return { batchId: loaded.existingBatch.id, duplicate: true, readiness: await this.readiness({ ...input, generatedAt: new Date() }), status: loaded.existingBatch.status };
      }
      const readiness = await this.readiness({ ...input, generatedAt: new Date() });
      if (!readiness.ready) throw new Error("Pay period is not ready to lock.");
      const { cards } = await loadPeriod(input);
      const preview = buildPreview({ cards, generatedAt: new Date(), periodEnd: input.periodEnd, periodStart: input.periodStart });
      const batch = await database.timeAttendanceExportBatch.create({
        data: {
          organizationId: input.organizationId,
          locationId: input.locationId,
          batchNumber: batchNumber(input.periodStart, input.periodEnd),
          periodStart: input.periodStart,
          periodEnd: input.periodEnd,
          status: "LOCKED",
          fileChecksum: preview.checksum,
          exportSnapshot: {
            controlTotals: preview.controlTotals,
            lineCount: preview.lineCount,
            lockedByUserId: input.actor.id,
            lockedReason: input.reason,
            readiness,
            source: "TA_G4_PAYROLL_LOCK"
          },
          createdByUserId: input.actor.id
        }
      });
      await database.timeCard.updateMany({
        where: { id: { in: cards.map((card) => card.id) } },
        data: { lockedAt: new Date(), payrollReady: true, status: "LOCKED" }
      });
      return { batchId: batch.id, duplicate: false, readiness, status: batch.status };
    },
    async reopen(input: {
      actor: AuthenticatedUser;
      batchId: string;
      reason: string;
    }) {
      const existing = await database.timeAttendanceExportBatch.findFirst({ where: { id: input.batchId }, include: { lines: true } });
      if (!existing) throw new Error("Payroll handoff batch was not found.");
      if (existing.status === "VOID") return { batchId: existing.id, duplicate: true, status: existing.status };
      if (existing.status === "RECONCILED") throw new Error("A reconciled batch requires a new governed adjustment process; it cannot be reopened directly.");
      const batch = await database.timeAttendanceExportBatch.update({
        where: { id: input.batchId },
        data: {
          status: "VOID",
          exportSnapshot: {
            ...snapshotObject(existing.exportSnapshot),
            reopenedByUserId: input.actor.id,
            reopenedReason: input.reason,
            reopenedAt: new Date().toISOString(),
            source: "TA_G4_REOPEN"
          }
        }
      });
      await database.timeCard.updateMany({
        where: existing.lines?.length
          ? { id: { in: existing.lines.map((line) => line.timeCardId) }, status: { in: ["LOCKED", "EXPORTED"] } }
          : { organizationId: INITIAL_ORGANIZATION.id, locationId: existing.locationId, periodStart: existing.periodStart, periodEnd: existing.periodEnd, status: { in: ["LOCKED", "EXPORTED"] } },
        data: { lockedAt: null, payrollReady: false, status: "REOPENED" }
      });
      return { batchId: batch.id, duplicate: false, status: batch.status };
    },
    async preview(input: {
      locationId: string;
      organizationId: string;
      periodEnd: Date;
      periodStart: Date;
    }) {
      const { cards, existingBatch } = await loadPeriod(input);
      return buildPreview({
        batchId: existingBatch?.id ?? null,
        cards: cards.filter((card) => ["LOCKED", "EXPORTED", "APPROVED"].includes(card.status)),
        generatedAt: new Date(),
        periodEnd: input.periodEnd,
        periodStart: input.periodStart
      });
    },
    async persistPreview(input: {
      batchId: string;
      preview: PayrollExportPreview;
      organizationId: string;
    }) {
      const existing = await database.timeAttendanceExportBatch.findFirst({ where: { id: input.batchId }, include: { lines: true } });
      if (!existing) throw new Error("Payroll handoff batch was not found.");
      if (["EXPORTED", "ACKNOWLEDGED", "RECONCILED"].includes(existing.status) && existing.fileChecksum === input.preview.checksum) {
        return { batchId: existing.id, checksum: existing.fileChecksum, duplicate: true, status: existing.status };
      }
      if (existing.status !== "LOCKED" && existing.status !== "REJECTED") {
        throw new Error(`A ${existing.status.toLowerCase()} batch cannot create a new handoff file.`);
      }
      await database.timeAttendanceExportLine.createMany({
        data: input.preview.lines.map((line) => ({
          organizationId: input.organizationId,
          exportBatchId: input.batchId,
          timeCardId: line.timeCardId,
          timeCardVersion: line.timeCardVersion,
          earningCode: line.earningCode,
          minutes: line.minutes,
          amountCents: line.amountCents,
          lineSnapshot: line
        })),
        skipDuplicates: true
      });
      const fileContent = renderPayrollHandoffCsv(input.preview);
      const batch = await database.timeAttendanceExportBatch.update({
        where: { id: input.batchId },
        data: {
          fileChecksum: input.preview.checksum,
          status: "EXPORTED",
          exportedAt: new Date(),
          exportSnapshot: {
            ...snapshotObject(existing.exportSnapshot),
            checksum: input.preview.checksum,
            controlTotals: input.preview.controlTotals,
            fileContent,
            fileFormat: "CSV_UTF8_CRLF",
            lineCount: input.preview.lineCount,
            mappingVersion: "CONFIGURED_ON_PAY_PERIOD_AND_CARD",
            providerState: "NOT_TRANSMITTED",
            source: "TA_G4_PAYROLL_HANDOFF_FILE"
          }
        }
      });
      return { batchId: batch.id, checksum: batch.fileChecksum, duplicate: false, status: batch.status };
    },
    async status(input: {
      actor: AuthenticatedUser;
      batchId: string;
      decision: "ACKNOWLEDGE" | "REJECT" | "RECONCILE";
      reason: string;
    }) {
      const existing = await database.timeAttendanceExportBatch.findFirst({ where: { id: input.batchId } });
      if (!existing) throw new Error("Payroll handoff batch was not found.");
      if (existing.status === (input.decision === "ACKNOWLEDGE" ? "ACKNOWLEDGED" : input.decision === "RECONCILE" ? "RECONCILED" : "REJECTED")) {
        return { batchId: existing.id, duplicate: true, status: existing.status };
      }
      const allowedPrior = input.decision === "RECONCILE" ? ["ACKNOWLEDGED", "REJECTED"] : ["EXPORTED"];
      if (!allowedPrior.includes(existing.status)) {
        throw new Error(`${input.decision.toLowerCase()} is not allowed while the batch is ${existing.status.toLowerCase()}.`);
      }
      const status = input.decision === "ACKNOWLEDGE"
        ? "ACKNOWLEDGED"
        : input.decision === "RECONCILE"
          ? "RECONCILED"
          : "REJECTED";
      const batch = await database.timeAttendanceExportBatch.update({
        where: { id: input.batchId },
        data: {
          acknowledgedAt: status === "ACKNOWLEDGED" ? new Date() : undefined,
          status,
          exportSnapshot: {
            ...snapshotObject(existing.exportSnapshot),
            decision: input.decision,
            decisionAt: new Date().toISOString(),
            decisionReason: input.reason,
            decisionUserId: input.actor.id,
            source: "TA_G4_EXPORT_STATUS"
          }
        }
      });
      return { batchId: batch.id, duplicate: false, status: batch.status };
    },
    async reproduce(input: { batchId: string }) {
      const batch = await database.timeAttendanceExportBatch.findFirst({
        where: { id: input.batchId },
        include: { lines: true }
      });
      if (!batch) throw new Error("Payroll export batch was not found.");
      return {
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        checksum: batch.fileChecksum,
        exportSnapshot: batch.exportSnapshot,
        lineCount: batch.lines?.length ?? 0,
        lines: batch.lines ?? [],
        reproducible: Boolean(batch.fileChecksum)
      };
    }
  };
}

async function resolvePayrollPeriod(input: {
  locationId: string;
  organizationId: string;
  periodEnd?: string;
  periodStart?: string;
  allowExplicitWithoutConfiguration?: boolean;
}) {
  if ((input.periodStart && !input.periodEnd) || (!input.periodStart && input.periodEnd)) {
    throw new Error("Both pay-period start and end are required together.");
  }
  const definition = input.allowExplicitWithoutConfiguration ? null : await prisma.timeAttendancePayPeriodDefinition.findFirst({
    where: {
      organizationId: input.organizationId,
      status: "ACTIVE",
      effectiveFrom: { lte: new Date() },
      OR: [{ locationId: input.locationId }, { locationId: null }],
      AND: [{ OR: [{ effectiveTo: null }, { effectiveTo: { gte: new Date() } }] }]
    },
    orderBy: [{ locationId: "desc" }, { effectiveFrom: "desc" }, { version: "desc" }]
  });
  if (input.periodStart && input.periodEnd) {
    const explicit = {
      periodStart: parseDate(input.periodStart, "Period start"),
      periodEnd: parseDate(input.periodEnd, "Period end")
    };
    if (explicit.periodEnd < explicit.periodStart) throw new Error("Pay-period end must be on or after its start.");
    return { ...explicit, configured: Boolean(definition) || Boolean(input.allowExplicitWithoutConfiguration) };
  }
  const period = definition
    ? anchoredPeriodForInstant({ anchorDate: definition.anchorDate, instant: new Date(), periodLengthDays: definition.periodLengthDays, timeZone: definition.timezone })
    : weeklyPeriodForInstant({ instant: new Date(), timeZone: "America/Chicago", workweekStartDay: "SATURDAY" });
  return { periodStart: period.periodStart, periodEnd: period.periodEnd, configured: Boolean(definition) || Boolean(input.allowExplicitWithoutConfiguration) };
}

export async function getPayrollHandoffReadiness(actor: AuthenticatedUser | null, input: {
  locationId?: string;
  organizationId?: string;
  periodEnd?: string;
  periodStart?: string;
  repository?: ReturnType<typeof createPayrollHandoffRepository>;
} = {}) {
  await requirePayrollAuthority(
    actor,
    "TIME_PAYROLL_ADMIN",
    input.organizationId ?? INITIAL_ORGANIZATION.id,
    input.locationId ?? INITIAL_MINNEAPOLIS_LOCATION.id
  );
  const repository = input.repository ?? createPayrollHandoffRepository();
  const period = await resolvePayrollPeriod({
    locationId: input.locationId ?? INITIAL_MINNEAPOLIS_LOCATION.id,
    organizationId: input.organizationId ?? INITIAL_ORGANIZATION.id,
    periodEnd: input.periodEnd,
    periodStart: input.periodStart,
    allowExplicitWithoutConfiguration: Boolean(input.repository)
  });
  const readiness = await repository.readiness({
    generatedAt: new Date(),
    locationId: input.locationId ?? INITIAL_MINNEAPOLIS_LOCATION.id,
    organizationId: input.organizationId ?? INITIAL_ORGANIZATION.id,
    periodEnd: period.periodEnd,
    periodStart: period.periodStart
  });
  if (period.configured) return readiness;
  const blocker: PayrollHandoffReadinessItem = {
    code: "PAY_PERIOD_NOT_CONFIGURED",
    detail: "An active, governed pay-period definition is required before payroll lock or export.",
    severity: "blocking",
    sourceId: "pay-period-definition"
  };
  return {
    ...readiness,
    ready: false,
    totals: { ...readiness.totals, blockingItems: readiness.totals.blockingItems + 1 },
    items: [blocker, ...readiness.items]
  };
}

export async function getSafePayrollHandoffReadiness(actor: AuthenticatedUser | null, input: Parameters<typeof getPayrollHandoffReadiness>[1] = {}) {
  try {
    return await getPayrollHandoffReadiness(actor, input);
  } catch (error) {
    const fallback = weeklyPeriodForInstant({ instant: new Date(), timeZone: "America/Chicago", workweekStartDay: "SATURDAY" });
    return {
      generatedAt: new Date().toISOString(),
      locationId: input.locationId ?? INITIAL_MINNEAPOLIS_LOCATION.id,
      organizationId: input.organizationId ?? INITIAL_ORGANIZATION.id,
      payPeriod: { start: input.periodStart ?? fallback.periodStartKey, end: input.periodEnd ?? fallback.periodEndKey },
      ready: false,
      totals: { approvedCards: 0, blockingItems: 1, cardCount: 0, lockedOrExportedBatches: 0, openSessions: 0, pendingCorrections: 0, pendingTimeOff: 0, warningItems: 0 },
      items: [{
        code: "CARD_NOT_READY" as const,
        detail: error instanceof Error ? error.message : "Payroll readiness is unavailable.",
        severity: "blocking" as const,
        sourceId: "payroll-readiness-unavailable"
      }]
    };
  }
}

function parseCommand(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Payroll handoff payload must be an object.");
  return value as Record<string, unknown>;
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function runPayrollHandoffCommand(actor: AuthenticatedUser | null, value: unknown, input: {
  repository?: ReturnType<typeof createPayrollHandoffRepository>;
} = {}) {
  const raw = parseCommand(value);
  const command = text(raw.command).toUpperCase();
  const capability: TimeAttendanceCapability = command === "LOCK" || command === "REOPEN"
    ? "TIME_PERIOD_LOCK_REOPEN"
    : ["ACKNOWLEDGE", "REJECT", "RECONCILE"].includes(command)
      ? "TIME_EXPORT_RECONCILIATION"
      : "TIME_PAYROLL_ADMIN";
  const user = await requirePayrollAuthority(
    actor,
    capability,
    INITIAL_ORGANIZATION.id,
    text(raw.locationId) || INITIAL_MINNEAPOLIS_LOCATION.id
  );
  const reason = text(raw.reason);
  if (["LOCK", "REOPEN", "ACKNOWLEDGE", "REJECT", "RECONCILE"].includes(command) && reason.length < 15) {
    throw new Error("Payroll handoff reason must be at least 15 characters.");
  }
  const repository = input.repository ?? createPayrollHandoffRepository();
  const period = await resolvePayrollPeriod({
    locationId: text(raw.locationId) || INITIAL_MINNEAPOLIS_LOCATION.id,
    organizationId: INITIAL_ORGANIZATION.id,
    periodEnd: text(raw.periodEnd) || undefined,
    periodStart: text(raw.periodStart) || undefined,
    allowExplicitWithoutConfiguration: Boolean(input.repository)
  });
  if (!period.configured && ["LOCK", "EXPORT_PREVIEW"].includes(command)) {
    throw new Error("An active governed pay-period definition is required before payroll lock or export.");
  }
  if (command === "LOCK") {
    const result = await repository.lock({
      actor: user,
      locationId: text(raw.locationId) || INITIAL_MINNEAPOLIS_LOCATION.id,
      organizationId: INITIAL_ORGANIZATION.id,
      periodEnd: period.periodEnd,
      periodStart: period.periodStart,
      reason
    });
    if (!input.repository) await notifyTimeAttendanceReviewers({
      organizationId: INITIAL_ORGANIZATION.id,
      locationId: text(raw.locationId) || INITIAL_MINNEAPOLIS_LOCATION.id,
      capability: "TIME_PAYROLL_ADMIN",
      notificationType: "PAYROLL_STATUS",
      title: "Pay period locked",
      body: `Payroll handoff ${result.batchId} is locked; no provider transmission is claimed.`,
      sourceType: "TimeAttendanceExportBatch",
      sourceId: result.batchId,
      payload: { status: result.status, externalDeliveryClaimed: false }
    });
    return result;
  }
  if (command === "REOPEN") return repository.reopen({ actor: user, batchId: text(raw.batchId), reason });
  if (["ACKNOWLEDGE", "REJECT", "RECONCILE"].includes(command)) {
    return repository.status({ actor: user, batchId: text(raw.batchId), decision: command as "ACKNOWLEDGE" | "REJECT" | "RECONCILE", reason });
  }
  if (command === "EXPORT_PREVIEW") {
    const preview = await repository.preview({
      locationId: text(raw.locationId) || INITIAL_MINNEAPOLIS_LOCATION.id,
      organizationId: INITIAL_ORGANIZATION.id,
      periodEnd: period.periodEnd,
      periodStart: period.periodStart
    });
    return text(raw.batchId)
      ? repository.persistPreview({ batchId: text(raw.batchId), organizationId: INITIAL_ORGANIZATION.id, preview })
      : preview;
  }
  if (command === "REPRODUCE") return repository.reproduce({ batchId: text(raw.batchId) });
  throw new Error("Payroll handoff command is invalid.");
}

export async function getPayrollHandoffFile(actor: AuthenticatedUser | null, batchId: string) {
  const user = await requirePayrollAuthority(actor, "TIME_PAYROLL_ADMIN");
  if (!batchId) throw new Error("Payroll batch is required.");
  const batch = await prisma.timeAttendanceExportBatch.findFirst({
    where: { id: batchId, organizationId: INITIAL_ORGANIZATION.id },
    include: { lines: true }
  });
  if (!batch) throw new Error("Payroll handoff batch was not found.");
  const snapshot = snapshotObject(batch.exportSnapshot);
  const fileContent = typeof snapshot.fileContent === "string" ? snapshot.fileContent : null;
  if (!fileContent) throw new Error("This batch does not yet have a persisted payroll handoff file.");
  await recordSafeInternalTimeAttendanceNotification({
    organizationId: batch.organizationId,
    locationId: batch.locationId,
    recipientUserId: user.id,
    notificationType: "PAYROLL_STATUS",
    title: "Payroll handoff file downloaded",
    body: "The file was downloaded for controlled review. This is not proof of transmission or payment.",
    sourceType: "TimeAttendanceExportBatch",
    sourceId: batch.id,
    payload: { providerState: "NOT_TRANSMITTED", checksum: batch.fileChecksum }
  });
  return {
    batchNumber: batch.batchNumber,
    checksum: batch.fileChecksum,
    content: fileContent,
    filename: `${batch.batchNumber}.csv`
  };
}
