import { beforeEach, describe, expect, it, vi } from "vitest";

import { TASK_CHECKLIST_ITEM_KIND } from "@/lib/task-checklist-kind";
import type { TaskChecklistRepository } from "@/server/repositories/task-checklist-repository";
import {
  createTaskChecklistItem,
  deleteTaskSubtaskItem,
  seedTaskChecklistItems,
  updateTaskChecklistItem
} from "@/server/services/task-checklist";
import { createTestAuthStore } from "@/tests/support/auth-test-store";

const { recordBoardActivityEvent } = vi.hoisted(() => ({
  recordBoardActivityEvent: vi.fn()
}));

vi.mock("@/server/services/activity-feed", () => ({
  recordBoardActivityEvent
}));

function createTaskChecklistRepositoryHarness() {
  const items = [
    {
      id: "item-dod-1",
      taskId: "task-1",
      kind: TASK_CHECKLIST_ITEM_KIND.DEFINITION_OF_DONE,
      label: "Keep the task status current",
      completed: false,
      sortOrder: 0,
      completedAt: null,
      createdAt: new Date("2026-07-04T10:00:00.000Z"),
      updatedAt: new Date("2026-07-04T10:00:00.000Z")
    }
  ];

  return {
    items,
    repository: {
      supportsActivityEvents: true,
      async findTaskById() {
        return {
          id: "task-1",
          boardDayId: "board-day-1",
          title: "Vehicle Recon & Inspection",
          assignedUserId: "user-casey.mechanic@local.test",
          requiresManagerApproval: true
        };
      },
      async listItemsForTask(_taskId: string, kind) {
        return kind ? items.filter((item) => item.kind === kind) : items;
      },
      async findItemById(_taskId: string, itemId: string) {
        return items.find((item) => item.id === itemId) ?? null;
      },
      async createItem(taskId, input) {
        const item = {
          id: `item-${items.length + 1}`,
          taskId,
          kind: input.kind,
          label: input.label,
          completed: input.completed ?? false,
          sortOrder: items.filter((existingItem) => existingItem.kind === input.kind).length,
          completedAt: input.completed ? new Date("2026-07-04T11:00:00.000Z") : null,
          createdAt: new Date("2026-07-04T11:00:00.000Z"),
          updatedAt: new Date("2026-07-04T11:00:00.000Z")
        };

        items.push(item);
        return item;
      },
      async deleteItem(_taskId: string, itemId: string) {
        const itemIndex = items.findIndex((item) => item.id === itemId);

        if (itemIndex < 0) {
          throw new Error("Missing item");
        }

        const [item] = items.splice(itemIndex, 1);
        return item;
      },
      async updateItem(_taskId: string, itemId: string, input) {
        const item = items.find((existingItem) => existingItem.id === itemId);

        if (!item) {
          throw new Error("Missing item");
        }

        item.completed = input.completed;
        item.completedAt = input.completed ? new Date("2026-07-04T11:30:00.000Z") : null;
        item.updatedAt = new Date("2026-07-04T11:30:00.000Z");

        return item;
      }
    } satisfies TaskChecklistRepository
  };
}

describe("task checklist service", () => {
  beforeEach(() => {
    recordBoardActivityEvent.mockReset();
  });

  it("lets the assigned staff member add a persisted subtask", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const staffUser = usersByEmail.get("casey.mechanic@local.test") ?? null;
    const { repository, items } = createTaskChecklistRepositoryHarness();

    const item = await createTaskChecklistItem(
      staffUser,
      "task-1",
      {
        kind: TASK_CHECKLIST_ITEM_KIND.SUBTASK,
        label: "Confirm rotor thickness"
      },
      repository
    );

    expect(item.kind).toBe(TASK_CHECKLIST_ITEM_KIND.SUBTASK);
    expect(item.label).toBe("Confirm rotor thickness");
    expect(items).toHaveLength(2);
    expect(recordBoardActivityEvent).toHaveBeenCalledWith({
      actorUserId: staffUser?.id ?? null,
      boardDayId: "board-day-1",
      eventType: "task.subtask_added",
      message: "Walter Hernandez added a subtask to Vehicle Recon & Inspection: Confirm rotor thickness.",
      metadata: {
        itemId: "item-2",
        kind: TASK_CHECKLIST_ITEM_KIND.SUBTASK,
        label: "Confirm rotor thickness"
      },
      taskId: "task-1"
    });
  });

  it("lets staff add a contextual subtask longer than a checklist label", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const staffUser = usersByEmail.get("casey.mechanic@local.test") ?? null;
    const { repository, items } = createTaskChecklistRepositoryHarness();
    const label =
      "Review Billboard Signage - AJ wants the full signage details including size, design, and the exact message we want displayed before the next vendor conversation.";

    const item = await createTaskChecklistItem(
      staffUser,
      "task-1",
      {
        kind: TASK_CHECKLIST_ITEM_KIND.SUBTASK,
        label
      },
      repository
    );

    expect(item.kind).toBe(TASK_CHECKLIST_ITEM_KIND.SUBTASK);
    expect(item.label).toBe(label);
    expect(items).toHaveLength(2);
  });

  it("updates completion state and records checklist activity", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const managerUser = usersByEmail.get("morgan.manager@local.test") ?? null;
    const { repository } = createTaskChecklistRepositoryHarness();

    const updatedItem = await updateTaskChecklistItem(
      managerUser,
      "task-1",
      "item-dod-1",
      {
        completed: true
      },
      repository
    );

    expect(updatedItem.completed).toBe(true);
    expect(recordBoardActivityEvent).toHaveBeenCalledWith({
      actorUserId: managerUser?.id ?? null,
      boardDayId: "board-day-1",
      eventType: "task.checklist_completed",
      message:
        "Eli Manager completed a definition of done item on Vehicle Recon & Inspection: Keep the task status current.",
      metadata: {
        itemId: "item-dod-1",
        kind: TASK_CHECKLIST_ITEM_KIND.DEFINITION_OF_DONE,
        label: "Keep the task status current",
        completed: true
      },
      taskId: "task-1"
    });
  });

  it("deletes only persisted subtasks and records the removal", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const managerUser = usersByEmail.get("morgan.manager@local.test") ?? null;
    const { repository, items } = createTaskChecklistRepositoryHarness();
    const subtask = await repository.createItem("task-1", {
      kind: TASK_CHECKLIST_ITEM_KIND.SUBTASK,
      label: "Confirm repair authorization"
    });

    const deletedItem = await deleteTaskSubtaskItem(
      managerUser,
      "task-1",
      subtask.id,
      repository
    );

    expect(deletedItem.id).toBe(subtask.id);
    expect(items).toHaveLength(1);
    expect(recordBoardActivityEvent).toHaveBeenCalledWith({
      actorUserId: managerUser?.id ?? null,
      boardDayId: "board-day-1",
      eventType: "task.subtask_deleted",
      message: "Eli Manager deleted a subtask from Vehicle Recon & Inspection: Confirm repair authorization.",
      metadata: {
        itemId: subtask.id,
        kind: TASK_CHECKLIST_ITEM_KIND.SUBTASK,
        label: "Confirm repair authorization"
      },
      taskId: "task-1"
    });
  });

  it("does not delete definition-of-done checklist requirements", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const managerUser = usersByEmail.get("morgan.manager@local.test") ?? null;
    const { repository, items } = createTaskChecklistRepositoryHarness();

    await expect(
      deleteTaskSubtaskItem(managerUser, "task-1", "item-dod-1", repository)
    ).rejects.toThrow("Only subtasks can be deleted from the workbench.");
    expect(items).toHaveLength(1);
  });

  it("seeds defaults only when a task does not already have checklist items", async () => {
    const { repository, items } = createTaskChecklistRepositoryHarness();

    const seededItems = await seedTaskChecklistItems(
      "task-1",
      [
        {
          kind: TASK_CHECKLIST_ITEM_KIND.DEFINITION_OF_DONE,
          label: "Keep the task status current"
        },
        {
          kind: TASK_CHECKLIST_ITEM_KIND.SUBTASK,
          label: "Post progress update"
        }
      ],
      repository
    );

    expect(seededItems).toHaveLength(1);
    expect(items).toHaveLength(1);
  });
});
