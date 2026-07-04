import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  createManagedTeamUser: vi.fn(),
  getTeamManagementSnapshotForManager: vi.fn(),
  updateManagedTeamUser: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({
  getCurrentUser: mocks.getCurrentUser
}));

vi.mock("@/server/services/team-management", () => ({
  createManagedTeamUser: mocks.createManagedTeamUser,
  getTeamManagementSnapshotForManager: mocks.getTeamManagementSnapshotForManager,
  updateManagedTeamUser: mocks.updateManagedTeamUser
}));

import { GET, POST } from "@/app/api/users/route";
import { PATCH } from "@/app/api/users/[id]/route";

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

const inventoryLeadUser = {
  id: "user-riley.inventory@local.test",
  name: "Riley Inventory",
  email: "riley.inventory@local.test",
  isActive: true,
  roles: ["Inventory Manager", "Service Department Manager"],
  duties: {
    direct: [],
    roleDefaults: ["Review inventory status"],
    all: ["Review inventory status"]
  }
};

describe("users route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(managerUser);
  });

  it("returns the team management snapshot for managers", async () => {
    mocks.getTeamManagementSnapshotForManager.mockResolvedValue({
      users: [],
      roles: [{ id: "role-sales", name: "Salesperson" }],
      duties: [{ id: "duty-sales", name: "Follow up with assigned leads", workflowArea: "SALES" }]
    });

    const response = await GET(new Request("http://localhost/api/users"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      users: [],
      roles: [{ id: "role-sales", name: "Salesperson" }],
      duties: [{ id: "duty-sales", name: "Follow up with assigned leads", workflowArea: "SALES" }]
    });
    expect(mocks.getTeamManagementSnapshotForManager).toHaveBeenCalledWith(managerUser);
  });

  it("creates a new managed team user from the manager route", async () => {
    mocks.createManagedTeamUser.mockResolvedValue({
      id: "user-alex",
      name: "Alex Staff",
      email: "alex.staff@local.test",
      isActive: true,
      createdAt: new Date("2026-07-03T12:00:00.000Z"),
      roles: [{ id: "role-sales", name: "Salesperson" }],
      duties: []
    });

    const response = await POST(
      new Request("http://localhost/api/users", {
        method: "POST",
        body: JSON.stringify({
          name: "Alex Staff",
          email: "alex.staff@local.test",
          password: "dispatch123!",
          roleIds: ["role-sales"],
          dutyIds: []
        })
      })
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      user: expect.objectContaining({
        id: "user-alex",
        name: "Alex Staff",
        email: "alex.staff@local.test"
      })
    });
    expect(mocks.createManagedTeamUser).toHaveBeenCalledWith(managerUser, {
      name: "Alex Staff",
      email: "alex.staff@local.test",
      password: "dispatch123!",
      roleIds: ["role-sales"],
      dutyIds: []
    });
  });

  it("rejects invalid create payloads before service execution", async () => {
    const response = await POST(
      new Request("http://localhost/api/users", {
        method: "POST",
        body: JSON.stringify({
          email: "alex.staff@local.test"
        })
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Name, email, password, and at least one role are required."
    });
    expect(mocks.createManagedTeamUser).not.toHaveBeenCalled();
  });

  it("updates an existing managed team user", async () => {
    mocks.updateManagedTeamUser.mockResolvedValue({
      id: "user-alex",
      name: "Alex Staff",
      email: "alex.staff@local.test",
      isActive: false,
      createdAt: new Date("2026-07-03T12:00:00.000Z"),
      roles: [{ id: "role-sales", name: "Salesperson" }],
      duties: []
    });

    const response = await PATCH(
      new Request("http://localhost/api/users/user-alex", {
        method: "PATCH",
        body: JSON.stringify({
          isActive: false
        })
      }),
      {
        params: Promise.resolve({ id: "user-alex" })
      }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      user: expect.objectContaining({
        id: "user-alex",
        isActive: false
      })
    });
    expect(mocks.updateManagedTeamUser).toHaveBeenCalledWith(managerUser, "user-alex", {
      isActive: false
    });
  });

  it("rejects manager-only user management for non-General-Manager staff roles", async () => {
    mocks.getCurrentUser.mockResolvedValue(inventoryLeadUser);
    mocks.getTeamManagementSnapshotForManager.mockRejectedValue(new Error("Manager access required."));

    const response = await GET(new Request("http://localhost/api/users"));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Manager access required."
    });
  });
});
