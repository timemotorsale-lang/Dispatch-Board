import { describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import {
  createPayrollHandoffRepository,
  getPayrollHandoffReadiness,
  runPayrollHandoffCommand
} from "@/server/time-attendance";

const manager: AuthenticatedUser = {
  id: "manager-1",
  name: "Manager One",
  email: "manager@example.com",
  isActive: true,
  roles: ["General Manager"],
  duties: { all: [], direct: [], roleDefaults: [] }
};

const staff: AuthenticatedUser = {
  id: "staff-1",
  name: "Staff One",
  email: "staff@example.com",
  isActive: true,
  roles: ["Mechanic"],
  duties: { all: [], direct: [], roleDefaults: [] }
};

function card(overrides: Record<string, unknown> = {}) {
  return {
    id: "card-1",
    approvals: [{ id: "approval-1", timeCardVersion: 3 }],
    calculationSnapshot: {
      totals: { esstNewlyAccruedMinutes: 5, overtimeMinutes: 30, regularMinutes: 450 }
    },
    correctionRequests: [],
    exceptions: [],
    payrollReady: true,
    staffUser: { name: "Staff One" },
    staffUserId: "staff-1",
    status: "APPROVED",
    version: 3,
    ...overrides
  };
}

function db(overrides: Record<string, unknown> = {}) {
  return {
    timeAttendanceSession: { findMany: vi.fn(async () => []) },
    timeAttendanceExportBatch: {
      create: vi.fn(async () => ({ id: "batch-1", batchNumber: "TA-2026-07-25-2026-07-31", exportSnapshot: {}, fileChecksum: "sha256:test", status: "LOCKED" })),
      findFirst: vi.fn(async () => null),
      update: vi.fn(async (input) => ({ id: input.where.id, batchNumber: "TA-2026-07-25-2026-07-31", exportSnapshot: input.data.exportSnapshot ?? {}, fileChecksum: input.data.fileChecksum ?? "sha256:test", status: input.data.status }))
    },
    timeAttendanceExportLine: { createMany: vi.fn(async () => ({ count: 3 })) },
    timeCard: {
      findMany: vi.fn(async () => [card()]),
      updateMany: vi.fn(async () => ({ count: 1 }))
    },
    timeOffRequest: { findMany: vi.fn(async () => []) },
    ...overrides
  };
}

describe("time attendance payroll handoff", () => {
  it("requires manager authority for payroll readiness", async () => {
    await expect(getPayrollHandoffReadiness(staff, {
      repository: createPayrollHandoffRepository(db())
    })).rejects.toThrow("Only managers");
  });

  it("projects a ready pay period when approved cards have no blockers", async () => {
    await expect(getPayrollHandoffReadiness(manager, {
      periodEnd: "2026-07-31",
      periodStart: "2026-07-25",
      repository: createPayrollHandoffRepository(db())
    })).resolves.toMatchObject({
      ready: true,
      totals: {
        approvedCards: 1,
        blockingItems: 0,
        cardCount: 1
      }
    });
  });

  it("blocks readiness for unresolved exceptions and pending corrections", async () => {
    const repository = createPayrollHandoffRepository(db({
      timeCard: {
        findMany: vi.fn(async () => [card({
          correctionRequests: [{ id: "correction-1", status: "SUBMITTED" }],
          exceptions: [{ id: "exception-1", blocking: true, code: "MISSING_CLOCK_OUT", message: "Clock out missing.", status: "OPEN" }]
        })]),
        updateMany: vi.fn()
      }
    }));

    await expect(getPayrollHandoffReadiness(manager, {
      repository
    })).resolves.toMatchObject({
      ready: false,
      totals: {
        blockingItems: 2,
        pendingCorrections: 1
      },
      items: [
        { code: "BLOCKING_EXCEPTION" },
        { code: "PENDING_CORRECTION" }
      ]
    });
  });

  it("locks only when readiness gates pass", async () => {
    const fakeDb = db();
    const result = await runPayrollHandoffCommand(manager, {
      command: "LOCK",
      periodEnd: "2026-07-31",
      periodStart: "2026-07-25",
      reason: "All cards reviewed and ready for payroll handoff."
    }, {
      repository: createPayrollHandoffRepository(fakeDb)
    });

    expect(result).toMatchObject({ batchId: "batch-1", status: "LOCKED" });
    expect(fakeDb.timeCard.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: "LOCKED" })
    }));
  });

  it("previews versioned payroll export lines and control totals", async () => {
    await expect(runPayrollHandoffCommand(manager, {
      command: "EXPORT_PREVIEW",
      periodEnd: "2026-07-31",
      periodStart: "2026-07-25"
    }, {
      repository: createPayrollHandoffRepository(db())
    })).resolves.toMatchObject({
      controlTotals: { ESST: 5, OVERTIME: 30, REGULAR: 450 },
      lineCount: 3,
      lines: [
        { earningCode: "REGULAR", timeCardId: "card-1", timeCardVersion: 3 },
        { earningCode: "OVERTIME", timeCardId: "card-1", timeCardVersion: 3 },
        { earningCode: "ESST", timeCardId: "card-1", timeCardVersion: 3 }
      ]
    });
  });

  it("records export status decisions and reproduces historical batches", async () => {
    const fakeDb = db({
      timeAttendanceExportBatch: {
        create: vi.fn(),
        findFirst: vi.fn(async () => ({
          id: "batch-1",
          batchNumber: "TA-2026-07-25-2026-07-31",
          exportSnapshot: { controlTotals: { REGULAR: 450 } },
          fileChecksum: "sha256:export",
          status: "ACKNOWLEDGED",
          lines: [{ amountCents: null, earningCode: "REGULAR", lineSnapshot: {}, minutes: 450, timeCardId: "card-1", timeCardVersion: 3 }]
        })),
        update: vi.fn(async (input) => ({ id: input.where.id, batchNumber: "batch", exportSnapshot: input.data.exportSnapshot, fileChecksum: "sha256:export", status: input.data.status }))
      }
    });
    const repository = createPayrollHandoffRepository(fakeDb);

    await expect(runPayrollHandoffCommand(manager, {
      batchId: "batch-1",
      command: "ACKNOWLEDGE",
      reason: "Payroll provider accepted all submitted control totals."
    }, { repository })).resolves.toMatchObject({ status: "ACKNOWLEDGED" });

    await expect(runPayrollHandoffCommand(manager, {
      batchId: "batch-1",
      command: "REPRODUCE"
    }, { repository })).resolves.toMatchObject({
      batchId: "batch-1",
      checksum: "sha256:export",
      lineCount: 1,
      reproducible: true
    });
  });
});
