import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRepeatingDispatchTask, dispatchRepeatDates, extendOngoingDispatchTasks } from "@/server/services/dispatch-task-repeat-service";
import type { AuthenticatedUser } from "@/server/auth/store";

const mocks = vi.hoisted(() => {
  const batch = { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), findMany: vi.fn(), updateMany: vi.fn() };
  return {
    batch,
    transaction: vi.fn(async (run: (db: { dispatchTaskRepeatBatch: typeof batch }) => unknown) => run({ dispatchTaskRepeatBatch: batch })),
    createTask: vi.fn(),
    findUserByEmail: vi.fn()
  };
});
vi.mock("@/server/db/client", () => ({ prisma: { $transaction: mocks.transaction, dispatchTaskRepeatBatch: mocks.batch } }));
vi.mock("@/server/auth/store", () => ({ createPrismaAuthStore: () => ({ findUserByEmail: mocks.findUserByEmail }) }));
vi.mock("@/server/repositories/task-create-repository", () => ({ createTaskCreateRepository: () => "transaction repository" }));
vi.mock("@/server/services/task-create-service", () => ({ createManualTask: mocks.createTask }));

const user = { id: "staff-1" } as AuthenticatedUser;
const requestId = "12345678-abcd-1234-abcd-123456789abc";
const draft = { boardDate: "2026-10-30", title: "Call customer", assignedUserId: user.id, workflowArea: "SALES" };
const repeat = { unit: "week", every: 1, until: "2026-11-13" };

describe("repeating Dispatch tasks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.batch.findUnique.mockResolvedValue(null);
  });

  it("creates independent tasks inside one transaction and holds Central time across daylight saving changes", async () => {
    mocks.createTask.mockResolvedValueOnce({ id: "first", title: draft.title }).mockResolvedValue({ id: "later", title: draft.title });
    await expect(createRepeatingDispatchTask(user, draft, repeat, requestId, "09:00")).resolves.toEqual({ task: { id: "first", title: draft.title }, taskCount: 3 });
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.createTask.mock.calls.map(([, input]) => [input.boardDate, input.dueAt.toISOString()])).toEqual([
      ["2026-10-30", "2026-10-30T14:00:00.000Z"],
      ["2026-11-06", "2026-11-06T15:00:00.000Z"],
      ["2026-11-13", "2026-11-13T15:00:00.000Z"]
    ]);
    const fingerprint = mocks.batch.create.mock.calls[0][0].data.fingerprint;
    mocks.batch.findUnique.mockResolvedValue({ fingerprint, firstTaskId: "first", taskCount: 3 });
    await expect(createRepeatingDispatchTask(user, draft, repeat, requestId, "09:00")).resolves.toMatchObject({ taskCount: 3 });
    expect(mocks.createTask).toHaveBeenCalledTimes(3);
    await expect(createRepeatingDispatchTask(user, { ...draft, title: "Changed" }, repeat, requestId, "09:00")).rejects.toThrow("fresh repeat request");
  });

  it("requires an end date and rejects batches with more than 60 tasks", () => {
    expect(() => dispatchRepeatDates(draft.boardDate, { unit: "day", every: 1 })).toThrow("end date");
    expect(() => dispatchRepeatDates(draft.boardDate, { unit: "day", every: 1, until: "2027-02-01" })).toThrow("2 and 60");
  });

  it("saves an open-ended series and advances it without duplicating a concurrently claimed occurrence", async () => {
    const rule = { unit: "week", every: 1 };
    mocks.createTask.mockResolvedValue({ id: "first", title: draft.title });
    await expect(createRepeatingDispatchTask(user, draft, rule, requestId, "09:00", true)).resolves.toMatchObject({ ongoing: true, taskCount: 5 });
    const { ongoing, nextDate } = mocks.batch.create.mock.calls[0][0].data;
    expect(nextDate).toBe("2026-11-29");
    expect(ongoing).toMatchObject({ rule, minuteOfDay: 540 });
    mocks.batch.findMany.mockResolvedValue([{ userId: user.id, requestId, ongoing, nextDate, user: { email: "staff@example.test" } }]);
    mocks.findUserByEmail.mockResolvedValue({ ...user, isActive: true });
    const now = new Date("2026-11-07T18:00:00Z");
    mocks.batch.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 1 });
    await expect(extendOngoingDispatchTasks(now)).resolves.toEqual({ schedules: 1, created: 1, failed: 0 });
    expect(mocks.createTask.mock.calls.at(-1)?.[1].boardDate).toBe("2026-12-04");
    expect(mocks.batch.updateMany).toHaveBeenLastCalledWith({
      where: { userId: user.id, requestId, nextDate },
      data: { nextDate: "2026-12-07", taskCount: { increment: 1 } }
    });
    mocks.batch.updateMany.mockResolvedValue({ count: 0 });
    await expect(extendOngoingDispatchTasks(now)).resolves.toMatchObject({ created: 0 });
    expect(mocks.createTask).toHaveBeenCalledTimes(6);
  });
});
