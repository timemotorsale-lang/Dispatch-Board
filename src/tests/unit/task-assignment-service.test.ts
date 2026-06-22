import { describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import type { TaskAssignmentRepository } from "@/server/repositories/task-assignment-repository";
import { assignTask } from "@/server/services/task-assignment-service";

const manager = { id: "manager", roles: ["General Manager"] } as AuthenticatedUser;
const staff = { id: "staff", roles: ["Salesperson"] } as AuthenticatedUser;

function repository(overrides: Partial<TaskAssignmentRepository> = {}): TaskAssignmentRepository {
  return {
    findTaskById: vi.fn().mockResolvedValue({ id: "task", boardDayId: "board", assignedUserId: "old", recommendedUserId: "recommended", updatedAt: new Date("2026-06-21T12:00:00Z") }),
    isActiveUser: vi.fn().mockResolvedValue(true),
    assignWithActivity: vi.fn().mockImplementation(async (_id, _actor, assignedUserId) => ({ id: "task", boardDayId: "board", assignedUserId, recommendedUserId: "recommended", updatedAt: new Date("2026-06-21T13:00:00Z") })),
    ...overrides
  };
}

describe("task assignment service", () => {
  it("accepts the stored recommendation and records the mode", async () => {
    const repo = repository();
    await expect(assignTask(manager, "task", { mode: "accept_recommendation" }, repo)).resolves.toMatchObject({ assignedUserId: "recommended" });
    expect(repo.assignWithActivity).toHaveBeenCalledWith("task", "manager", "recommended", "accept_recommendation", undefined);
  });

  it("keeps assignment manager-only", async () => {
    await expect(assignTask(staff, "task", { mode: "reassign", assignedUserId: "new" }, repository())).rejects.toThrow("You do not have permission to assign tasks.");
  });

  it("rejects inactive targets", async () => {
    await expect(assignTask(manager, "task", { mode: "reassign", assignedUserId: "new" }, repository({ isActiveUser: vi.fn().mockResolvedValue(false) }))).rejects.toThrow("Tasks can only be assigned to an active user.");
  });

  it("requires overrides and reassignments to change the applicable user", async () => {
    await expect(assignTask(manager, "task", { mode: "override", assignedUserId: "recommended" }, repository())).rejects.toThrow("Override must select a user other than the recommended user.");
    await expect(assignTask(manager, "task", { mode: "reassign", assignedUserId: "old" }, repository())).rejects.toThrow("Reassignment must select a different user.");
  });

  it("rejects recommendation acceptance when no recommendation is stored", async () => {
    const repo = repository({ findTaskById: vi.fn().mockResolvedValue({ id: "task", boardDayId: "board", assignedUserId: "old", recommendedUserId: null, updatedAt: new Date() }) });
    await expect(assignTask(manager, "task", { mode: "accept_recommendation" }, repo)).rejects.toThrow("This task does not have a recommendation to accept.");
  });
});
