import { INITIAL_MINNEAPOLIS_LOCATION, INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import type { AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";
import { hashTimeCardReplay } from "@/server/time-attendance/replay";
import { assertAuthenticatedUser, isManager } from "@/server/policies/access";

export type PayrollHandoffBlockerCode =
  | "OPEN_SESSION"
  | "CARD_NOT_READY"
  | "BLOCKING_EXCEPTION"
  | "PENDING_CORRECTION"
  | "MISSING_MANAGER_APPROVAL"
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
  earningCode: "REGULAR" | "OVERTIME" | "ESST";
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
  correctionRequests: { id: string; status: string }[];
};

type ExportBatchRecord = {
  id: string;
  batchNumber: string;
  exportSnapshot: unknown;
  fileChecksum: string | null;
  status: string;
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
};

function dateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

function parseDate(value: string | undefined, fallback: string, label: string) {
  const parsed = new Date(`${value ?? fallback}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) throw new Error(`${label} must be a YYYY-MM-DD date.`);
  return parsed;
}

function periodEndExclusive(end: Date) {
  return new Date(end.getTime() + 24 * 60 * 60 * 1000);
}

function requireManager(actor: AuthenticatedUser | null) {
  const user = assertAuthenticatedUser(actor);
  if (!isManager(user)) throw new Error("Only managers can manage payroll handoff.");
  return user;
}

function calculationTotals(snapshot: unknown) {
  const value = snapshot as { totals?: Record<string, unknown> } | null;
  return {
    esst: numberValue(value?.totals?.esstNewlyAccruedMinutes),
    overtime: numberValue(value?.totals?.overtimeMinutes),
    regular: numberValue(value?.totals?.regularMinutes)
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
      { ...base, earningCode: "ESST" as const, minutes: totals.esst }
    ].filter((line) => line.minutes > 0);
  });
  const controlTotals = {
    ESST: lines.filter((line) => line.earningCode === "ESST").reduce((sum, line) => sum + line.minutes, 0),
    OVERTIME: lines.filter((line) => line.earningCode === "OVERTIME").reduce((sum, line) => sum + line.minutes, 0),
    REGULAR: lines.filter((line) => line.earningCode === "REGULAR").reduce((sum, line) => sum + line.minutes, 0)
  };
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

export function createPayrollHandoffRepository(database: PayrollHandoffDatabase = prisma as unknown as PayrollHandoffDatabase) {
  async function loadPeriod(input: {
    locationId: string;
    organizationId: string;
    periodEnd: Date;
    periodStart: Date;
  }) {
    const endExclusive = periodEndExclusive(input.periodEnd);
    const [cards, openSessions, timeOff, existingBatch] = await Promise.all([
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
      })
    ]);

    return { cards, existingBatch, openSessions, timeOff };
  }

  return {
    async readiness(input: {
      generatedAt: Date;
      locationId: string;
      organizationId: string;
      periodEnd: Date;
      periodStart: Date;
    }): Promise<PayrollHandoffReadiness> {
      const { cards, existingBatch, openSessions, timeOff } = await loadPeriod(input);
      const items: PayrollHandoffReadinessItem[] = [];

      for (const session of openSessions) {
        items.push({
          code: "OPEN_SESSION",
          detail: `Open ${session.state.toLowerCase()} session must be closed before payroll lock.`,
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
    }) {
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
      const batch = await database.timeAttendanceExportBatch.update({
        where: { id: input.batchId },
        data: {
          status: "VOID",
          exportSnapshot: {
            reopenedByUserId: input.actor.id,
            reopenedReason: input.reason,
            reopenedAt: new Date().toISOString(),
            source: "TA_G4_REOPEN"
          }
        }
      });
      return { batchId: batch.id, status: batch.status };
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
      const batch = await database.timeAttendanceExportBatch.update({
        where: { id: input.batchId },
        data: {
          fileChecksum: input.preview.checksum,
          status: "EXPORTED",
          exportedAt: new Date(),
          exportSnapshot: {
            checksum: input.preview.checksum,
            controlTotals: input.preview.controlTotals,
            lineCount: input.preview.lineCount,
            source: "TA_G4_EXPORT_PREVIEW"
          }
        }
      });
      return { batchId: batch.id, checksum: batch.fileChecksum, status: batch.status };
    },
    async status(input: {
      actor: AuthenticatedUser;
      batchId: string;
      decision: "ACKNOWLEDGE" | "REJECT" | "RECONCILE";
      reason: string;
    }) {
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
            decision: input.decision,
            decisionAt: new Date().toISOString(),
            decisionReason: input.reason,
            decisionUserId: input.actor.id,
            source: "TA_G4_EXPORT_STATUS"
          }
        }
      });
      return { batchId: batch.id, status: batch.status };
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

export async function getPayrollHandoffReadiness(actor: AuthenticatedUser | null, input: {
  locationId?: string;
  organizationId?: string;
  periodEnd?: string;
  periodStart?: string;
  repository?: ReturnType<typeof createPayrollHandoffRepository>;
} = {}) {
  requireManager(actor);
  const repository = input.repository ?? createPayrollHandoffRepository();
  return repository.readiness({
    generatedAt: new Date(),
    locationId: input.locationId ?? INITIAL_MINNEAPOLIS_LOCATION.id,
    organizationId: input.organizationId ?? INITIAL_ORGANIZATION.id,
    periodEnd: parseDate(input.periodEnd, "2026-07-31", "Period end"),
    periodStart: parseDate(input.periodStart, "2026-07-25", "Period start")
  });
}

export async function getSafePayrollHandoffReadiness(actor: AuthenticatedUser | null, input: Parameters<typeof getPayrollHandoffReadiness>[1] = {}) {
  try {
    return await getPayrollHandoffReadiness(actor, input);
  } catch (error) {
    return {
      generatedAt: new Date().toISOString(),
      locationId: input.locationId ?? INITIAL_MINNEAPOLIS_LOCATION.id,
      organizationId: input.organizationId ?? INITIAL_ORGANIZATION.id,
      payPeriod: { start: input.periodStart ?? "2026-07-25", end: input.periodEnd ?? "2026-07-31" },
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
  const user = requireManager(actor);
  const raw = parseCommand(value);
  const command = text(raw.command).toUpperCase();
  const reason = text(raw.reason);
  if (["LOCK", "REOPEN", "ACKNOWLEDGE", "REJECT", "RECONCILE"].includes(command) && reason.length < 15) {
    throw new Error("Payroll handoff reason must be at least 15 characters.");
  }
  const repository = input.repository ?? createPayrollHandoffRepository();
  if (command === "LOCK") {
    return repository.lock({
      actor: user,
      locationId: text(raw.locationId) || INITIAL_MINNEAPOLIS_LOCATION.id,
      organizationId: INITIAL_ORGANIZATION.id,
      periodEnd: parseDate(text(raw.periodEnd), "2026-07-31", "Period end"),
      periodStart: parseDate(text(raw.periodStart), "2026-07-25", "Period start"),
      reason
    });
  }
  if (command === "REOPEN") return repository.reopen({ actor: user, batchId: text(raw.batchId), reason });
  if (["ACKNOWLEDGE", "REJECT", "RECONCILE"].includes(command)) {
    return repository.status({ actor: user, batchId: text(raw.batchId), decision: command as "ACKNOWLEDGE" | "REJECT" | "RECONCILE", reason });
  }
  if (command === "EXPORT_PREVIEW") {
    const preview = await repository.preview({
      locationId: text(raw.locationId) || INITIAL_MINNEAPOLIS_LOCATION.id,
      organizationId: INITIAL_ORGANIZATION.id,
      periodEnd: parseDate(text(raw.periodEnd), "2026-07-31", "Period end"),
      periodStart: parseDate(text(raw.periodStart), "2026-07-25", "Period start")
    });
    return text(raw.batchId)
      ? repository.persistPreview({ batchId: text(raw.batchId), organizationId: INITIAL_ORGANIZATION.id, preview })
      : preview;
  }
  if (command === "REPRODUCE") return repository.reproduce({ batchId: text(raw.batchId) });
  throw new Error("Payroll handoff command is invalid.");
}
