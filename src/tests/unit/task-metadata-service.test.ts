import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TaskMetadataRepository } from "@/server/repositories/task-metadata-repository";
import { updateTaskMetadata } from "@/server/services/task-metadata-service";
import { createTestAuthStore } from "@/tests/support/auth-test-store";

const { recordBoardActivityEvent } = vi.hoisted(() => ({
  recordBoardActivityEvent: vi.fn()
}));

vi.mock("@/server/services/activity-feed", () => ({
  recordBoardActivityEvent
}));

function createTaskMetadataRepositoryHarness() {
  const task = {
    id: "task-1",
    boardDayId: "board-day-1",
    title: "Vehicle Recon & Inspection",
    assignedUserId: "user-casey.mechanic@local.test",
    requiresManagerApproval: true,
    description: "Initial detail",
    dueAt: new Date("2026-07-04T17:00:00.000Z"),
    vehicleReference: "2018 Ford Explorer",
    customerReference: null,
    updatedAt: new Date("2026-07-04T15:00:00.000Z")
  };

  return {
    task,
    repository: {
      supportsActivityEvents: true,
      async findTaskById() {
        return task;
      },
      async updateTaskMetadata(_taskId, data) {
        if (data.description !== undefined) {
          task.description = data.description;
        }
        if (data.dueAt !== undefined) {
          task.dueAt = data.dueAt;
        }
        if (data.vehicleReference !== undefined) {
          task.vehicleReference = data.vehicleReference;
        }
        if (data.customerReference !== undefined) {
          task.customerReference = data.customerReference;
        }
        task.updatedAt = new Date("2026-07-04T15:30:00.000Z");

        return task;
      }
    } satisfies TaskMetadataRepository
  };
}

describe("task metadata service", () => {
  beforeEach(() => {
    recordBoardActivityEvent.mockReset();
  });

  it("lets assigned staff update description and references", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const staffUser = usersByEmail.get("casey.mechanic@local.test") ?? null;
    const { repository } = createTaskMetadataRepositoryHarness();

    const task = await updateTaskMetadata(
      staffUser,
      "task-1",
      {
        description: "Brake rotor confirmation requested.",
        vehicleReference: "2018 Ford Explorer",
        customerReference: "Hold for manager approval"
      },
      repository
    );

    expect(task.description).toBe("Brake rotor confirmation requested.");
    expect(task.customerReference).toBe("Hold for manager approval");
    expect(recordBoardActivityEvent).toHaveBeenCalledWith({
      actorUserId: staffUser?.id ?? null,
      boardDayId: "board-day-1",
      eventType: "task.metadata_updated",
      message:
        "Walter Hernandez updated the description, updated the customer reference on Vehicle Recon & Inspection.",
      metadata: {
        changedFields: ["updated the description", "updated the customer reference"]
      },
      taskId: "task-1"
    });
  });

  it("blocks non-managers from changing the due date", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const staffUser = usersByEmail.get("casey.mechanic@local.test") ?? null;
    const { repository } = createTaskMetadataRepositoryHarness();

    await expect(
      updateTaskMetadata(
        staffUser,
        "task-1",
        {
          dueAt: "2026-07-05T18:00:00.000Z"
        },
        repository
      )
    ).rejects.toThrow("Only managers can change the due date.");
  });
});
