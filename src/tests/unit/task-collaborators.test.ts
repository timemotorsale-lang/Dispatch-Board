import { describe, expect, it } from "vitest";

import type { TaskCollaboratorRepository } from "@/server/repositories/task-collaborator-repository";
import { replaceTaskCollaborators } from "@/server/services/task-collaborators";
import { normalizeTaskCollaboratorInput } from "@/server/validation/task-collaborators";

const manager = { id: "manager", name: "Manager", email: "manager@test.local", isActive: true, roles: ["General Manager"], duties: { direct: [], roleDefaults: [], all: [] } };

describe("task collaborators", () => {
  it("normalizes a unique collaborator list", () => {
    expect(normalizeTaskCollaboratorInput({ collaboratorIds: [" user-1 ", "user-2"] })).toEqual({
      collaboratorIds: ["user-1", "user-2"],
      collaboratorRequests: [
        { userId: "user-1", collaborationScope: "" },
        { userId: "user-2", collaborationScope: "" }
      ]
    });
    expect(() => normalizeTaskCollaboratorInput({ collaboratorIds: ["user-1", "user-1"] })).toThrow("cannot contain duplicates");
  });

  it("normalizes collaborator scope and capacity requests", () => {
    expect(normalizeTaskCollaboratorInput({
      collaboratorRequests: [
        { userId: " ancilla ", collaborationScope: " Review paperwork handoff ", capacityRequested: "30 minutes today" }
      ]
    })).toEqual({
      collaboratorIds: ["ancilla"],
      collaboratorRequests: [
        { userId: "ancilla", collaborationScope: "Review paperwork handoff", capacityRequested: "30 minutes today" }
      ]
    });
    expect(() => normalizeTaskCollaboratorInput({
      collaboratorRequests: [{ userId: "ancilla", collaborationScope: "" }]
    })).toThrow("needs a collaboration scope");
  });

  it("rejects the owner and inactive staff", async () => {
    const repository = {
      findTaskById: async () => ({ id: "task-1", boardDayId: "board-1", title: "Task", assignedUserId: "owner" }),
      findActiveUsersByIds: async (ids: string[]) => ids.filter((id) => id === "active").map((id) => ({ id, name: "Active" })),
      listForTask: async () => [],
      replace: async () => []
    } satisfies TaskCollaboratorRepository;

    await expect(replaceTaskCollaborators(manager, "task-1", { collaboratorIds: ["owner"] }, repository)).rejects.toThrow("owner cannot also be a collaborator");
    await expect(replaceTaskCollaborators(manager, "task-1", { collaboratorIds: ["inactive"] }, repository)).rejects.toThrow("active staff member");
  });
});
