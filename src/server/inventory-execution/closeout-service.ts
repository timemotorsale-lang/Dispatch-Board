import { randomUUID } from "node:crypto";
import type { AuthenticatedUser } from "@/server/auth/store";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { normalizeEnterpriseCommand } from "@/server/enterprise-command/domain";
import { assertAuthenticatedUser, isManager } from "@/server/policies/access";
import { normalizeHandoffOffer, normalizeHandoffResponse, normalizeTechnicianCloseout } from "./closeout-domain";
import { createCloseoutRepository, type CloseoutRepository } from "./closeout-repository";

type Dependencies = { now?: () => Date; organizationId?: string; repository?: CloseoutRepository };
function deps(input: Dependencies) { return { now: input.now ?? (() => new Date()), organizationId: input.organizationId ?? INITIAL_ORGANIZATION.id, repository: input.repository ?? createCloseoutRepository() }; }
function command(input: { actorUserId: string; commandType: string; expectedVersion: number; idempotencyKey: string; organizationId: string; payload: Record<string, unknown>; reason: string; subjectId: string; subjectType?: string }) { const { subjectType = "INVENTORY_WORK_PACKET", ...rest } = input; return normalizeEnterpriseCommand({ ...rest, domain: "INVENTORY_EXECUTION", locationId: null, subjectType }); }
function owner(actor: AuthenticatedUser | null, ownerId: string) { const user = assertAuthenticatedUser(actor); if (user.id !== ownerId && !isManager(user)) throw new Error("Only the assigned executor or a manager may submit this execution record."); return user; }

export async function submitTechnicianCloseout(actor: AuthenticatedUser | null, packetId: string, value: unknown, input: Dependencies = {}) {
  const context = deps(input), data = normalizeTechnicianCloseout(value), packet = await context.repository.getPacketContext(context.organizationId, packetId.trim()); if (!packet) throw new Error("Inventory Work Packet was not found.");
  const user = owner(actor, packet.task.assignedUserId); if (packet.closeout) throw new Error("Technician closeout already exists for this work packet.");
  const session = packet.workSessions[0] ?? null, id = randomUUID(), now = context.now();
  return context.repository.closeout(command({ actorUserId: user.id, commandType: "SUBMIT_TECHNICIAN_CLOSEOUT", expectedVersion: data.expectedVersion, idempotencyKey: data.idempotencyKey, organizationId: context.organizationId, payload: { outcome: data.outcome, qcState: data.qcState, workPerformed: data.workPerformed, partsDisposition: data.partsDisposition, blockerRecovery: data.blockerRecovery }, reason: data.reason, subjectId: packet.id }), { ...data, id, now, sessionId: session?.id ?? null, submittedByUserId: user.id });
}

export async function offerInventoryHandoff(actor: AuthenticatedUser | null, packetId: string, value: unknown, input: Dependencies = {}) {
  const context = deps(input), data = normalizeHandoffOffer(value), packet = await context.repository.getPacketContext(context.organizationId, packetId.trim()); if (!packet) throw new Error("Inventory Work Packet was not found.");
  const user = owner(actor, packet.task.assignedUserId), id = randomUUID(), now = context.now();
  return context.repository.offerHandoff(command({ actorUserId: user.id, commandType: "OFFER_INVENTORY_WORK_HANDOFF", expectedVersion: data.expectedVersion, idempotencyKey: data.idempotencyKey, organizationId: context.organizationId, payload: { nextAction: data.nextAction, targetAt: data.targetAt.toISOString(), toUserId: data.toUserId }, reason: data.reason, subjectId: packet.id }), { ...data, fromUserId: user.id, id, now });
}

export async function respondInventoryHandoff(actor: AuthenticatedUser | null, handoffId: string, value: unknown, input: Dependencies = {}) {
  const context = deps(input), data = normalizeHandoffResponse(value), user = assertAuthenticatedUser(actor), handoff = await context.repository.getHandoffContext(context.organizationId, handoffId.trim()); if (!handoff) throw new Error("Inventory handoff was not found."); if (handoff.toUserId !== user.id) throw new Error("Only the proposed next owner may answer this handoff.");
  return context.repository.respondHandoff(command({ actorUserId: user.id, commandType: "RESPOND_INVENTORY_WORK_HANDOFF", expectedVersion: 0, idempotencyKey: data.idempotencyKey, organizationId: context.organizationId, payload: { response: data.response, responseReasonCode: data.responseReasonCode }, reason: data.reason, subjectId: handoff.id, subjectType: "INVENTORY_WORK_HANDOFF" }), { expectedHandoffVersion: data.expectedVersion, response: data.response, responseNote: data.responseNote, responseReasonCode: data.responseReasonCode, userId: user.id, now: context.now() });
}
