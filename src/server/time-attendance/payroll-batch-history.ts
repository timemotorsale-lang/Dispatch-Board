import type { TimeAttendanceExportStatus } from "@prisma/client";

import { INITIAL_MINNEAPOLIS_LOCATION, INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import type { AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";
import { requireTimeAttendanceCapability } from "./capabilities";

const HISTORY_LIMIT = 12;
const earningCodes = ["REGULAR", "OVERTIME", "ESST", "PTO", "UNPAID", "HOLIDAY"] as const;

export type PayrollBatchHistoryEntry = {
  id: string;
  batchNumber: string;
  status: TimeAttendanceExportStatus;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
  exportedAt: string | null;
  acknowledgedAt: string | null;
  reopenedAt: string | null;
  decision: { outcome: "ACKNOWLEDGE" | "REJECT" | "RECONCILE"; recordedAt: string | null } | null;
  lineCount: number | null;
  controlTotals: Partial<Record<(typeof earningCodes)[number], number>>;
  hasDownload: boolean;
};

function snapshotObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function storedCount(value: unknown) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function snapshotTimestamp(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(value)) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export async function getPayrollBatchHistory(actor: AuthenticatedUser | null): Promise<PayrollBatchHistoryEntry[]> {
  const organizationId = INITIAL_ORGANIZATION.id;
  const locationId = INITIAL_MINNEAPOLIS_LOCATION.id;
  await requireTimeAttendanceCapability({ actor, capability: "TIME_PAYROLL_ADMIN", organizationId, locationId });

  const batches = await prisma.timeAttendanceExportBatch.findMany({
    where: { organizationId, locationId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: HISTORY_LIMIT,
    select: {
      id: true,
      batchNumber: true,
      status: true,
      periodStart: true,
      periodEnd: true,
      createdAt: true,
      exportedAt: true,
      acknowledgedAt: true,
      exportSnapshot: true
    }
  });

  return batches.map((batch) => {
    const snapshot = snapshotObject(batch.exportSnapshot);
    const totals = snapshotObject(snapshot.controlTotals);
    const controlTotals: PayrollBatchHistoryEntry["controlTotals"] = {};
    for (const code of earningCodes) {
      const minutes = storedCount(totals[code]);
      if (minutes !== null) controlTotals[code] = minutes;
    }

    const outcome = snapshot.decision;
    return {
      id: batch.id,
      batchNumber: batch.batchNumber,
      status: batch.status,
      periodStart: batch.periodStart.toISOString().slice(0, 10),
      periodEnd: batch.periodEnd.toISOString().slice(0, 10),
      createdAt: batch.createdAt.toISOString(),
      exportedAt: batch.exportedAt?.toISOString() ?? null,
      acknowledgedAt: batch.acknowledgedAt?.toISOString() ?? null,
      reopenedAt: snapshotTimestamp(snapshot.reopenedAt),
      decision: outcome === "ACKNOWLEDGE" || outcome === "REJECT" || outcome === "RECONCILE"
        ? { outcome, recordedAt: snapshotTimestamp(snapshot.decisionAt) }
        : null,
      lineCount: storedCount(snapshot.lineCount),
      controlTotals,
      hasDownload: typeof snapshot.fileContent === "string" && snapshot.fileContent.length > 0
    };
  });
}
