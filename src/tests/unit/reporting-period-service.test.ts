import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@/server/auth/store";
import { draftReportCalendar } from "@/lib/reporting/calendar";
import { preparePeriodReport } from "@/server/reporting/period-service";

const mocks = vi.hoisted(() => ({
  calendar: vi.fn(),
  user: vi.fn(),
  staffDays: vi.fn(),
  series: vi.fn(),
  updates: vi.fn(),
  signals: vi.fn(),
  drafts: vi.fn(),
  expectation: vi.fn(),
  events: vi.fn(), focuses: vi.fn(),
  tasks: vi.fn()
}));

vi.mock("@/server/db/client", () => ({
  prisma: {
    activityEvent: { findMany: mocks.events }, workdayDailyFocusItem: { findMany: mocks.focuses },
    user: { findUniqueOrThrow: mocks.user },
    staffDay: { findMany: mocks.staffDays },
    reportingSeries: { findUnique: mocks.series },
    workdayQuickUpdate: { findMany: mocks.updates },
    workdayActivitySignal: { findMany: mocks.signals },
    dealDeskDraft: { findMany: mocks.drafts },
    reportingExpectation: { findUnique: mocks.expectation },
    task: { findMany: mocks.tasks }
  }
}));
vi.mock("@/server/reporting/calendar-service", () => ({ loadReportingCalendar: mocks.calendar }));

const manager: AuthenticatedUser = { id: "gm", name: "Manager", email: "gm@example.test", isActive: true, roles: ["General Manager"], duties: { direct: [], roleDefaults: [], all: [] } };

describe("period report preparation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.calendar.mockResolvedValue(draftReportCalendar);
    mocks.user.mockResolvedValue({ id: "ancilla", name: "Ancilla" });
    mocks.staffDays.mockResolvedValue([]);
    mocks.series.mockResolvedValue(null);
    mocks.updates.mockResolvedValue([]);
    mocks.signals.mockResolvedValue([]);
    mocks.drafts.mockResolvedValue([]);
    mocks.expectation.mockResolvedValue(null);
    mocks.tasks.mockResolvedValue([]); mocks.events.mockResolvedValue([]); mocks.focuses.mockResolvedValue([]);
  });

  it("includes Start Day confirmation and saved deal drafts as daily report activity", async () => {
    mocks.signals.mockResolvedValue([{
      id: "start-signal",
      actionType: "workbook.rhythm_start_confirmed",
      businessImpact: "Ancilla confirmed Start The Day with 2 committed outcome(s).",
      metadata: { sourcePath: "/vehicles/coo-workbook/effectiveness-pilot#start-the-day" },
      occurredAt: new Date("2026-10-05T14:00:00Z")
    }]);
    mocks.drafts.mockResolvedValue([{
      id: "DD-299F39A5",
      customerName: "Abdirahman Abdullahi",
      pathway: "daily-rental",
      vehicleReference: "273372",
      status: "IN_PROGRESS",
      updatedAt: new Date("2026-10-05T18:34:48Z")
    }]);

    const result = await preparePeriodReport(manager, "2026-10-05", "DAILY", "ancilla", new Date("2026-10-05T20:00:00Z"));

    expect(mocks.signals).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        actorUserId: "ancilla",
        OR: [{ reportRelevant: true }, { actionType: "workbook.rhythm_start_confirmed" }]
      }),
      take: 501
    }));
    expect(mocks.drafts).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ ownerUserId: "ancilla", updatedAt: expect.objectContaining({ gte: expect.any(Date), lt: expect.any(Date) }) }),
      take: 501
    }));
    expect(result.content.activity).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "workbook-signal:start-signal", state: "STARTED_DAY", title: expect.stringContaining("Start The Day") }),
      expect.objectContaining({ id: "deal-draft:DD-299F39A5", title: "Abdirahman Abdullahi - Daily Rental", state: "IN_PROGRESS", detail: "273372" })
    ]));
    expect(result.content.sourceCoverage).toContain("Start Day confirmations");
    expect(result.content.sourceCoverage).toContain("saved deal drafts");
  });
});
