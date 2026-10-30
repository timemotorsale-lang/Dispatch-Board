import { randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import type { AuthenticatedUser } from "@/server/auth/store";
import { assertAuthenticatedUser, isManager } from "@/server/policies/access";
import { hashEnterpriseCommand } from "@/server/enterprise-command/domain";
import { getGenerationSettings } from "@/server/services/app-settings-service";
import { getBoardDateInTimeZone } from "@/server/validation/board-date";

const organizationId = INITIAL_ORGANIZATION.id;
const actions = ["REQUEST_HANDOFF", "ACCEPT_HANDOFF", "DECLINE_HANDOFF", "CANCEL_HANDOFF"] as const;
type Action = typeof actions[number];
function text(raw: Record<string, unknown>, key: string, max = 200, required = false) {
  const value = raw[key] == null ? "" : typeof raw[key] === "string" ? raw[key].trim() : null;
  if (value == null || value.length > max || (required && !value)) throw new Error(`Invalid ${key}.`);
  return value;
}
export function normalizeDispatchCommand(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid dispatch command.");
  const raw = value as Record<string, unknown>, action = text(raw, "action", 40, true) as Action;
  if (!actions.includes(action)) throw new Error("Invalid dispatch action.");
  const idempotencyKey = text(raw, "idempotencyKey", 128, true);
  if (!/^[a-zA-Z0-9_-]{16,128}$/.test(idempotencyKey)) throw new Error("Invalid operation key.");
  if (!Number.isSafeInteger(raw.expectedVersion) || Number(raw.expectedVersion) < 0) throw new Error("Invalid expected version.");
  return { action, idempotencyKey, expectedVersion: Number(raw.expectedVersion),
    date: text(raw, "date", 10, true), taskId: text(raw, "taskId"), nextAction: text(raw, "nextAction", 500),
    receiverUserId: text(raw, "receiverUserId"), handoffId: text(raw, "handoffId"),
    expectedTaskUpdatedAt: text(raw, "expectedTaskUpdatedAt", 40), reason: text(raw, "reason", 500) };
}
export function assertHandoffDecision(input: { action: Action; actorId: string; manager: boolean; senderId: string; receiverId: string; status: string; expectedVersion: number; version: number; reason: string }) {
  if (input.status !== "PENDING" || input.expectedVersion !== input.version) throw new Error("This handoff changed. Reload before deciding.");
  if (input.action === "CANCEL_HANDOFF" ? input.actorId !== input.senderId && !input.manager : input.actorId !== input.receiverId) throw new Error("Only the receiving person can accept or decline this handoff.");
  if (input.action === "CANCEL_HANDOFF" && input.actorId !== input.senderId && !input.reason) throw new Error("Add a short reason for the manager cancellation.");
  if (input.action === "DECLINE_HANDOFF" && !input.reason) throw new Error("Add a short reason for declining.");
}

export async function executeDispatchCommand(actor: AuthenticatedUser | null, value: unknown, dependencies: { database?: PrismaClient; now?: () => Date; loadSettings?: () => Promise<{ timezone: string }> } = {}) {
  const database = dependencies.database ?? prisma;
  const user = assertAuthenticatedUser(actor);
  if (!user.isActive) throw new Error("Active staff access required.");
  const input = normalizeDispatchCommand(value), now = (dependencies.now ?? (() => new Date()))(), settings = await (dependencies.loadSettings ?? getGenerationSettings)();
  const today = getBoardDateInTimeZone(now, settings.timezone);
  if (input.date !== today) throw new Error("Historical views cannot be changed. Return to today to update work.");
  const key = { organizationId, domain: "DISPATCH", commandType: input.action, idempotencyKey: `${user.id}:${input.idempotencyKey}` };
  const requestHash = hashEnterpriseCommand({ actorUserId: user.id, ...input });
  async function replay() {
    const saved = await database.enterpriseCommandLedger.findUnique({ where: { organizationId_domain_commandType_idempotencyKey: key } });
    if (!saved) return null;
    if (saved.requestHash !== requestHash) throw new Error("Operation key was reused with different work. Reload before retrying.");
    return saved.resultSnapshot;
  }
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const existing = await replay();
      if (existing) return existing;
      return await database.$transaction(async tx => {
        let taskId: string | null = input.taskId || null, title = "", state = "";
        let personId = user.id, handoffId: string | null = null;
        const focusId = null;
        const boardDay = await tx.boardDay.upsert({ where: { date: new Date(`${today}T00:00:00Z`) }, update: {}, create: { date: new Date(`${today}T00:00:00Z`) } });
        if (input.action === "REQUEST_HANDOFF") {
          const task = await tx.task.findUniqueOrThrow({ where: { id: input.taskId } });
          const owner = task.ownerUserId ?? task.assignedUserId;
          const repairAssignment = await tx.repairOrderTaskLink.findFirst({ where: { taskId: task.id, assignmentKey: { startsWith: "REPAIR_JOB:" } }, select: { repairOrderId: true } });
          if (repairAssignment) throw new Error("Use Repair dispatch to transfer this repair job so its technician assignment and labor clock stay together.");
          if (owner !== user.id && !isManager(user)) throw new Error("Only the owner or an authorized manager can request a handoff.");
          if (task.status === "COMPLETED" || task.isClaimable) throw new Error("Only owned open work can be handed off.");
          if (task.updatedAt.toISOString() !== input.expectedTaskUpdatedAt) throw new Error("This work changed. Reload before handing it off.");
          if (!input.nextAction || !input.receiverUserId || input.receiverUserId === owner) throw new Error("Choose another person and add the next action.");
          const receiver = await tx.user.findFirst({ where: { id: input.receiverUserId, isActive: true }, select: { id: true } });
          if (!receiver) throw new Error("The receiving team member is not active.");
          if (await tx.dispatchHandoff.findFirst({ where: { taskId: task.id, status: "PENDING" } })) throw new Error("A handoff is already pending for this work.");
          const handoff = await tx.dispatchHandoff.create({ data: { organizationId, taskId: task.id, senderUserId: owner,
            receiverUserId: receiver.id, previousAssignedUserId: task.assignedUserId, nextAction: input.nextAction } });
          handoffId = handoff.id; taskId = task.id; title = task.title; state = "PENDING"; personId = owner;
        } else {
          const handoff = await tx.dispatchHandoff.findFirstOrThrow({ where: { id: input.handoffId, organizationId }, include: { task: true, receiver: { select: { isActive: true } } } });
          assertHandoffDecision({ action: input.action, actorId: user.id, manager: isManager(user), senderId: handoff.senderUserId,
            receiverId: handoff.receiverUserId, status: handoff.status, expectedVersion: input.expectedVersion, version: handoff.version, reason: input.reason });
          state = input.action === "ACCEPT_HANDOFF" ? "ACCEPTED" : input.action === "DECLINE_HANDOFF" ? "DECLINED" : "CANCELLED";
          if (state === "ACCEPTED") {
            if (!handoff.receiver.isActive) throw new Error("The receiving team member is not active.");
            if (handoff.task.status === "COMPLETED" || (handoff.task.ownerUserId ?? handoff.task.assignedUserId) !== handoff.senderUserId || handoff.task.assignedUserId !== handoff.previousAssignedUserId) throw new Error("The work owner or status changed. Cancel this handoff and review the current work.");
            const moved = await tx.task.updateMany({ where: { id: handoff.taskId, updatedAt: handoff.task.updatedAt }, data: {
              ownerUserId: user.id, assignedUserId: user.id, acceptedAt: now, acceptedByUserId: user.id, isClaimable: false,
            } });
            if (moved.count !== 1) throw new Error("This work changed. Reload before accepting.");
            const receiverPresence = await tx.dispatchPresence.findUnique({ where: { userId: user.id } });
            if (!receiverPresence || receiverPresence.businessDate !== today && receiverPresence.state !== "WORKING") {
              await tx.dispatchPresence.upsert({ where: { userId: user.id }, create: { organizationId, userId: user.id, businessDate: today, state: "UNKNOWN", updatedAt: now, version: 1 },
                update: { businessDate: today, state: "UNKNOWN", primaryTaskId: null, primaryFocusId: null, updatedAt: now, version: { increment: 1 } } });
            }
            await tx.dispatchPresence.updateMany({ where: { organizationId, primaryTaskId: handoff.taskId }, data: {
              primaryTaskId: null, primaryFocusId: null, state: "UNKNOWN", nextAction: "", updatedAt: now, version: { increment: 1 },
            } });
          }
          await tx.dispatchHandoff.update({ where: { id: handoff.id }, data: { status: state, decisionReason: input.reason || null, decidedAt: now, version: { increment: 1 } } });
          handoffId = handoff.id; taskId = handoff.taskId; title = handoff.task.title; personId = handoff.senderUserId; input.nextAction = handoff.nextAction;
        }
        const result = { action: input.action, personId, taskId, focusId, handoffId, state };
        const metadata = { ...result, title, businessDate: today, nextAction: input.nextAction, reason: input.reason,
          occurredAt: now.toISOString(), recordedAt: now.toISOString(), ownerUserId: personId };
        await tx.activityEvent.create({ data: { boardDayId: boardDay.id, actorUserId: user.id, taskId,
          eventType: `dispatch.${input.action.toLowerCase()}`, message: title || input.action.replaceAll("_", " ").toLowerCase(), metadata, createdAt: now } });
        const correlationId = randomUUID();
        const command = await tx.enterpriseCommandLedger.create({ data: { ...key, actorUserId: user.id, subjectType: "TEAM_ACTIVITY", subjectId: handoffId ?? personId,
          status: "SUCCEEDED", requestHash, correlationId, expectedVersion: input.expectedVersion, resultingVersion: input.expectedVersion + 1, resultSnapshot: result, completedAt: now } });
        await tx.enterpriseAuditEvent.create({ data: { organizationId, actorUserId: user.id, commandId: command.id, domain: "DISPATCH", subjectType: "TEAM_ACTIVITY",
          subjectId: handoffId ?? personId, eventType: input.action, reason: input.reason || input.nextAction || "Staff updated operational work.", metadata, correlationId } });
        return result;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2002", "P2034"].includes(error.code)) {
        const saved = await replay();
        if (saved) return saved;
        if (error.code === "P2034" && attempt < 2) continue;
        throw new Error("This work or handoff changed. Reload to see its current owner before retrying.");
      }
      throw error;
    }
  }
  throw new Error("This update conflicted with another change. Reload and retry.");
}
