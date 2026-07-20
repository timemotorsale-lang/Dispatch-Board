import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { executeAggregateMutation } from "@/server/enterprise-command/aggregate-mutation";
import type { EnterpriseCommandCommitInput } from "@/server/enterprise-command/repository";
import { activeSeconds } from "./work-time-domain";

export type WorkTimeRepository = ReturnType<typeof createWorkTimeRepository>;

export function createWorkTimeRepository(database: PrismaClient = prisma) {
  return {
    getPacketContext(organizationId: string, packetId: string) { return database.inventoryWorkPacket.findFirst({ where: { id: packetId, organizationId }, select: { id: true, state: true, readiness: true, estimatedMinutes: true, task: { select: { assignedUserId: true } } } }); },
    getSessionContext(organizationId: string, sessionId: string) { return database.inventoryWorkSession.findFirst({ where: { id: sessionId, organizationId }, select: { id: true, userId: true, workPacketId: true, status: true, version: true } }); },
    start(command: EnterpriseCommandCommitInput, data: { id: string; packetId: string; userId: string; now: Date; estimateMinutes: number | null }) {
      return executeAggregateMutation(database, command, "vehicle-operations.inventory-execution", async tx => {
        const openPacket = await tx.inventoryWorkSession.findFirst({ where: { organizationId: command.organizationId, workPacketId: data.packetId, status: { in: ["ACTIVE", "PAUSED"] } }, select: { id: true } }), openUser = await tx.inventoryWorkSession.findFirst({ where: { organizationId: command.organizationId, userId: data.userId, status: { in: ["ACTIVE", "PAUSED"] } }, select: { id: true, workPacketId: true } });
        if (openPacket) throw new Error("This work packet already has an open time session.");
        if (openUser) throw new Error("Finish or pause-and-transfer the existing work session before starting another task.");
        const session = await tx.inventoryWorkSession.create({ data: { id: data.id, organizationId: command.organizationId, workPacketId: data.packetId, userId: data.userId, status: "ACTIVE", startedAt: data.now, activeSince: data.now, estimateAtStartMinutes: data.estimateMinutes, version: 1 } });
        return { result: session };
      });
    },
    control(command: EnterpriseCommandCommitInput, data: { action: "PAUSE" | "RESUME" | "CHECKPOINT" | "COMPLETE"; checkpointCode: string | null; checkpointNote: string | null; now: Date }) {
      return executeAggregateMutation(database, command, "vehicle-operations.inventory-execution", async tx => {
        const previous = await tx.inventoryWorkSession.findFirst({ where: { id: command.subjectId, organizationId: command.organizationId } });
        if (!previous) throw new Error("Work session was not found.");
        if (previous.status === "COMPLETED") throw new Error("Completed work sessions cannot be changed.");
        if (data.action === "PAUSE" && previous.status !== "ACTIVE") throw new Error("Only an active work session can be paused.");
        if (data.action === "RESUME" && previous.status !== "PAUSED") throw new Error("Only a paused work session can be resumed.");
        const elapsed = activeSeconds(previous, data.now), session = await tx.inventoryWorkSession.update({ where: { id: previous.id }, data: data.action === "PAUSE" ? { status: "PAUSED", accumulatedSeconds: elapsed, activeSince: null, lastCheckpointAt: data.now, checkpointCode: data.checkpointCode, checkpointNote: data.checkpointNote, version: command.expectedVersion + 1 } : data.action === "RESUME" ? { status: "ACTIVE", activeSince: data.now, version: command.expectedVersion + 1 } : data.action === "COMPLETE" ? { status: "COMPLETED", accumulatedSeconds: elapsed, activeSince: null, endedAt: data.now, lastCheckpointAt: data.now, version: command.expectedVersion + 1 } : { accumulatedSeconds: elapsed, activeSince: previous.status === "ACTIVE" ? data.now : null, lastCheckpointAt: data.now, checkpointCode: data.checkpointCode, checkpointNote: data.checkpointNote, version: command.expectedVersion + 1 } });
        return { previous, result: session };
      });
    }
  };
}
