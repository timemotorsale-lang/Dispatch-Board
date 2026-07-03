import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  createManagedRole: vi.fn(),
  getTeamManagementSnapshotForManager: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({
  getCurrentUser: mocks.getCurrentUser
}));

vi.mock("@/server/services/team-management", () => ({
  createManagedRole: mocks.createManagedRole,
  getTeamManagementSnapshotForManager: mocks.getTeamManagementSnapshotForManager
}));

import { GET, POST } from "@/app/api/roles/route";

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

describe("roles route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(managerUser);
  });

  it("returns manager-visible roles", async () => {
    mocks.getTeamManagementSnapshotForManager.mockResolvedValue({
      users: [],
      roles: [{ id: "role-sales", name: "Salesperson", description: null, dutyNames: [] }],
      duties: []
    });

    const response = await GET(new Request("http://localhost/api/roles"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      roles: [{ id: "role-sales", name: "Salesperson", description: null, dutyNames: [] }]
    });
  });

  it("creates a role with default duties", async () => {
    mocks.createManagedRole.mockResolvedValue({
      id: "role-finance",
      name: "Finance Manager",
      description: "Owns lender workflow.",
      dutyNames: ["Confirm lender document package"]
    });

    const response = await POST(
      new Request("http://localhost/api/roles", {
        method: "POST",
        body: JSON.stringify({
          name: "Finance Manager",
          description: "Owns lender workflow.",
          dutyIds: ["duty-lender"]
        })
      })
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      role: expect.objectContaining({
        id: "role-finance",
        name: "Finance Manager"
      })
    });
  });
});
