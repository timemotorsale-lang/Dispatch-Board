import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createTaskSavedView: vi.fn(),
  deleteTaskSavedView: vi.fn(),
  getCurrentUser: vi.fn(),
  listTaskSavedViews: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({
  getCurrentUser: mocks.getCurrentUser
}));

vi.mock("@/server/services/task-saved-views", () => ({
  createTaskSavedView: mocks.createTaskSavedView,
  deleteTaskSavedView: mocks.deleteTaskSavedView,
  listTaskSavedViews: mocks.listTaskSavedViews
}));

import { DELETE } from "@/app/api/tasks/saved-views/[id]/route";
import { GET, POST } from "@/app/api/tasks/saved-views/route";

const managerUser = {
  id: "user-morgan.manager@local.test",
  name: "Eli Manager",
  email: "morgan.manager@local.test",
  isActive: true,
  roles: ["General Manager"],
  duties: {
    direct: ["Review blockers and approvals"],
    roleDefaults: ["Review blockers and approvals"],
    all: ["Review blockers and approvals"]
  }
};

describe("task saved views route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(managerUser);
  });

  it("lists shared saved views", async () => {
    mocks.listTaskSavedViews.mockResolvedValue([
      {
        id: "saved-view-1",
        name: "Morning Blockers",
        activeDepartmentFilter: "SHOP",
        activeQueueFilter: "BLOCKED",
        activeView: "list",
        groupBy: "owner",
        searchText: "compressor",
        visibleColumns: ["title", "status"],
        createdAt: "2026-07-09T12:00:00.000Z",
        updatedAt: "2026-07-09T12:05:00.000Z",
        createdByUser: {
          id: managerUser.id,
          name: managerUser.name,
          email: managerUser.email
        }
      }
    ]);

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      savedViews: [
        expect.objectContaining({
          id: "saved-view-1",
          name: "Morning Blockers"
        })
      ]
    });
    expect(mocks.listTaskSavedViews).toHaveBeenCalledWith(managerUser);
  });

  it("creates a shared saved view", async () => {
    const payload = {
      config: {
        activeDepartmentFilter: null,
        activeQueueFilter: "ALL",
        activeView: "list",
        groupBy: "none",
        searchText: "",
        visibleColumns: ["title", "status"]
      },
      name: "Saved View 1"
    };
    mocks.createTaskSavedView.mockResolvedValue({
      id: "saved-view-1",
      name: "Saved View 1",
      ...payload.config,
      createdAt: "2026-07-09T12:00:00.000Z",
      updatedAt: "2026-07-09T12:00:00.000Z",
      createdByUser: null
    });

    const response = await POST(
      new Request("http://localhost/api/tasks/saved-views", {
        method: "POST",
        body: JSON.stringify(payload)
      })
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      savedView: expect.objectContaining({
        id: "saved-view-1",
        name: "Saved View 1"
      })
    });
    expect(mocks.createTaskSavedView).toHaveBeenCalledWith(managerUser, payload);
  });

  it("maps staff permission failures to 403", async () => {
    mocks.createTaskSavedView.mockRejectedValue(new Error("Manager access required."));

    const response = await POST(
      new Request("http://localhost/api/tasks/saved-views", {
        method: "POST",
        body: JSON.stringify({
          config: {},
          name: "Staff View"
        })
      })
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Manager access required."
    });
  });

  it("deletes a shared saved view", async () => {
    mocks.deleteTaskSavedView.mockResolvedValue(undefined);

    const response = await DELETE(
      new Request("http://localhost/api/tasks/saved-views/saved-view-1", {
        method: "DELETE"
      }),
      {
        params: Promise.resolve({
          id: "saved-view-1"
        })
      }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true
    });
    expect(mocks.deleteTaskSavedView).toHaveBeenCalledWith(managerUser, "saved-view-1");
  });
});
