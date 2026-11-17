import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET, PATCH, POST } from "@/app/api/tasks/calendar/route";
import { parseTaskRepeat, taskOccurrences } from "@/lib/calendar-task-repeat";

const mocks = vi.hoisted(() => ({
  user: vi.fn(), canAssign: vi.fn(), staff: vi.fn(), create: vi.fn(), findSchedules: vi.fn(), stopSchedule: vi.fn(),
  findPersonal: vi.fn(), findDispatch: vi.fn(), upsert: vi.fn(), complete: vi.fn(), findSeries: vi.fn(), findLists: vi.fn(), findList: vi.fn(), completeOccurrence: vi.fn()
}));
vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: mocks.user }));
vi.mock("@/server/policies/access", () => ({ canManageAssignments: mocks.canAssign }));
vi.mock("@/server/services/user-summary", () => ({ listActiveUserSummaries: mocks.staff }));
vi.mock("@/server/services/task-create-service", () => ({ createManualTask: mocks.create }));
vi.mock("@/server/db/client", () => ({ prisma: {
  personalCalendarTask: { findMany: mocks.findPersonal, upsert: mocks.upsert, updateMany: mocks.complete, findFirst: mocks.findSeries },
  task: { findMany: mocks.findDispatch },
  dispatchTaskRepeatBatch: { findMany: mocks.findSchedules, updateMany: mocks.stopSchedule },
  personalTaskList: { findMany: mocks.findLists, findFirst: mocks.findList },
  personalTaskOccurrence: { upsert: mocks.completeOccurrence }
} }));

const endpoint = "http://localhost/api/tasks/calendar";
function request(method: string, body: object) {
  return new Request(endpoint, { method, body: JSON.stringify(body) });
}

describe("calendar quick tasks", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.user.mockResolvedValue({ id: "owner" });
    mocks.canAssign.mockReturnValue(false);
    mocks.findPersonal.mockResolvedValue([]);
    mocks.findDispatch.mockResolvedValue([]);
    mocks.findLists.mockResolvedValue([]);
    mocks.findSchedules.mockResolvedValue([]);
  });

  it("reads only the signed-in owner's private and assigned Dispatch tasks", async () => {
    const response = await GET(new Request(`${endpoint}?start=2026-11-08&end=2026-11-15&staff=1&userId=other`));
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(mocks.findPersonal).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ userId: "owner", archivedAt: null, OR: expect.any(Array) }) }));
    expect(mocks.findDispatch).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ assignedUserId: "owner" }) }));
    expect(mocks.staff).not.toHaveBeenCalled();
  });

  it("creates an undated personal task separately from Dispatch and scopes retries to the owner", async () => {
    mocks.upsert.mockResolvedValue({ id: "private-1", title: "Call back" });
    const requestId = "8fe99822-2c8c-4ab2-a861-607c2fcbe96a";
    const response = await POST(request("POST", { scope: "personal", title: "Call back", localDate: null, localTime: null, requestId, userId: "other" }));
    expect(response.status).toBe(201);
    expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId_requestId: { userId: "owner", requestId } },
      create: expect.objectContaining({ userId: "owner", localDate: null, localTime: null })
    }));
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("uses the existing Dispatch task service for an all-day task and enforces assignment permissions", async () => {
    const draft = { scope: "dispatch", title: "Order parts", localDate: "2026-11-09", localTime: null, workflowArea: "SHOP" };
    expect((await POST(request("POST", { ...draft, assignedUserId: "other" }))).status).toBe(403);
    expect(mocks.create).not.toHaveBeenCalled();
    mocks.create.mockResolvedValue({ id: "task-1" });
    expect((await POST(request("POST", draft))).status).toBe(201);
    expect(mocks.create).toHaveBeenCalledWith({ id: "owner" }, expect.objectContaining({
      assignedUserId: "owner", calendarAllDay: true, boardDate: "2026-11-09", dueAt: new Date("2026-11-10T05:59:00Z")
    }));
  });

  it("cannot complete another user's personal task", async () => {
    mocks.complete.mockResolvedValue({ count: 0 });
    expect((await PATCH(request("PATCH", { id: "other-task", completed: true }))).status).toBe(404);
    expect(mocks.complete).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: "other-task", userId: "owner" }) }));
  });

  it("only stops an ongoing Dispatch schedule owned by the signed-in user", async () => {
    mocks.stopSchedule.mockResolvedValueOnce({ count: 0 }).mockResolvedValueOnce({ count: 1 });
    expect((await PATCH(request("PATCH", { action: "stopDispatchRepeat", id: "first-task", userId: "other" }))).status).toBe(404);
    expect((await PATCH(request("PATCH", { action: "stopDispatchRepeat", id: "first-task" }))).status).toBe(200);
    expect(mocks.stopSchedule).toHaveBeenLastCalledWith({
      where: { userId: "owner", firstTaskId: "first-task", nextDate: { not: null } },
      data: { nextDate: null }
    });
  });

  it("marks only the selected occurrence and rejects dates outside the series", async () => {
    mocks.findSeries.mockResolvedValue({ localDate: "2026-11-08", repeat: { unit: "week", every: 1 } });
    expect((await PATCH(request("PATCH", { id: "series", occurrence: "2026-11-09", completed: true }))).status).toBe(404);
    expect(mocks.completeOccurrence).not.toHaveBeenCalled();
    expect((await PATCH(request("PATCH", { id: "series", occurrence: "2026-11-15", completed: true }))).status).toBe(200);
    expect(mocks.findSeries).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "series", userId: "owner", archivedAt: null } }));
    expect(mocks.completeOccurrence).toHaveBeenCalledWith(expect.objectContaining({ create: { taskId: "series", localDate: "2026-11-15" } }));
  });

  it("supports custom weekdays and skips months without the scheduled day", () => {
    const weekdays = parseTaskRepeat({ unit: "week", every: 2, weekdays: [1, 3], until: "2026-11-25" })!;
    expect(taskOccurrences("2026-11-09", weekdays, "2026-11-09", "2026-12-10")).toEqual([
      "2026-11-09", "2026-11-11", "2026-11-23", "2026-11-25"
    ]);
    expect(taskOccurrences("2026-01-31", { unit: "month", every: 1 }, "2026-02-01", "2026-04-01")).toEqual(["2026-03-31"]);
  });

  it("rejects another user's list and protects the default list", async () => {
    mocks.findList.mockResolvedValue(null);
    expect((await DELETE(request("DELETE", { action: "deleteList", listId: "other-list" }))).status).toBe(404);
    expect(mocks.findList).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "other-list", userId: "owner" } }));
    expect((await DELETE(request("DELETE", { action: "deleteList", listId: null }))).status).toBe(400);
  });
});
