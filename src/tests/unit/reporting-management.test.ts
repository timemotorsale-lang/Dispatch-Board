import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@/server/auth/store";
import { draftReportCalendar } from "@/lib/reporting/calendar";
import { reportingManagementCoverage } from "@/server/reporting/management-service";
const mocks = vi.hoisted(() => ({ calendar: vi.fn(), expectations: vi.fn(), series: vi.fn(), people: vi.fn(), transaction: vi.fn() }));
vi.mock("@/server/db/client", () => ({ prisma: { reportingExpectation: { findMany: mocks.expectations }, reportingSeries: { findMany: mocks.series }, user: { findMany: mocks.people }, $transaction: mocks.transaction } }));
vi.mock("@/server/reporting/calendar-service", () => ({ loadReportingCalendar: mocks.calendar }));
const manager: AuthenticatedUser = { id: "gm", name: "Manager", email: "gm@example.test", isActive: true, roles: ["General Manager"], duties: { direct: [], roleDefaults: [], all: [] } };
describe("management coverage access and bounds", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.calendar.mockResolvedValue(draftReportCalendar); mocks.transaction.mockResolvedValue([[], []]); mocks.people.mockResolvedValue([]); });
  it("denies inactive and staff callers before reads", async () => {
    await expect(reportingManagementCoverage({ ...manager, roles: ["Salesperson"] }, "2026-05-13", "WEEKLY")).rejects.toThrow("access");
    await expect(reportingManagementCoverage({ ...manager, isActive: false }, "2026-05-13", "WEEKLY")).rejects.toThrow();
    expect(mocks.calendar).not.toHaveBeenCalled(); expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it("bounds period/organization/person reads and never selects employee narrative", async () => {
    await reportingManagementCoverage(manager, "2026-05-13", "WEEKLY", "staff");
    expect(mocks.series).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ subjectUserId: "staff", cadence: "WEEKLY", periodStart: "2026-05-11", organizationId: expect.any(String) }), take: 501 }));
    expect(JSON.stringify(mocks.series.mock.calls)).not.toContain('"content"');
  });
  it("refuses a truncated aggregate", async () => {
    mocks.transaction.mockResolvedValue([Array.from({ length: 501 }, () => ({})), []]);
    await expect(reportingManagementCoverage(manager, "2026-05-13", "WEEKLY")).rejects.toThrow("narrower");
    expect(mocks.people).not.toHaveBeenCalled();
  });
});
