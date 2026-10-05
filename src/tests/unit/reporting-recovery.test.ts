import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@/server/auth/store";
import { recoverReportingJob } from "@/server/reporting/schedule-service";

const mocks = vi.hoisted(() => ({ find: vi.fn(), schedule: vi.fn(), job: vi.fn(), audit: vi.fn(), calendar: vi.fn(), source: vi.fn(), transaction: vi.fn() }));
vi.mock("@/server/db/client", () => ({ prisma: { reportingJob: { findFirstOrThrow: mocks.find }, $transaction: mocks.transaction } }));
vi.mock("@/server/reporting/calendar-service", () => ({ loadReportingCalendar: mocks.calendar }));
vi.mock("@/server/reporting/live-service", () => ({ readLiveReport: mocks.source }));
vi.mock("@/server/reporting/command", () => ({ recordReportingCommand: mocks.audit }));
const actor: AuthenticatedUser = { id: "gm", name: "Manager", email: "gm@example.test", isActive: true, roles: ["General Manager"], duties: { direct: [], roleDefaults: [], all: [] } };
const input = { id: "job", expectedVersion: 3, reason: "Source access restored after reviewing the failed delivery." };
describe("governed delivery recovery", () => {
  beforeEach(() => {
    vi.clearAllMocks(); vi.stubEnv("REPORTING_SCHEDULES_ENABLED", "true");
    mocks.calendar.mockResolvedValue({ version: "report-calendar/v1" });
    mocks.find.mockResolvedValue({ id: "job", scheduleId: "schedule", status: "DEAD_LETTER", attempts: 5, lockedUntil: null, lastError: "Prior failure", runKey: "original-run", schedule: { enabled: true, definitionId: "appointments" } });
    mocks.source.mockResolvedValue({}); mocks.schedule.mockResolvedValue({ count: 1 }); mocks.job.mockResolvedValue({ count: 1 }); mocks.audit.mockResolvedValue(undefined);
    mocks.transaction.mockImplementation((operation: (tx: unknown) => unknown) => operation({ reportingSchedule: { updateMany: mocks.schedule }, reportingJob: { updateMany: mocks.job } }));
  });
  afterEach(() => vi.unstubAllEnvs());
  it("rejects inactive and nonmanager actors before reading job data", async () => {
    await expect(recoverReportingJob({ ...actor, isActive: false }, input)).rejects.toThrow();
    await expect(recoverReportingJob({ ...actor, roles: ["Salesperson"] }, input)).rejects.toThrow("access");
    expect(mocks.find).not.toHaveBeenCalled();
  });
  it("honors the rollout gate before reading job data", async () => {
    vi.stubEnv("REPORTING_SCHEDULES_ENABLED", "false");
    await expect(recoverReportingJob(actor, input)).rejects.toThrow("not enabled");
    expect(mocks.find).not.toHaveBeenCalled();
  });
  it("uses owner scoping and preserves failure evidence in the same transaction", async () => {
    expect(await recoverReportingJob(actor, input)).toEqual({ id: "job" });
    expect(mocks.find).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "job", schedule: { userId: "gm" } } }));
    expect(mocks.schedule).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "schedule", userId: "gm", enabled: true, version: 3 } }));
    expect(mocks.audit).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ action: "SCHEDULE_RECOVERY_APPROVED", result: expect.objectContaining({ priorStatus: "DEAD_LETTER", priorAttempts: 5, priorError: "Prior failure", runKey: "original-run" }) }));
  });
  it("rejects concurrent schedule changes without resetting the job", async () => {
    mocks.schedule.mockResolvedValue({ count: 0 });
    await expect(recoverReportingJob(actor, input)).rejects.toThrow("changed");
    expect(mocks.job).not.toHaveBeenCalled(); expect(mocks.audit).not.toHaveBeenCalled();
  });
  it("propagates audit failure so the transaction cannot commit unaudited recovery", async () => {
    mocks.audit.mockRejectedValue(new Error("Audit unavailable"));
    await expect(recoverReportingJob(actor, input)).rejects.toThrow("Audit unavailable");
  });
  it("does not recover delivery when current source access is revoked", async () => {
    mocks.source.mockRejectedValue(new Error("Source access denied"));
    await expect(recoverReportingJob(actor, input)).rejects.toThrow("access denied");
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
