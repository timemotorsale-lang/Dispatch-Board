import { beforeEach, describe, expect, it, vi } from "vitest";
import { draftReportCalendar } from "@/lib/reporting/calendar";
import { previewReportingCalendar, parseReportingCalendar, generateReportingExpectations } from "@/server/reporting/calendar-service";
import type { AuthenticatedUser } from "@/server/auth/store";

const mocks = vi.hoisted(() => ({ assignments: vi.fn(), people: vi.fn(), policy: vi.fn(), expectations: vi.fn(), timeOff: vi.fn(), transaction: vi.fn(), actor: vi.fn(), create: vi.fn(), lock: vi.fn(), audit: vi.fn() }));
vi.mock("@/server/reporting/command", () => ({ recordReportingCommand: mocks.audit }));
vi.mock("@/server/db/client", () => ({ prisma: { reportingAssignment: { findMany: mocks.assignments }, user: { findMany: mocks.people }, reportingCalendarPolicy: { findFirst: mocks.policy }, reportingExpectation: { findMany: mocks.expectations }, timeOffRequest: { findMany: mocks.timeOff }, $transaction: mocks.transaction } }));
const manager: AuthenticatedUser = { id: "gm", name: "Manager", email: "manager@example.test", isActive: true, roles: ["General Manager"], duties: { direct: [], roleDefaults: [], all: [] } };
const input = { config: { ...draftReportCalendar, dailyDueMinute: 1200 }, from: "2026-10-05", to: "2026-10-09" };
describe("calendar impact preview", () => {
  beforeEach(() => {
    vi.clearAllMocks(); mocks.policy.mockResolvedValue(null); mocks.expectations.mockResolvedValue([]); mocks.timeOff.mockResolvedValue([]);
    mocks.actor.mockResolvedValue({ isActive: true, userRoles: [{ role: { name: "General Manager" } }] });
    mocks.create.mockResolvedValue({ count: 1 }); mocks.audit.mockResolvedValue(undefined);
    mocks.transaction.mockImplementation(async run => run({ $executeRaw: mocks.lock, user: { findUnique: mocks.actor, findMany: mocks.people }, reportingAssignment: { findMany: mocks.assignments }, reportingCalendarPolicy: { findFirst: mocks.policy }, reportingExpectation: { findMany: mocks.expectations, createMany: mocks.create }, timeOffRequest: { findMany: mocks.timeOff } }));
    mocks.assignments.mockResolvedValue([{ id: "a", subjectUserId: "staff", reviewerUserId: "gm", cadence: "DAILY", validFrom: "2026-01-01", validTo: null, dailyDueMinute: null }]);
    mocks.people.mockResolvedValue([{ id: "staff", name: "Staff", isActive: true, userRoles: [] }, { id: "gm", name: "Manager", isActive: true, userRoles: [{ role: { name: "General Manager" } }] }]);
  });
  it("requires active manager authority before reading assignments", async () => {
    await expect(previewReportingCalendar({ ...manager, roles: ["Sales"] }, input)).rejects.toThrow("access");
    await expect(previewReportingCalendar({ ...manager, isActive: false }, input)).rejects.toThrow("access");
    expect(mocks.assignments).not.toHaveBeenCalled();
  });
  it("compares deadlines without mutating policy or existing expectations", async () => {
    mocks.expectations.mockResolvedValue([{ subjectUserId: "staff", cadence: "DAILY", periodStart: "2026-10-05", dueAt: new Date("2026-10-05T23:00:00Z") }]);
    const preview = await previewReportingCalendar(manager, input);
    expect(preview.rows).toHaveLength(5);
    expect(preview.rows[0]).toMatchObject({ change: "CHANGED", existing: true, existingDueAt: "2026-10-05T23:00:00.000Z", dueAt: "2026-10-06T01:00:00.000Z" });
    expect(preview).toMatchObject({ activationEnabled: false, existingPreserved: true });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it("shows periods removed by proposed holidays", async () => {
    const preview = await previewReportingCalendar(manager, { ...input, config: { ...input.config, holidays: ["2026-10-05"] } });
    expect(preview.removed).toHaveLength(1); expect(preview.removed[0].periodStart).toBe("2026-10-05");
  });
  it("blocks reviewer authority revoked after assignment", async () => {
    mocks.people.mockResolvedValue([{ id: "staff", name: "Staff", isActive: true, userRoles: [] }, { id: "gm", name: "Former manager", isActive: true, userRoles: [] }]);
    const preview = await previewReportingCalendar(manager, input);
    expect(preview.rows.every(row => !row.canGenerate)).toBe(true);
  });
  it("rejects an invalid window before database reads", async () => {
    await expect(previewReportingCalendar(manager, { ...input, to: "2025-01-01" })).rejects.toThrow("range");
    expect(mocks.assignments).not.toHaveBeenCalled();
  });
  it.each([
    { dailyDueMinute: "1080" }, { graceMinutes: "30" },
    { workingDays: [1, 1, 2] }, { holidays: ["2026-10-05", "2026-10-05"] },
    { timezone: "Not/A_Timezone" },
  ])("rejects malformed policy values: %j", invalid => {
    expect(() => parseReportingCalendar({ ...draftReportCalendar, ...invalid })).toThrow("invalid");
  });
  it("does not generate obligations when rollout is disabled", async () => {
    vi.stubEnv("REPORTING_EXPECTATIONS_ENABLED", "false");
    try {
      await expect(generateReportingExpectations(manager, input.from, input.to)).rejects.toThrow("not enabled");
      expect(mocks.transaction).not.toHaveBeenCalled();
    } finally { vi.unstubAllEnvs(); }
  });
  it("does not write unresolved approved-leave obligations", async () => {
    vi.stubEnv("REPORTING_EXPECTATIONS_ENABLED", "true");
    mocks.policy.mockResolvedValue({ config: { ...draftReportCalendar, version: "report-calendar/v1" } });
    mocks.timeOff.mockResolvedValue([{ requesterUserId: "staff", startsAt: new Date("2026-10-05T05:00:00Z"), endsAt: new Date("2026-10-06T05:00:00Z") }]);
    try {
      await expect(generateReportingExpectations(manager, input.from, input.to)).rejects.toThrow("resolved leave");
      expect(mocks.create).not.toHaveBeenCalled();
    } finally { vi.unstubAllEnvs(); }
  });
  it("reads current actor authority in the write transaction", async () => {
    vi.stubEnv("REPORTING_EXPECTATIONS_ENABLED", "true");
    mocks.actor.mockResolvedValue({ isActive: true, userRoles: [] });
    try {
      await expect(generateReportingExpectations(manager, input.from, input.to)).rejects.toThrow("access");
      expect(mocks.policy).not.toHaveBeenCalled();
      expect(mocks.create).not.toHaveBeenCalled();
    } finally { vi.unstubAllEnvs(); }
  });
  it("generates bounded obligations and evidence in one serializable transaction", async () => {
    vi.stubEnv("REPORTING_EXPECTATIONS_ENABLED", "true");
    mocks.policy.mockResolvedValue({ config: { ...draftReportCalendar, version: "report-calendar/v1" } });
    try {
      await expect(generateReportingExpectations(manager, input.from, input.to)).resolves.toEqual({ created: 5 });
      expect(mocks.transaction).toHaveBeenCalledTimes(1);
      expect(mocks.transaction.mock.calls[0][1]).toEqual({ isolationLevel: "Serializable", timeout: 30000 });
      expect(mocks.create).toHaveBeenCalledTimes(5);
      expect(mocks.audit).toHaveBeenCalledTimes(5);
    } finally { vi.unstubAllEnvs(); }
  });
  it("propagates evidence failure instead of reporting partial success", async () => {
    vi.stubEnv("REPORTING_EXPECTATIONS_ENABLED", "true");
    mocks.policy.mockResolvedValue({ config: { ...draftReportCalendar, version: "report-calendar/v1" } });
    mocks.audit.mockRejectedValueOnce(new Error("Evidence unavailable"));
    try {
      await expect(generateReportingExpectations(manager, input.from, input.to)).rejects.toThrow("Evidence unavailable");
      expect(mocks.create).toHaveBeenCalledTimes(1);
    } finally { vi.unstubAllEnvs(); }
  });
});
