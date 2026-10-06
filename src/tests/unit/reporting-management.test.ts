import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@/server/auth/store";
import { draftReportCalendar } from "@/lib/reporting/calendar";
import { reportingManagementCoverage } from "@/server/reporting/management-service";
const mocks = vi.hoisted(() => ({ calendar: vi.fn(), expectations: vi.fn(), series: vi.fn(), assignments: vi.fn(), people: vi.fn(), timeOff: vi.fn(), transaction: vi.fn() }));
vi.mock("@/server/db/client", () => ({ prisma: { reportingExpectation: { findMany: mocks.expectations }, reportingSeries: { findMany: mocks.series }, reportingAssignment: { findMany: mocks.assignments }, user: { findMany: mocks.people }, timeOffRequest: { findMany: mocks.timeOff }, $transaction: mocks.transaction } }));
vi.mock("@/server/reporting/calendar-service", () => ({ loadReportingCalendar: mocks.calendar }));
const manager: AuthenticatedUser = { id: "gm", name: "Manager", email: "gm@example.test", isActive: true, roles: ["General Manager"], duties: { direct: [], roleDefaults: [], all: [] } };
describe("management coverage access and bounds", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.calendar.mockResolvedValue(draftReportCalendar); mocks.transaction.mockResolvedValue([[], [], []]); mocks.people.mockResolvedValue([]); mocks.timeOff.mockResolvedValue([]); });
  it("denies inactive and staff callers before reads", async () => {
    await expect(reportingManagementCoverage({ ...manager, roles: ["Salesperson"] }, "2026-05-13", "WEEKLY")).rejects.toThrow("access");
    await expect(reportingManagementCoverage({ ...manager, isActive: false }, "2026-05-13", "WEEKLY")).rejects.toThrow();
    expect(mocks.calendar).not.toHaveBeenCalled(); expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it("bounds period/organization/person reads and never selects employee narrative", async () => {
    await reportingManagementCoverage(manager, "2026-05-13", "WEEKLY", "staff");
    expect(mocks.series).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ subjectUserId: "staff", cadence: "WEEKLY", periodStart: "2026-05-11", organizationId: expect.any(String) }), take: 501 }));
    expect(mocks.assignments).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ subjectUserId: "staff", cadence: "WEEKLY", validFrom: { lte: "2026-05-17" }, organizationId: expect.any(String) }), take: 501 }));
    expect(JSON.stringify(mocks.series.mock.calls)).not.toContain('"content"');
  });
  it("refuses a truncated aggregate", async () => {
    mocks.transaction.mockResolvedValue([Array.from({ length: 501 }, () => ({})), [], []]);
    await expect(reportingManagementCoverage(manager, "2026-05-13", "WEEKLY")).rejects.toThrow("narrower");
    expect(mocks.people).not.toHaveBeenCalled();
  });
  it("counts active reporting assignments as required coverage before expectations are generated", async () => {
    mocks.transaction.mockResolvedValue([[], [], [{ id: "assignment", subjectUserId: "ancilla", reviewerUserId: "gm", cadence: "DAILY", validFrom: "2026-10-01", validTo: null, dailyDueMinute: null }]]);
    mocks.people.mockResolvedValue([{ id: "ancilla", name: "Ancilla", isActive: true }, { id: "gm", name: "Manager", isActive: true }]);
    const result = await reportingManagementCoverage(manager, "2026-10-05", "DAILY");
    expect(result.rows).toEqual([expect.objectContaining({ subjectUserId: "ancilla", subject: "Ancilla", disposition: "REQUIRED", submitted: false })]);
    expect(result.summary).toMatchObject({ required: 1, submitted: 0, missing: 1, submissionRate: { numerator: 0, denominator: 1, value: 0 } });
  });
  it("keeps saved expectation dispositions ahead of assignment-derived coverage", async () => {
    mocks.transaction.mockResolvedValue([[{ subjectUserId: "ancilla", disposition: "EXCUSED" }], [], [{ id: "assignment", subjectUserId: "ancilla", reviewerUserId: "gm", cadence: "DAILY", validFrom: "2026-10-01", validTo: null, dailyDueMinute: null }]]);
    mocks.people.mockResolvedValue([{ id: "ancilla", name: "Ancilla", isActive: true }, { id: "gm", name: "Manager", isActive: true }]);
    const result = await reportingManagementCoverage(manager, "2026-10-05", "DAILY");
    expect(result.rows).toEqual([expect.objectContaining({ subjectUserId: "ancilla", disposition: "EXCUSED" })]);
    expect(result.summary).toMatchObject({ required: 0, excused: 1, missing: 0, submissionRate: { denominator: 0, value: null } });
  });
});
