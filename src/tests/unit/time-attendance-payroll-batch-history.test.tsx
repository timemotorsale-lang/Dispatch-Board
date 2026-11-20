import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PayrollBatchHistoryPanel } from "@/features/time-attendance/payroll-batch-history-panel";
import { INITIAL_MINNEAPOLIS_LOCATION, INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import type { AuthenticatedUser } from "@/server/auth/store";
import { getPayrollBatchHistory } from "@/server/time-attendance/payroll-batch-history";

const { findMany, listCapabilityGrants } = vi.hoisted(() => ({
  findMany: vi.fn(),
  listCapabilityGrants: vi.fn()
}));

vi.mock("@/server/db/client", () => ({ prisma: { timeAttendanceExportBatch: { findMany } } }));
vi.mock("@/server/enterprise-command/repository", () => ({
  createEnterpriseCommandRepository: () => ({ listCapabilityGrants })
}));

const manager: AuthenticatedUser = {
  id: "manager",
  name: "Manager",
  email: "manager@example.test",
  isActive: true,
  roles: ["General Manager"],
  duties: { all: [], direct: [], roleDefaults: [] }
};

describe("payroll batch history", () => {
  beforeEach(() => {
    findMany.mockReset();
    listCapabilityGrants.mockReset().mockResolvedValue([]);
  });

  it("checks payroll authority before reading any batches", async () => {
    await expect(getPayrollBatchHistory(null)).rejects.toThrow("Authentication required");
    await expect(getPayrollBatchHistory({ ...manager, roles: ["Service Department Manager"] })).rejects.toThrow("TIME_PAYROLL_ADMIN");
    listCapabilityGrants.mockResolvedValue([{
      capability: "TIME_PAYROLL_ADMIN",
      constraints: {},
      effect: "DENY",
      locationId: INITIAL_MINNEAPOLIS_LOCATION.id,
      validFrom: new Date(0),
      validTo: null
    }]);
    await expect(getPayrollBatchHistory(manager)).rejects.toThrow("EXPLICIT_DENY");
    expect(findMany).not.toHaveBeenCalled();
  });

  it("projects a bounded, location-scoped history with only persisted file links and facts", async () => {
    const fields = {
      batchNumber: "TA-2026-10-31-2026-11-06",
      periodStart: new Date("2026-10-31"),
      periodEnd: new Date("2026-11-06"),
      createdAt: new Date("2026-11-07T10:00:00Z"),
      exportedAt: null,
      acknowledgedAt: null
    };
    findMany.mockResolvedValue([
      {
        ...fields, id: "file & review", status: "RECONCILED",
        exportedAt: new Date("2026-11-07T11:00:00Z"),
        acknowledgedAt: new Date("2026-11-07T12:00:00Z"),
        exportSnapshot: {
          fileContent: "private CSV data",
          lineCount: 2,
          controlTotals: { REGULAR: 480, OVERTIME: 0, PTO: "invalid", PRIVATE: 2 },
          decision: "RECONCILE",
          decisionAt: "2026-11-07T13:00:00.000Z",
          decisionReason: "private reviewer notes"
        }
      },
      {
        ...fields, id: "lock-only", status: "LOCKED", fileChecksum: "lock checksum",
        exportSnapshot: { reopenedAt: "invalid", providerState: "NOT_TRANSMITTED" }
      }
    ]);

    const batches = await getPayrollBatchHistory(manager);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { organizationId: INITIAL_ORGANIZATION.id, locationId: INITIAL_MINNEAPOLIS_LOCATION.id },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 12
    }));
    expect(batches[0]).toMatchObject({
      controlTotals: { REGULAR: 480, OVERTIME: 0 },
      decision: { outcome: "RECONCILE", recordedAt: "2026-11-07T13:00:00.000Z" },
      hasDownload: true,
      lineCount: 2
    });
    expect(batches[0].controlTotals).toEqual({ REGULAR: 480, OVERTIME: 0 });
    expect(batches[1]).toMatchObject({ hasDownload: false, reopenedAt: null, decision: null, lineCount: null, controlTotals: {} });
    expect(JSON.stringify(batches)).not.toMatch(/private CSV data|private reviewer notes/);

    const html = renderToStaticMarkup(<PayrollBatchHistoryPanel batches={batches} />);
    expect(html.match(/\/api\/time-attendance\/payroll-handoff\?/g)).toHaveLength(1);
    expect(html).toContain("/time-attendance?view=payroll&amp;batch=lock-only#payroll-handoff");
    expect(html).toContain("/api/time-attendance/payroll-handoff?download=1&amp;batchId=file+%26+review");
    expect(html).toContain("Oct 31, 2026");
    expect(html).toContain("Reconciliation recorded");
    expect(html).toContain('dateTime="2026-11-07T13:00:00.000Z"');
  });
});
