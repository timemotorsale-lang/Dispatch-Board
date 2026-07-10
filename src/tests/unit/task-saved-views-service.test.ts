import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import type {
  CreateTaskSavedViewRecordInput,
  TaskSavedViewRecord,
  TaskSavedViewRepository
} from "@/server/repositories/task-saved-view-repository";
import {
  createTaskSavedView,
  deleteTaskSavedView,
  listTaskSavedViews
} from "@/server/services/task-saved-views";

const managerUser: AuthenticatedUser = {
  id: "user-manager",
  name: "Eli Manager",
  email: "eli@local.test",
  isActive: true,
  roles: ["General Manager"],
  duties: {
    direct: [],
    roleDefaults: [],
    all: []
  }
};

const staffUser: AuthenticatedUser = {
  id: "user-staff",
  name: "Staff User",
  email: "staff@local.test",
  isActive: true,
  roles: ["Staff"],
  duties: {
    direct: [],
    roleDefaults: [],
    all: []
  }
};

function createRepositoryHarness(initialRecords: TaskSavedViewRecord[] = []) {
  const records = [...initialRecords];

  const repository: TaskSavedViewRepository = {
    async createSavedView(input: CreateTaskSavedViewRecordInput) {
      const now = new Date("2026-07-09T18:00:00.000Z");
      const record: TaskSavedViewRecord = {
        id: `saved-view-${records.length + 1}`,
        name: input.name,
        config: input.config as Prisma.JsonValue,
        createdAt: now,
        updatedAt: now,
        createdByUser: {
          id: input.createdByUserId,
          name: managerUser.name,
          email: managerUser.email
        }
      };

      records.unshift(record);

      return record;
    },

    async deleteSavedView(id: string) {
      const index = records.findIndex((record) => record.id === id);

      if (index >= 0) {
        records.splice(index, 1);
      }
    },

    async listSavedViews() {
      return [...records];
    }
  };

  return {
    readRecords() {
      return [...records];
    },
    repository
  };
}

function createStoredSavedView(overrides: Partial<TaskSavedViewRecord> = {}): TaskSavedViewRecord {
  return {
    id: "saved-view-1",
    name: "Morning Blockers",
    config: {
      activeDepartmentFilter: "SHOP",
      activeQueueFilter: "BLOCKED",
      activeView: "list",
      groupBy: "owner",
      searchText: "compressor",
      visibleColumns: ["priority", "title", "status"]
    },
    createdAt: new Date("2026-07-09T12:00:00.000Z"),
    updatedAt: new Date("2026-07-09T12:05:00.000Z"),
    createdByUser: {
      id: managerUser.id,
      name: managerUser.name,
      email: managerUser.email
    },
    ...overrides
  };
}

describe("task saved views service", () => {
  it("allows authenticated users to list shared saved views", async () => {
    const { repository } = createRepositoryHarness([createStoredSavedView()]);

    const savedViews = await listTaskSavedViews(staffUser, repository);

    expect(savedViews).toEqual([
      expect.objectContaining({
        activeDepartmentFilter: "SHOP",
        activeQueueFilter: "BLOCKED",
        createdByUser: expect.objectContaining({
          name: "Eli Manager"
        }),
        name: "Morning Blockers",
        visibleColumns: ["priority", "title", "status"]
      })
    ]);
  });

  it("allows managers to create durable shared saved views", async () => {
    const { readRecords, repository } = createRepositoryHarness();

    const savedView = await createTaskSavedView(
      managerUser,
      {
        config: {
          activeDepartmentFilter: "ADMIN",
          activeQueueFilter: "READY_FOR_REVIEW",
          activeView: "board",
          groupBy: "department",
          searchText: "title",
          visibleColumns: ["title", "owner", "dueTime"]
        },
        name: "Ready Review"
      },
      repository
    );

    expect(savedView).toEqual(
      expect.objectContaining({
        activeDepartmentFilter: "ADMIN",
        activeQueueFilter: "READY_FOR_REVIEW",
        activeView: "board",
        name: "Ready Review",
        visibleColumns: ["title", "owner", "dueTime"]
      })
    );
    expect(readRecords()).toHaveLength(1);
  });

  it("prevents staff from creating or deleting shared saved views", async () => {
    const { repository } = createRepositoryHarness([createStoredSavedView()]);

    await expect(
      createTaskSavedView(
        staffUser,
        {
          config: {},
          name: "Staff View"
        },
        repository
      )
    ).rejects.toThrow("Manager access required.");

    await expect(deleteTaskSavedView(staffUser, "saved-view-1", repository)).rejects.toThrow(
      "Manager access required."
    );
  });

  it("rejects malformed create payloads", async () => {
    const { repository } = createRepositoryHarness();

    await expect(
      createTaskSavedView(
        managerUser,
        {
          config: null,
          name: "Broken View"
        },
        repository
      )
    ).rejects.toThrow("Saved view config must be an object.");
  });

  it("allows managers to delete saved views", async () => {
    const { readRecords, repository } = createRepositoryHarness([createStoredSavedView()]);

    await deleteTaskSavedView(managerUser, "saved-view-1", repository);

    expect(readRecords()).toHaveLength(0);
  });
});
