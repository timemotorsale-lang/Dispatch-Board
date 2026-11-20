import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  membership: vi.fn(),
  staff: vi.fn(),
  checklist: vi.fn(),
  sources: vi.fn(),
  editSource: vi.fn(),
  appointment: vi.fn(),
  create: vi.fn(),
  find: vi.fn(),
  list: vi.fn(),
  update: vi.fn(),
  boardDay: vi.fn(),
  audit: vi.fn(),
  transaction: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: mocks.user }));
vi.mock("@/server/db/client", () => {
  const prisma = {
    userLocationAccess: { findFirst: mocks.membership, findMany: mocks.staff },
    appointment: { findFirst: mocks.appointment },
    workdayChecklistItem: { findFirst: mocks.checklist, findMany: mocks.sources, update: mocks.editSource },
    repairPriority: { createManyAndReturn: mocks.create, findFirst: mocks.find, findMany: mocks.list, updateMany: mocks.update },
    boardDay: { upsert: mocks.boardDay },
    activityEvent: { create: mocks.audit },
    $transaction: mocks.transaction
  };
  return { prisma };
});
vi.mock("@/server/services/task-read", () => ({ getTaskReadModelById: vi.fn() }));

import { GET, POST } from "@/app/api/dispatch/repair-priorities/route";
import { prisma } from "@/server/db/client";

const first = "2026-11-09T12:50:00.000Z|Honda Pilot · Airbag warning";
const second = "2026-11-09T12:51:00.000Z|Toyota Corolla · Bodywork";

const today = "2026-11-09";

function command(body: object) {
  return POST(new Request("http://localhost/api/dispatch/repair-priorities", {
    method: "POST", body: JSON.stringify({ date: today, ...body })
  }));
}

describe("Daily Priorities", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-09T15:00:00Z"));
    mocks.user.mockResolvedValue({ id: "advisor", isActive: true, roles: [], duties: { all: [] } });
    mocks.membership.mockResolvedValue({ userId: "advisor" });
    mocks.staff.mockResolvedValue([]);
    mocks.sources.mockResolvedValue([]);
    mocks.boardDay.mockResolvedValue({ id: "today" });
    mocks.transaction.mockImplementation((callback) => callback(prisma));
    mocks.checklist.mockResolvedValue({
      id: "checklist", status: "RED", text: "Repairs", update: `${first}\n${second}`,
      workbook: { boardDay: { date: new Date("2026-11-09") } }
    });
  });
  afterEach(() => vi.useRealTimers());

  it("publishes only selected saved updates as separate retry-safe rows", async () => {
    mocks.create.mockResolvedValue([{ id: "priority-one" }, { id: "priority-two" }]);
    const result = await command({ action: "publish", itemId: "checklist", sources: [first, second] });
    expect(result.status).toBe(200);
    expect(mocks.checklist).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "checklist", workbook: { scope: { in: ["COO", "STAFF"] }, userId: "advisor", status: "ACTIVE" } }
    }));
    expect(mocks.create).toHaveBeenCalledWith({
      skipDuplicates: true,
      select: { id: true },
      data: [
        expect.objectContaining({ summary: "Honda Pilot · Airbag warning", priority: 1, planDate: "2026-11-09" }),
        expect.objectContaining({ summary: "Toyota Corolla · Bodywork", priority: 1, planDate: "2026-11-09" })
      ]
    });
    const [firstRow, secondRow] = mocks.create.mock.calls[0][0].data;
    expect(firstRow.sourceKey).not.toBe(secondRow.sourceKey);
    mocks.create.mockResolvedValue([]);
    await command({ action: "publish", itemId: "checklist", sources: [first] });
    expect(mocks.create.mock.calls[1][0].data).toEqual([firstRow]);
    expect(mocks.audit).toHaveBeenCalledTimes(1);
    expect(mocks.audit).toHaveBeenCalledWith({ data: expect.objectContaining({
      actorUserId: "advisor", eventType: "daily_priority.published",
      metadata: expect.objectContaining({ priorityIds: ["priority-one", "priority-two"] })
    }) });
  });

  it("uses the location date at midnight and never queries unfinished earlier dates", async () => {
    mocks.list.mockResolvedValue([]);
    const request = new Request("http://localhost/api/dispatch/repair-priorities");
    vi.setSystemTime(new Date("2026-11-10T05:59:59Z"));
    expect(await (await GET(request)).json()).toMatchObject({ date: today, rows: [] });
    vi.setSystemTime(new Date("2026-11-10T06:00:00Z"));
    expect(await (await GET(request)).json()).toMatchObject({ date: "2026-11-10", rows: [] });
    expect(mocks.list.mock.calls.map(([query]) => query.where)).toEqual([
      { locationId: expect.any(String), planDate: today },
      { locationId: expect.any(String), planDate: "2026-11-10" }
    ]);
    expect(await (await GET(new Request(`${request.url}?date=${today}`))).json()).toMatchObject({
      date: today, today: "2026-11-10"
    });
  });

  it("shows an originating checklist link only to its owner", async () => {
    mocks.list.mockResolvedValue([{ id: "mine", checklistItemId: "owned" }, { id: "theirs", checklistItemId: "other" }]);
    mocks.sources.mockResolvedValue([{ id: "owned", workbook: { scope: "STAFF", boardDay: { date: new Date(today) } } }]);
    const result = await GET(new Request("http://localhost/api/dispatch/repair-priorities"));
    expect(await result.json()).toMatchObject({ rows: [
      { id: "mine", sourceHref: `/vehicles/coo-workbook/checklist?date=${today}&workbookScope=MY#source-owned` },
      { id: "theirs", sourceHref: null }
    ] });
    expect(mocks.sources).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ workbook: expect.objectContaining({ userId: "advisor" }) })
    }));
  });

  it("rejects publishing yesterday's checklist after local midnight", async () => {
    vi.setSystemTime(new Date("2026-11-10T06:00:00Z"));
    expect((await command({ action: "publish", itemId: "checklist", sources: [first] })).status).toBe(409);
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.audit).not.toHaveBeenCalled();
  });

  it("refuses to publish a checklist title the user never selected", async () => {
    mocks.checklist.mockResolvedValue({ id: "checklist", text: "Private new title", update: "", workbook: { boardDay: { date: new Date(today) } } });
    expect((await command({ action: "publish", itemId: "checklist", sources: [""], expectedTitle: "Original title" })).status).toBe(409);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("resolves an appointment handoff to the priority’s current plan date", async () => {
    mocks.user.mockResolvedValue({ id: "advisor", isActive: true, roles: ["Service Advisor"], duties: { all: [] } });
    mocks.find.mockResolvedValue({ planDate: "2026-11-10" });
    mocks.list.mockResolvedValue([]);
    const response = await GET(new Request(`http://localhost/api/dispatch/repair-priorities?date=${today}&linkRow=priority`));
    expect(await response.json()).toMatchObject({ date: "2026-11-10" });
    expect(mocks.find).toHaveBeenCalledWith({
      where: { id: "priority", locationId: expect.any(String) }, select: { planDate: true }
    });
    expect(mocks.transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "RepeatableRead" });
  });

  it("refines the saved source and updates the existing publication key without another ticket", async () => {
    const revised = "Honda Pilot · Verify airbag warning";
    const response = await command({ action: "refine_source", itemId: "checklist", source: first, text: revised });
    const { update } = await response.json();
    expect(response.status).toBe(200);
    expect(update).toBe(`2026-11-09T12:50:00.000Z|${revised}\n${second}`);
    expect(mocks.editSource).toHaveBeenCalledWith({ where: { id: "checklist" }, data: { update } });
    expect(mocks.update).toHaveBeenCalledWith({
      where: expect.objectContaining({ checklistItemId: "checklist", sourceKey: expect.any(String) }),
      data: { sourceKey: expect.any(String) }
    });
    expect(mocks.create).not.toHaveBeenCalled();
    mocks.checklist.mockResolvedValue({ id: "checklist", update, workbook: { boardDay: { date: new Date(today) } } });
    expect((await command({ action: "refine_source", itemId: "checklist", source: first, text: "Stale edit" })).status).toBe(409);
    mocks.create.mockResolvedValue([]);
    expect((await command({ action: "publish", itemId: "checklist", sources: [update.split("\n")[0]] })).status).toBe(200);
    expect(mocks.create.mock.calls[0][0].data[0].sourceKey).toBe(mocks.update.mock.calls[0][0].data.sourceKey);
  });

  it("allows only one claim when two staff members submit the same version", async () => {
    mocks.user.mockResolvedValueOnce({ id: "another-staff", isActive: true, roles: [], duties: { all: [] } });
    mocks.find.mockResolvedValue({ id: "priority", version: 1, ownerUserId: null, status: "READY", planDate: today });
    mocks.update.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
    const claim = { action: "claim", id: "priority", version: 1 };
    const results = await Promise.all([command(claim), command(claim)]);
    expect(results.map((result) => result.status).sort()).toEqual([200, 409]);
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: "priority", version: 1, ownerUserId: null, planDate: today, status: "READY" }),
      data: { ownerUserId: expect.any(String), version: { increment: 1 } }
    }));
    expect(mocks.audit).toHaveBeenCalledTimes(1);
  });

  it("lets the checklist publisher carry the same ticket forward and denies unrelated staff", async () => {
    mocks.find.mockResolvedValue({ id: "priority", version: 1, ownerUserId: null, checklistItemId: "checklist", status: "READY", planDate: "2026-11-08" });
    mocks.checklist.mockResolvedValueOnce(null).mockResolvedValue({ id: "checklist" });
    mocks.update.mockResolvedValue({ count: 1 });
    expect((await command({ action: "claim", id: "priority", version: 1 })).status).toBe(409);
    const carry = { action: "carry", id: "priority", version: 1, planDate: today };
    expect((await command(carry)).status).toBe(403);
    expect((await command({ ...carry, planDate: "2026-11-08" })).status).toBe(400);
    expect((await command(carry)).status).toBe(200);
    expect(mocks.update).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      where: expect.objectContaining({ id: "priority", version: 1 }),
      data: { planDate: today, version: { increment: 1 } }
    }));
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.audit).toHaveBeenCalledExactlyOnceWith({ data: expect.objectContaining({ eventType: "daily_priority.carried" }) });
  });

  it("rejects unsaved text and users without location access", async () => {
    expect((await command({ action: "publish", itemId: "checklist", sources: ["unsaved"] })).status).toBe(400);
    mocks.membership.mockResolvedValue(null);
    expect((await command({ action: "publish", itemId: "checklist", sources: [first] })).status).toBe(403);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("lets the owner update blockers without changing planner-owned fields", async () => {
    mocks.find.mockResolvedValue({ id: "repair", version: 2, ownerUserId: "advisor", planDate: "2026-11-09", priority: 1 });
    mocks.update.mockResolvedValue({ count: 1 });
    const result = await command({
      action: "save", id: "repair", version: 2, status: "BLOCKED", blocker: "Waiting on vendor",
      nextAction: "Confirm drop-off", ownerUserId: "someone-else", planDate: "2026-11-10", priority: 3
    });
    expect(result.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: "repair", version: 2 }),
      data: expect.objectContaining({
        ownerUserId: "advisor", planDate: "2026-11-09", priority: 1, status: "BLOCKED", blocker: "Waiting on vendor"
      })
    }));
  });

  it("lets a service advisor link a local appointment and requires explicit carryover", async () => {
    mocks.user.mockResolvedValue({ id: "advisor", isActive: true, roles: ["Service Advisor"], duties: { all: [] } });
    mocks.find.mockResolvedValue({ id: "repair", version: 2, ownerUserId: "advisor", planDate: "2026-11-09" });
    mocks.appointment.mockResolvedValue({ id: "appointment" });
    mocks.update.mockResolvedValue({ count: 1 });
    const request = {
      action: "save", id: "repair", version: 2, status: "READY", blocker: "", nextAction: "",
      summary: "Airbag warning", vehicle: "Honda Pilot", priority: 1,
      durationMinutes: 60, ownerUserId: "advisor", taskId: "", appointmentNumber: "APT-1"
    };
    expect((await command({ ...request, planDate: "2026-11-10" })).status).toBe(409);
    expect((await command(request)).status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: "repair", version: 2 }),
      data: expect.objectContaining({ planDate: today, appointmentId: "appointment", version: { increment: 1 } })
    }));
    mocks.update.mockResolvedValue({ count: 0 });
    expect((await command(request)).status).toBe(409);
  });
});
