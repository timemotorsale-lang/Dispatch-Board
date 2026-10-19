import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";

describe.skipIf(process.env.RUN_DATABASE_INTEGRATION !== "1")("Task ownership PostgreSQL proof", () => {
  it("retains ownership and read access when a staff owner delegates, without granting assignee permissions", async () => {
    const { prisma } = await import("@/server/db/client");
    const { createTaskCreateRepository } = await import("@/server/repositories/task-create-repository");
    const { createTaskAssignmentRepository } = await import("@/server/repositories/task-assignment-repository");
    const { createTaskReadRepository } = await import("@/server/repositories/task-read-repository");
    const { updateTaskAssignment } = await import("@/server/services/task-assignment-service");
    const { getTaskReadModelById } = await import("@/server/services/task-read");
    const { canUpdateAssignedWork } = await import("@/server/policies/access");
    const prefix = `ownership-proof-${randomUUID()}`;
    await expect(prisma.$transaction(async (tx) => {
      const owner = await tx.user.create({ data: { name: "Ownership proof owner", email: `${prefix}-owner@example.test`, passwordHash: "integration-test-only" } });
      const assignee = await tx.user.create({ data: { name: "Ownership proof assignee", email: `${prefix}-assignee@example.test`, passwordHash: "integration-test-only" } });
      const board = await tx.boardDay.upsert({ where: { date: new Date("2199-10-13") }, update: {}, create: { date: new Date("2199-10-13") } });
      const actor = { ...owner, roles: ["Staff"], duties: { direct: [], roleDefaults: [], all: [] } };
      const created = await createTaskCreateRepository(tx).createTask({ assignedUserId: assignee.id, createdByUserId: owner.id, boardDayId: board.id, description: "Verify durable ownership", dueAt: new Date("2199-10-13T17:00:00Z"), priority: "MEDIUM", requiresManagerApproval: false, sourceType: "STAFF", status: "NOT_STARTED", title: "Task ownership proof", workflowArea: "GENERAL_MANAGER" });
      const assignment = { ...createTaskAssignmentRepository(tx), supportsActivityEvents: false };
      expect((await assignment.findTaskById(created.id))?.ownerUserId).toBe(owner.id);
      await updateTaskAssignment(actor, created.id, { assignedUserId: owner.id }, assignment);
      const delegated = await updateTaskAssignment(actor, created.id, { assignedUserId: assignee.id }, assignment);
      expect(delegated.ownerUser.id).toBe(owner.id);
      expect(delegated.assignedUser.id).toBe(assignee.id);
      const read = await getTaskReadModelById(actor, created.id, createTaskReadRepository(tx));
      expect(read?.ownerUser?.id).toBe(owner.id);
      expect(read?.assignedUser.id).toBe(assignee.id);
      expect(canUpdateAssignedWork({ actor, assignedUserId: assignee.id, requiresManagerApproval: false, requestedAction: "status" })).toBe(false);
      const generated = await tx.task.create({ data: { assignedUserId: assignee.id, boardDayId: board.id, dueAt: new Date("2199-10-13T17:00:00Z"), sourceType: "TEMPLATE", title: "Generated ownership proof", workflowArea: "GENERAL_MANAGER" } });
      expect(generated.ownerUserId).toBe(assignee.id);
      const moved = await tx.task.update({ where: { id: generated.id }, data: { assignedUserId: owner.id } });
      expect(moved.ownerUserId).toBe(assignee.id);
      throw new Error("ROLLBACK_OWNERSHIP_PROOF");
    }, { timeout: 15000 })).rejects.toThrow("ROLLBACK_OWNERSHIP_PROOF");
    expect(await prisma.user.count({ where: { email: { startsWith: prefix } } })).toBe(0);
  });
});
