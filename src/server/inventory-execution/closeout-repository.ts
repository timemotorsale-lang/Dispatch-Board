import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { executeAggregateMutation, toJson } from "@/server/enterprise-command/aggregate-mutation";
import type { EnterpriseCommandCommitInput } from "@/server/enterprise-command/repository";
import type { normalizeHandoffOffer, normalizeTechnicianCloseout } from "./closeout-domain";

type Closeout = ReturnType<typeof normalizeTechnicianCloseout>;
type Offer = ReturnType<typeof normalizeHandoffOffer>;
export type CloseoutRepository = ReturnType<typeof createCloseoutRepository>;

export function createCloseoutRepository(database: PrismaClient = prisma) {
  return {
    getPacketContext(organizationId: string, packetId: string) { return database.inventoryWorkPacket.findFirst({ where: { id: packetId, organizationId }, include: { task: { select: { assignedUserId: true, requiresManagerApproval: true } }, workSessions: { where: { status: { in: ["ACTIVE", "PAUSED"] } }, take: 1 }, closeout: true } }); },
    getHandoffContext(organizationId: string, handoffId: string) { return database.inventoryWorkHandoff.findFirst({ where: { id: handoffId, organizationId }, include: { workPacket: { select: { id: true, version: true } } } }); },
    closeout(command: EnterpriseCommandCommitInput, data: Closeout & { id: string; submittedByUserId: string; sessionId: string | null; now: Date }) {
      return executeAggregateMutation(database, command, "vehicle-operations.inventory-execution", async (tx, version) => {
        const packet = await tx.inventoryWorkPacket.findFirst({ where: { id: command.subjectId, organizationId: command.organizationId }, include: { closeout: true } });
        if (!packet) throw new Error("Inventory Work Packet was not found.");
        if (packet.closeout) throw new Error("Technician closeout already exists for this work packet.");
        if (["COMPLETED", "CANCELLED"].includes(packet.state)) throw new Error("Terminal work cannot be closed out again.");
        const canonicalEvidence = packet.evidenceRequirements && typeof packet.evidenceRequirements === "object" && !Array.isArray(packet.evidenceRequirements) ? packet.evidenceRequirements as { items?: Array<{ required?: boolean; satisfied?: boolean }> } : {};
        if (data.outcome === "COMPLETED" && (canonicalEvidence.items ?? []).some(item => item.required !== false && item.satisfied !== true)) throw new Error("Authoritative required completion evidence is not yet satisfied.");
        const closeout = await tx.inventoryTechnicianCloseout.create({ data: { id: data.id, organizationId: command.organizationId, workPacketId: packet.id, workSessionId: data.sessionId, outcome: data.outcome, workPerformed: toJson(data.workPerformed), partsDisposition: toJson(data.partsDisposition), findings: toJson(data.findings), verification: toJson(data.verification), qcState: data.qcState, explanation: data.explanation, observation: data.observation, testsPerformed: data.testsPerformed, recommendedNextStep: data.recommendedNextStep, diagnosticMinutes: data.diagnosticMinutes, operability: data.operability, dependencySnapshot: data.blockerRecovery ? toJson(data.blockerRecovery) : undefined, optionalNotes: data.optionalNotes, evidenceSnapshot: toJson(data.evidenceSnapshot), submittedByUserId: data.submittedByUserId, submittedAt: data.now, version: 1 } });
        const nextState = data.outcome === "COMPLETED" ? "READY_FOR_REVIEW" : "BLOCKED";
        await tx.inventoryWorkPacket.update({ where: { id: packet.id }, data: { state: nextState, blockerRecovery: data.blockerRecovery ? toJson(data.blockerRecovery) : undefined, nextCheckAt: data.blockerRecovery ? new Date(data.blockerRecovery.nextCheckAt) : packet.nextCheckAt, escalationAt: data.blockerRecovery ? new Date(data.blockerRecovery.escalateAt) : packet.escalationAt, version } });
        await tx.task.update({ where: { id: packet.taskId }, data: { status: nextState === "READY_FOR_REVIEW" ? "READY_FOR_REVIEW" : "BLOCKED", blockerReason: data.explanation ?? undefined, readyForReviewAt: nextState === "READY_FOR_REVIEW" ? data.now : null } });
        if (data.sessionId) await tx.inventoryWorkSession.updateMany({ where: { id: data.sessionId, status: { in: ["ACTIVE", "PAUSED"] } }, data: { status: "COMPLETED", activeSince: null, endedAt: data.now, version: { increment: 1 } } });
        return { previous: packet, result: { closeoutId: closeout.id, outcome: closeout.outcome, packetId: packet.id, packetState: nextState, version } };
      });
    },
    offerHandoff(command: EnterpriseCommandCommitInput, data: Offer & { fromUserId: string; id: string; now: Date }) {
      return executeAggregateMutation(database, command, "vehicle-operations.inventory-execution", async (tx, version) => {
        const packet = await tx.inventoryWorkPacket.findFirst({ where: { id: command.subjectId, organizationId: command.organizationId }, include: { closeout: true } });
        if (!packet?.closeout || packet.state !== "READY_FOR_REVIEW") throw new Error("Completion evidence must be ready for review before handoff.");
        const target = await tx.user.findFirst({ where: { id: data.toUserId, isActive: true }, select: { id: true } }); if (!target) throw new Error("Next handoff owner must be active.");
        const open = await tx.inventoryWorkHandoff.findFirst({ where: { organizationId: command.organizationId, workPacketId: packet.id, status: "OFFERED" }, select: { id: true } }); if (open) throw new Error("This work packet already has an open handoff.");
        const handoff = await tx.inventoryWorkHandoff.create({ data: { id: data.id, organizationId: command.organizationId, workPacketId: packet.id, fromUserId: data.fromUserId, toUserId: data.toUserId, nextAction: data.nextAction, targetAt: data.targetAt, offeredAt: data.now } });
        await tx.inventoryWorkPacket.update({ where: { id: packet.id }, data: { handoff: toJson({ handoffId: handoff.id, status: "OFFERED", toUserId: data.toUserId, nextAction: data.nextAction, targetAt: data.targetAt.toISOString() }), version } });
        return { result: { handoffId: handoff.id, status: handoff.status, version } };
      });
    },
    respondHandoff(command: EnterpriseCommandCommitInput, data: { expectedHandoffVersion: number; response: "ACCEPT" | "REJECT"; responseNote: string | null; responseReasonCode: string | null; userId: string; now: Date }) {
      return executeAggregateMutation(database, command, "vehicle-operations.inventory-execution", async tx => {
        const previous = await tx.inventoryWorkHandoff.findFirst({ where: { id: command.subjectId, organizationId: command.organizationId } }); if (!previous) throw new Error("Inventory handoff was not found."); if (previous.version !== data.expectedHandoffVersion) throw new Error(`Expected handoff version ${data.expectedHandoffVersion}, but current version is ${previous.version}.`); if (previous.status !== "OFFERED") throw new Error("Inventory handoff has already been answered."); if (previous.toUserId !== data.userId) throw new Error("Only the proposed next owner may answer this handoff.");
        const accepted = data.response === "ACCEPT", handoff = await tx.inventoryWorkHandoff.update({ where: { id: previous.id }, data: { status: accepted ? "ACCEPTED" : "REJECTED", acceptedAt: accepted ? data.now : null, rejectedAt: accepted ? null : data.now, responseReasonCode: data.responseReasonCode, responseNote: data.responseNote, version: command.expectedVersion + 1 } });
        await tx.inventoryWorkPacket.update({ where: { id: previous.workPacketId }, data: { handoff: toJson({ handoffId: handoff.id, status: handoff.status, toUserId: handoff.toUserId, nextAction: handoff.nextAction, targetAt: handoff.targetAt.toISOString(), respondedAt: data.now.toISOString() }) } });
        return { previous, result: { handoffId: handoff.id, status: handoff.status, version: handoff.version } };
      });
    }
  };
}
