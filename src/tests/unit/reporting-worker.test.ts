import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runReportingWorker } from "@/server/reporting/worker-service";
const mocks = vi.hoisted(() => ({ actor: vi.fn(), schedules: vi.fn(), jobs: vi.fn(), process: vi.fn() }));
vi.mock("@/server/db/client", () => ({ prisma: { reportingSchedule: { count: mocks.schedules }, reportingJob: { count: mocks.jobs } } }));
vi.mock("@/server/auth/store", () => ({ createPrismaAuthStore: () => ({ findUserByEmail: mocks.actor }) }));
vi.mock("@/server/reporting/schedule-service", () => ({ processReportingSchedules: mocks.process }));
describe("bounded reporting worker entry", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.stubEnv("REPORTING_WORKER_ENABLED", "true"); mocks.actor.mockResolvedValue({ id: "gm", isActive: true, roles: ["General Manager"] }); mocks.schedules.mockResolvedValue(30); mocks.jobs.mockResolvedValue(2); mocks.process.mockResolvedValue({ succeeded: 1, failed: 0 }); });
  afterEach(() => vi.unstubAllEnvs());
  it("does nothing when rollout is disabled", async () => {
    vi.stubEnv("REPORTING_WORKER_ENABLED", "false");
    expect(await runReportingWorker({ execute: true })).toMatchObject({ status: "DISABLED" });
    expect(mocks.actor).not.toHaveBeenCalled(); expect(mocks.process).not.toHaveBeenCalled();
  });
  it("inspects aggregate health without invoking delivery", async () => {
    expect(await runReportingWorker({ execute: false, actorEmail: "gm@example.test" })).toMatchObject({ status: "DRY_RUN", dueSchedules: 30, batchLimit: 25 });
    expect(mocks.process).not.toHaveBeenCalled();
  });
  it("passes an explicit execution and injected clock to the existing authorized processor", async () => {
    const now = new Date("2026-10-04T12:00:00Z");
    expect(await runReportingWorker({ execute: true, actorEmail: "gm@example.test" }, now)).toMatchObject({ status: "EXECUTED", succeeded: 1 });
    expect(mocks.process).toHaveBeenCalledWith(expect.objectContaining({ id: "gm" }), now);
  });
  it("rejects revoked accounts before reading job health", async () => {
    mocks.actor.mockResolvedValue({ isActive: false, roles: ["General Manager"] });
    await expect(runReportingWorker({ execute: false, actorEmail: "gm@example.test" })).rejects.toThrow("access");
    expect(mocks.schedules).not.toHaveBeenCalled();
  });
  it("requires an explicitly configured account", async () => {
    await expect(runReportingWorker({ execute: true })).rejects.toThrow("required");
    expect(mocks.actor).not.toHaveBeenCalled();
  });
});
