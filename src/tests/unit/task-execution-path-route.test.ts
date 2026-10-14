import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  initiateTaskExecutionPath: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({
  getCurrentUser: mocks.getCurrentUser
}));

vi.mock("@/server/services/task-execution-path", () => ({
  initiateTaskExecutionPath: mocks.initiateTaskExecutionPath
}));

import { POST } from "@/app/api/tasks/[id]/path/route";

const managerUser = {
  id: "user-morgan.manager@local.test",
  name: "Eli Manager",
  email: "morgan.manager@local.test",
  isActive: true,
  roles: ["General Manager"],
  duties: {
    direct: [],
    roleDefaults: [],
    all: []
  }
};

describe("task execution path route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(managerUser);
    mocks.initiateTaskExecutionPath.mockResolvedValue({
      id: "task-1",
      workflowArea: "SHOP",
      initiatedAt: "2026-09-02T01:50:00.000Z",
      checklistCreated: 4,
      subtaskCreated: 2,
      removedGeneratedCount: 3
    });
  });

  it("normalizes visible workflow labels before initiating the path", async () => {
    const response = await POST(
      new Request("http://localhost/api/tasks/task-1/path", {
        method: "POST",
        body: JSON.stringify({ workflowArea: "Shop & Recon" })
      }),
      { params: Promise.resolve({ id: "task-1" }) }
    );

    expect(response.status).toBe(200);
    expect(mocks.initiateTaskExecutionPath).toHaveBeenCalledWith(
      managerUser,
      "task-1",
      { workflowArea: "SHOP" }
    );
  });

  it("keeps Service Advisor separate from the Shop and Recon path", async () => {
    const response = await POST(
      new Request("http://localhost/api/tasks/task-1/path", {
        method: "POST",
        body: JSON.stringify({ workflowArea: "Service Advisor" })
      }),
      { params: Promise.resolve({ id: "task-1" }) }
    );

    expect(response.status).toBe(200);
    expect(mocks.initiateTaskExecutionPath).toHaveBeenCalledWith(
      managerUser,
      "task-1",
      { workflowArea: "SERVICE_ADVISOR" }
    );
  });

  it("hides raw Prisma errors behind an actionable path message", async () => {
    mocks.initiateTaskExecutionPath.mockRejectedValueOnce(
      new Error("Invalid `prisma.task.update()` invocation")
    );

    const response = await POST(
      new Request("http://localhost/api/tasks/task-1/path", {
        method: "POST",
        body: JSON.stringify({ workflowArea: "SHOP" })
      }),
      { params: Promise.resolve({ id: "task-1" }) }
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Unable to activate this path because the task workflow data is not in sync yet. Refresh the page and try again."
    });
  });
});
