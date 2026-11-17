import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET, PATCH, POST } from "@/app/api/appointments/personal-calendar/route";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  calendars: { findMany: vi.fn(), findUnique: vi.fn() },
  events: { findMany: vi.fn(), create: vi.fn(), updateMany: vi.fn(), deleteMany: vi.fn() }
}));
vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/server/db/client", () => ({ prisma: { personalCalendar: mocks.calendars, personalCalendarEvent: mocks.events } }));

const url = "http://localhost/api/appointments/personal-calendar";
const draft = { title: "Private visit", startsAt: "2026-11-09T15:00:00Z", endsAt: "2026-11-09T15:30:00Z" };

describe("personal calendar privacy", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "staff-a" });
  });

  it("reads only the signed-in owner's calendars and events", async () => {
    mocks.calendars.findMany.mockResolvedValue([]);
    mocks.events.findMany.mockResolvedValue([]);
    const response = await GET(new Request(`${url}?start=2026-11-09&end=2026-11-10&userId=staff-b`));
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(mocks.calendars.findMany.mock.calls[0][0].where).toEqual({ userId: "staff-a" });
    expect(mocks.events.findMany.mock.calls[0][0].where.userId).toBe("staff-a");
  });

  it("rejects a calendar belonging to another staff member", async () => {
    mocks.calendars.findUnique.mockResolvedValue(null);
    const response = await POST(new Request(url, { method: "POST", body: JSON.stringify({ ...draft, calendarId: "staff-b-calendar" }) }));
    expect(response.status).toBe(404);
    expect(mocks.calendars.findUnique.mock.calls[0][0].where).toEqual({ id_userId: { id: "staff-b-calendar", userId: "staff-a" } });
    expect(mocks.events.create).not.toHaveBeenCalled();
  });

  it("scopes edits and deletes by both event ID and authenticated owner", async () => {
    mocks.events.updateMany.mockResolvedValue({ count: 0 });
    mocks.events.deleteMany.mockResolvedValue({ count: 0 });
    const edit = await PATCH(new Request(url, { method: "PATCH", body: JSON.stringify({ ...draft, id: "other-event", calendarId: null }) }));
    const remove = await DELETE(new Request(`${url}?id=other-event`, { method: "DELETE" }));
    expect([edit.status, remove.status]).toEqual([404, 404]);
    expect(mocks.events.updateMany.mock.calls[0][0].where).toEqual({ id: "other-event", userId: "staff-a" });
    expect(mocks.events.deleteMany.mock.calls[0][0].where).toEqual({ id: "other-event", userId: "staff-a" });
  });

  it("requires a session before reading a personal calendar", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    expect((await GET(new Request(url))).status).toBe(401);
    expect(mocks.events.findMany).not.toHaveBeenCalled();
  });
});
