import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ people: vi.fn(), presences: vi.fn(), tasks: vi.fn(), focuses: vi.fn(), handoffs: vi.fn(), settings: vi.fn() }));
vi.mock("@/server/db/client", () => {
  const db = { user: { findMany: mocks.people }, dispatchPresence: { findMany: mocks.presences }, task: { findMany: mocks.tasks }, workdayDailyFocusItem: { findMany: mocks.focuses }, dispatchHandoff: { findMany: mocks.handoffs } };
  return { prisma: { ...db, $transaction: (operation: (tx: typeof db) => Promise<unknown>) => operation(db) } };
});
vi.mock("@/server/services/app-settings-service", () => ({ getGenerationSettings: mocks.settings }));
import { readDispatchTeam } from "@/server/dispatch/read";
import type { AuthenticatedUser } from "@/server/auth/store";
const actor: AuthenticatedUser = { id: "gm", name: "Manager", email: "manager@example.test", isActive: true, roles: ["General Manager"], duties: { direct: [], roleDefaults: [], all: [] } };
describe("Live Board reads the existing workbook directly", () => {
  afterEach(() => vi.useRealTimers());
  beforeEach(() => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-29T15:00:00Z"));
    vi.clearAllMocks(); mocks.settings.mockResolvedValue({ timezone: "America/Chicago" });
    mocks.people.mockResolvedValue([{ id: "staff", name: "Staff member" }]);
    mocks.presences.mockResolvedValue([]); mocks.tasks.mockResolvedValue([]); mocks.handoffs.mockResolvedValue([]);
    mocks.focuses.mockResolvedValue(["Calls", "Photographs", "Parts"].map((outcome, index) => ({ id: "focus-" + index, outcome, status: "PLANNED", convertedTaskId: null, workbook: { userId: "staff", boardDay: { date: new Date("2026-10-29T00:00:00Z") } } })));
  });
  it("includes workbook focuses without requiring a new board planning or submission record", async () => {
    const result = await readDispatchTeam(actor, "2026-10-29");
    expect(result.rows[0].focuses.map(item => item.title)).toEqual(["Calls", "Photographs", "Parts"]);
    expect(result.rows[0].state).toBe("UNKNOWN");
    expect(mocks.focuses).toHaveBeenCalledWith(expect.objectContaining({ where: { workbook: { boardDay: { date: new Date("2026-10-29T00:00:00Z") } } } }));
  });
  it("loads old unresolved work and suppresses a source superseded by a completed carry-forward record", async () => {
    const source = { id: "old", title: "Parts on order", status: "WAITING_ON_PARTS", assignedUserId: "staff", ownerUserId: "staff", updatedAt: new Date("2026-10-27T14:00Z"), blockerReason: "Back order", isClaimable: false, boardDay: { date: new Date("2026-10-27T00:00Z") } };
    mocks.tasks.mockResolvedValueOnce([source]).mockResolvedValueOnce([{ carryoverSourceTaskId: "old" }]);
    const result = await readDispatchTeam(actor, "2026-10-29");
    expect(result.rows[0].tasks).toEqual([]);
    expect(mocks.tasks.mock.calls[0][0].where).toEqual(expect.objectContaining({ boardDay: { date: { lte: new Date("2026-10-29T00:00Z") } } }));
    expect(mocks.tasks.mock.calls[1][0].where).toMatchObject({ carryoverSourceTaskId: { in: ["old"] } });
  });
  it("keeps a prior-day waiting job when no replacement exists", async () => {
    mocks.tasks.mockResolvedValueOnce([{ id: "old", title: "Parts on order", status: "WAITING_ON_PARTS", assignedUserId: "staff", updatedAt: new Date("2026-10-27T14:00Z"), blockerReason: "Back order", isClaimable: false, boardDay: { date: new Date("2026-10-27T00:00Z") } }]).mockResolvedValueOnce([]);
    const result = await readDispatchTeam(actor, "2026-10-29");
    expect(result.rows[0].state).toBe("BLOCKED"); expect(result.rows[0].taskId).toBe("old");
  });
  it("rejects inactive readers before fetching team records", async () => {
    await expect(readDispatchTeam({ ...actor, isActive: false }, "2026-10-29")).rejects.toThrow("Active staff");
    expect(mocks.people).not.toHaveBeenCalled();
  });
});
