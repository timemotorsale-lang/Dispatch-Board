import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ people: vi.fn(), presences: vi.fn(), tasks: vi.fn(), focuses: vi.fn(), handoffs: vi.fn(), settings: vi.fn() }));
vi.mock("@/server/db/client", () => ({ prisma: { user: { findMany: mocks.people }, dispatchPresence: { findMany: mocks.presences }, task: { findMany: mocks.tasks }, workdayDailyFocusItem: { findMany: mocks.focuses }, dispatchHandoff: { findMany: mocks.handoffs }, $transaction: (queries: Promise<unknown>[]) => Promise.all(queries) } }));
vi.mock("@/server/services/app-settings-service", () => ({ getGenerationSettings: mocks.settings }));
import { readDispatchTeam } from "@/server/dispatch/read";
import type { AuthenticatedUser } from "@/server/auth/store";
const actor: AuthenticatedUser = { id: "gm", name: "Manager", email: "manager@example.test", isActive: true, roles: ["General Manager"], duties: { direct: [], roleDefaults: [], all: [] } };
describe("Live Board reads the existing workbook directly", () => {
  beforeEach(() => {
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
  it("rejects inactive readers before fetching team records", async () => {
    await expect(readDispatchTeam({ ...actor, isActive: false }, "2026-10-29")).rejects.toThrow("Active staff");
    expect(mocks.people).not.toHaveBeenCalled();
  });
});
