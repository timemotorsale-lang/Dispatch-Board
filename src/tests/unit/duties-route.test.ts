import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  createManagedDuty: vi.fn(),
  getTeamManagementSnapshotForManager: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({
  getCurrentUser: mocks.getCurrentUser
}));

vi.mock("@/server/services/team-management", () => ({
  createManagedDuty: mocks.createManagedDuty,
  getTeamManagementSnapshotForManager: mocks.getTeamManagementSnapshotForManager
}));

import { GET, POST } from "@/app/api/duties/route";

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

describe("duties route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(managerUser);
  });

  it("returns manager-visible duties", async () => {
    mocks.getTeamManagementSnapshotForManager.mockResolvedValue({
      users: [],
      roles: [],
      duties: [
        {
          id: "duty-lender",
          name: "Confirm lender document package",
          workflowArea: "SALES",
          description: "Confirm signatures before funding."
        }
      ]
    });

    const response = await GET(new Request("http://localhost/api/duties"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      duties: [
        {
          id: "duty-lender",
          name: "Confirm lender document package",
          workflowArea: "SALES",
          description: "Confirm signatures before funding."
        }
      ]
    });
  });

  it("creates a duty with workflow area", async () => {
    mocks.createManagedDuty.mockResolvedValue({
      id: "duty-lender",
      name: "Confirm lender document package",
      workflowArea: "SALES",
      description: "Confirm signatures before funding."
    });

    const response = await POST(
      new Request("http://localhost/api/duties", {
        method: "POST",
        body: JSON.stringify({
          name: "Confirm lender document package",
          workflowArea: "SALES",
          description: "Confirm signatures before funding."
        })
      })
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      duty: expect.objectContaining({
        id: "duty-lender",
        name: "Confirm lender document package"
      })
    });
  });
});
