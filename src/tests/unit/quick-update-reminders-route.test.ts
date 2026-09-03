import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ user: vi.fn(), findMany: vi.fn(), checklist: vi.fn() }));
vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: mocks.user }));
vi.mock("@/server/db/client", () => ({ prisma: { workdayQuickUpdate: { findMany: mocks.findMany }, workdayChecklistItem: { findMany: mocks.checklist } } }));
import { GET } from "@/app/api/appointments/reminders/route";

describe("Quick Update schedule reminders", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.user.mockResolvedValue({ id: "staff-1" }); mocks.findMany.mockResolvedValue([]); mocks.checklist.mockResolvedValue([]); });
  it("includes incomplete checklist reminders for their owner on the chosen date", async () => {
    mocks.checklist.mockResolvedValue([{ id: "item-1", text: "Solicit junk vehicle bids", convertedTaskId: null }]);
    const response = await GET(new Request("http://localhost/api/appointments/reminders?date=2026-09-04"));
    expect(mocks.checklist).toHaveBeenCalledWith(expect.objectContaining({ where: { reminderDate: "2026-09-04", done: false, workbook: { userId: "staff-1" } } }));
    expect((await response.json()).reminders[0]).toMatchObject({ id: "checklist:item-1", category: "CHECKLIST" });
  });
  it("reads existing reminders by follow-up day across workbook dates, scoped to their owner", async () => {
    mocks.findMany.mockResolvedValue([{ id: "note-1", text: "Call vendor", person: "AJ", company: "Roofing", convertedTaskId: null }]);
    const response = await GET(new Request("http://localhost/api/appointments/reminders?date=2026-09-08"));
    expect(response.status).toBe(200);
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { followUpNeeded: true, dueWindow: "2026-09-08", workbook: { userId: "staff-1" } } }));
    expect((await response.json()).reminders).toHaveLength(1);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
  });
  it.each(["", "tomorrow", "2026-02-30", "2026-13-01"])("rejects invalid date %s", async date => {
    expect((await GET(new Request(`http://localhost/api/appointments/reminders?date=${date}`))).status).toBe(400);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });
  it("requires sign-in", async () => {
    mocks.user.mockResolvedValue(null);
    expect((await GET(new Request("http://localhost/api/appointments/reminders?date=2026-09-08"))).status).toBe(401);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });
  it("reports read failures instead of a misleading empty schedule", async () => {
    mocks.findMany.mockRejectedValue(new Error("Database unavailable"));
    expect((await GET(new Request("http://localhost/api/appointments/reminders?date=2026-09-08"))).status).toBe(500);
  });
});
