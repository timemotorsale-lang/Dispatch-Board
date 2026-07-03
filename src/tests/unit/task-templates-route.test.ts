import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  createTaskTemplate: vi.fn(),
  listTaskTemplatesForManager: vi.fn(),
  updateTaskTemplate: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({
  getCurrentUser: mocks.getCurrentUser
}));

vi.mock("@/server/services/task-template-service", () => ({
  createTaskTemplate: mocks.createTaskTemplate,
  listTaskTemplatesForManager: mocks.listTaskTemplatesForManager,
  updateTaskTemplate: mocks.updateTaskTemplate
}));

import { GET, POST } from "@/app/api/task-templates/route";
import { PATCH } from "@/app/api/task-templates/[id]/route";

const managerUser = {
  id: "user-manager",
  name: "Morgan Manager",
  email: "morgan.manager@local.test",
  isActive: true,
  roles: ["General Manager"],
  duties: {
    direct: [],
    roleDefaults: ["Review blockers and approvals"],
    all: ["Review blockers and approvals"]
  }
};

describe("task templates routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(managerUser);
  });

  it("lists templates with includeInactive support", async () => {
    mocks.listTaskTemplatesForManager.mockResolvedValue([
      {
        id: "template-1",
        title: "Review inventory status",
        description: null,
        workflowArea: "INVENTORY",
        defaultDueTime: "09:00",
        requiresManagerApproval: false,
        isActive: true,
        roleId: null,
        dutyId: null,
        roleName: null,
        dutyName: null,
        createdAt: new Date("2026-07-03T12:00:00.000Z"),
        updatedAt: new Date("2026-07-03T12:00:00.000Z")
      }
    ]);

    const response = await GET(new Request("http://localhost/api/task-templates?includeInactive=true"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      templates: [expect.objectContaining({ id: "template-1", title: "Review inventory status" })]
    });
    expect(mocks.listTaskTemplatesForManager).toHaveBeenCalledWith(managerUser, {
      includeInactive: true
    });
  });

  it("creates a template", async () => {
    mocks.createTaskTemplate.mockResolvedValue({
      id: "template-1",
      title: "Review inventory status",
      description: null,
      workflowArea: "INVENTORY",
      defaultDueTime: "09:00",
      requiresManagerApproval: false,
      isActive: true,
      roleId: null,
      dutyId: null,
      roleName: null,
      dutyName: null,
      createdAt: new Date("2026-07-03T12:00:00.000Z"),
      updatedAt: new Date("2026-07-03T12:00:00.000Z")
    });

    const response = await POST(
      new Request("http://localhost/api/task-templates", {
        method: "POST",
        body: JSON.stringify({
          title: "Review inventory status",
          workflowArea: "INVENTORY",
          defaultDueTime: "09:00",
          requiresManagerApproval: false
        })
      })
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      template: expect.objectContaining({
        id: "template-1",
        title: "Review inventory status"
      })
    });
  });

  it("updates a template", async () => {
    mocks.updateTaskTemplate.mockResolvedValue({
      id: "template-1",
      title: "Review inventory status",
      description: "Updated description",
      workflowArea: "INVENTORY",
      defaultDueTime: "09:00",
      requiresManagerApproval: false,
      isActive: false,
      roleId: null,
      dutyId: null,
      roleName: null,
      dutyName: null,
      createdAt: new Date("2026-07-03T12:00:00.000Z"),
      updatedAt: new Date("2026-07-03T12:00:00.000Z")
    });

    const response = await PATCH(
      new Request("http://localhost/api/task-templates/template-1", {
        method: "PATCH",
        body: JSON.stringify({
          description: "Updated description",
          isActive: false
        })
      }),
      {
        params: Promise.resolve({ id: "template-1" })
      }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      template: expect.objectContaining({
        id: "template-1",
        isActive: false
      })
    });
  });
});
