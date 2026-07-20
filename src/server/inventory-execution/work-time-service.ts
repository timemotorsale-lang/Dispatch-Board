import { randomUUID } from "node:crypto";
import type { AuthenticatedUser } from "@/server/auth/store";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { normalizeEnterpriseCommand } from "@/server/enterprise-command/domain";
import { assertAuthenticatedUser, isManager } from "@/server/policies/access";
import { buildWorkTimeGuidance, normalizeWorkSessionCommand, normalizeWorkSessionStart } from "./work-time-domain";
import { createWorkTimeRepository, type WorkTimeRepository } from "./work-time-repository";

type Dependencies = { now?: () => Date; organizationId?: string; repository?: WorkTimeRepository };
function deps(input: Dependencies) { return { now: input.now ?? (() => new Date()), organizationId: input.organizationId ?? INITIAL_ORGANIZATION.id, repository: input.repository ?? createWorkTimeRepository() }; }
function command(input: { actorUserId: string; commandType: string; expectedVersion: number; idempotencyKey: string; organizationId: string; payload: Record<string, unknown>; reason: string; subjectId: string }) { return normalizeEnterpriseCommand({ ...input, domain: "INVENTORY_EXECUTION", locationId: null, subjectType: "INVENTORY_WORK_SESSION" }); }
function assertOwnerOrManager(actor: AuthenticatedUser | null, ownerUserId: string) { const user = assertAuthenticatedUser(actor); if (user.id !== ownerUserId && !isManager(user)) throw new Error("Only the assigned executor or a manager may control this work session."); return user; }

export async function startInventoryWorkSession(actor: AuthenticatedUser | null, packetId: string, value: unknown, input: Dependencies = {}) {
  const context = deps(input), data = normalizeWorkSessionStart(value), packet = await context.repository.getPacketContext(context.organizationId, packetId.trim());
  if (!packet) throw new Error("Inventory Work Packet was not found.");
  const user = assertOwnerOrManager(actor, packet.task.assignedUserId);
  if (packet.state !== "CURRENT") throw new Error("Only current work can be started.");
  if (packet.readiness !== "READY") throw new Error("Work cannot start until required readiness gates are satisfied.");
  const id = randomUUID(), now = context.now();
  const result = await context.repository.start(command({ actorUserId: user.id, commandType: "START_INVENTORY_WORK_SESSION", expectedVersion: 0, idempotencyKey: data.idempotencyKey, organizationId: context.organizationId, payload: { packetId, estimateMinutes: packet.estimatedMinutes }, reason: data.reason, subjectId: id }), { id, packetId, userId: packet.task.assignedUserId, now, estimateMinutes: packet.estimatedMinutes });
  return { ...result, guidance: buildWorkTimeGuidance({ activeSeconds: 0, estimateMinutes: packet.estimatedMinutes }) };
}

export async function controlInventoryWorkSession(actor: AuthenticatedUser | null, sessionId: string, value: unknown, input: Dependencies = {}) {
  const context = deps(input), data = normalizeWorkSessionCommand(value), session = await context.repository.getSessionContext(context.organizationId, sessionId.trim());
  if (!session) throw new Error("Work session was not found.");
  const user = assertOwnerOrManager(actor, session.userId), now = context.now();
  return context.repository.control(command({ actorUserId: user.id, commandType: `${data.action}_INVENTORY_WORK_SESSION`, expectedVersion: data.expectedVersion, idempotencyKey: data.idempotencyKey, organizationId: context.organizationId, payload: { checkpointCode: data.checkpointCode, checkpointNote: data.checkpointNote }, reason: data.reason, subjectId: session.id }), { action: data.action, checkpointCode: data.checkpointCode, checkpointNote: data.checkpointNote, now });
}
