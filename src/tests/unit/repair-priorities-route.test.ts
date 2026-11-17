import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  membership: vi.fn(),
  checklist: vi.fn(),
  appointment: vi.fn(),
  create: vi.fn(),
  find: vi.fn(),
  update: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: mocks.user }));
vi.mock("@/server/db/client", () => ({
  prisma: {
    userLocationAccess: { findFirst: mocks.membership },
    appointment: { findFirst: mocks.appointment },
    workdayChecklistItem: { findFirst: mocks.checklist },
    repairPriority: { createMany: mocks.create, findFirst: mocks.find, updateMany: mocks.update }
  }
}));
vi.mock("@/server/services/task-read", () => ({ getTaskReadModelById: vi.fn() }));

import { POST } from "@/app/api/dispatch/repair-priorities/route";

const first = "2026-11-09T12:50:00.000Z|Honda Pilot · Airbag warning";
const second = "2026-11-09T12:51:00.000Z|Toyota Corolla · Bodywork";

function command(body: object) {
  return POST(new Request("http://localhost/api/dispatch/repair-priorities", {
    method: "POST", body: JSON.stringify(body)
  }));
}

describe("shared repair priorities", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.user.mockResolvedValue({ id: "advisor", isActive: true, roles: [], duties: { all: [] } });
    mocks.membership.mockResolvedValue({ userId: "advisor" });
    mocks.checklist.mockResolvedValue({
      id: "checklist", status: "RED", text: "Repairs", update: `${first}\n${second}`,
      workbook: { boardDay: { date: new Date("2026-11-09") } }
    });
  });

  it("publishes only selected saved updates as separate retry-safe rows", async () => {
    mocks.create.mockResolvedValue({ count: 2 });
    const result = await command({ action: "publish", itemId: "checklist", sources: [first, second] });
    expect(result.status).toBe(200);
    expect(mocks.checklist).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "checklist", workbook: { scope: "COO", userId: "advisor", status: "ACTIVE" } }
    }));
    expect(mocks.create).toHaveBeenCalledWith({
      skipDuplicates: true,
      data: [
        expect.objectContaining({ summary: "Honda Pilot · Airbag warning", priority: 1, planDate: "2026-11-09" }),
        expect.objectContaining({ summary: "Toyota Corolla · Bodywork", priority: 1, planDate: "2026-11-09" })
      ]
    });
    const [firstRow, secondRow] = mocks.create.mock.calls[0][0].data;
    expect(firstRow.sourceKey).not.toBe(secondRow.sourceKey);
    mocks.create.mockResolvedValue({ count: 0 });
    await command({ action: "publish", itemId: "checklist", sources: [first] });
    expect(mocks.create.mock.calls[1][0].data).toEqual([firstRow]);
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

  it("lets a service advisor carry the same repair forward and link a local appointment", async () => {
    mocks.user.mockResolvedValue({ id: "advisor", isActive: true, roles: ["Service Advisor"], duties: { all: [] } });
    mocks.find.mockResolvedValue({ id: "repair", version: 2, ownerUserId: "advisor", planDate: "2026-11-09" });
    mocks.appointment.mockResolvedValue({ id: "appointment" });
    mocks.update.mockResolvedValue({ count: 1 });
    const request = {
      action: "save", id: "repair", version: 2, status: "READY", blocker: "", nextAction: "",
      planDate: "2026-11-10", summary: "Airbag warning", vehicle: "Honda Pilot", priority: 1,
      durationMinutes: 60, ownerUserId: "advisor", taskId: "", appointmentNumber: "APT-1"
    };
    expect((await command(request)).status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: "repair", version: 2 }),
      data: expect.objectContaining({ planDate: "2026-11-10", appointmentId: "appointment", version: { increment: 1 } })
    }));
    mocks.update.mockResolvedValue({ count: 0 });
    expect((await command(request)).status).toBe(409);
  });
});
