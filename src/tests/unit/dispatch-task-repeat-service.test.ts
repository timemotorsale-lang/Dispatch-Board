import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRepeatingDispatchTask, dispatchRepeatDates } from "@/server/services/dispatch-task-repeat-service";
import type { AuthenticatedUser } from "@/server/auth/store";

const mocks = vi.hoisted(() => {
  const batch = { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() };
  return {
    batch,
    transaction: vi.fn(async (run: (db: { dispatchTaskRepeatBatch: typeof batch }) => unknown) => run({ dispatchTaskRepeatBatch: batch })),
    createTask: vi.fn()
  };
});
vi.mock("@/server/db/client", () => ({ prisma: { $transaction: mocks.transaction, dispatchTaskRepeatBatch: mocks.batch } }));
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
});
