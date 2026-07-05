import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getTaskReadModelById: vi.fn(),
  updateTaskMetadata: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({
  getCurrentUser: mocks.getCurrentUser
}));

vi.mock("@/server/services/task-read", () => ({
  getTaskReadModelById: mocks.getTaskReadModelById
}));

vi.mock("@/server/services/task-metadata-service", () => ({
  updateTaskMetadata: mocks.updateTaskMetadata
}));

import { GET, PATCH } from "@/app/api/tasks/[id]/route";

const managerUser = {
  id: "user-morgan.manager@local.test",
  name: "Eli Manager",
  email: "morgan.manager@local.test",
  isActive: true,
  roles: ["General Manager"],
  duties: {
    direct: ["Review blocked tasks"],
    roleDefaults: ["Review blocked tasks"],
    all: ["Review blocked tasks"]
  }
};

describe("task route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(managerUser);
  });

  it("returns the task from GET", async () => {
    mocks.getTaskReadModelById.mockResolvedValue({
      id: "task-1",
      title: "Review blocked tasks"
    });

    const response = await GET(new Request("http://localhost/api/tasks/task-1"), {
      params: Promise.resolve({
        id: "task-1"
      })
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      task: {
        id: "task-1",
        title: "Review blocked tasks"
      }
    });
  });

  it("updates task metadata from PATCH", async () => {
    mocks.updateTaskMetadata.mockResolvedValue({
      id: "task-1",
      description: "Revised detail",
      dueAt: "2026-07-04T17:00:00.000Z",
      vehicleReference: "2018 Ford Explorer",
      customerReference: null,
      updatedAt: "2026-07-04T15:30:00.000Z"
    });

    const response = await PATCH(
      new Request("http://localhost/api/tasks/task-1", {
        method: "PATCH",
        body: JSON.stringify({
          description: "Revised detail"
        })
      }),
      {
        params: Promise.resolve({
          id: "task-1"
        })
      }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      task: {
        id: "task-1",
        description: "Revised detail",
        dueAt: "2026-07-04T17:00:00.000Z",
        vehicleReference: "2018 Ford Explorer",
        customerReference: null,
        updatedAt: "2026-07-04T15:30:00.000Z"
      }
    });
    expect(mocks.updateTaskMetadata).toHaveBeenCalledWith(managerUser, "task-1", {
      description: "Revised detail"
    });
  });

  it("maps due date permission failures to 400", async () => {
    mocks.updateTaskMetadata.mockRejectedValue(new Error("Only managers can change the due date."));

    const response = await PATCH(
      new Request("http://localhost/api/tasks/task-1", {
        method: "PATCH",
        body: JSON.stringify({
          dueAt: "2026-07-05T18:00:00.000Z"
        })
      }),
      {
        params: Promise.resolve({
          id: "task-1"
        })
      }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Only managers can change the due date."
    });
  });
});
