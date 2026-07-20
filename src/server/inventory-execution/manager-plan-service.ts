import { randomUUID } from "node:crypto";
import type { AuthenticatedUser } from "@/server/auth/store";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { normalizeEnterpriseCommand } from "@/server/enterprise-command/domain";
import { assertAuthenticatedUser, isManager } from "@/server/policies/access";
import { normalizeManagerPlan } from "./manager-plan-domain";
import { createManagerPlanRepository, type ManagerPlanRepository } from "./manager-plan-repository";

type Dependencies = { now?: () => Date; organizationId?: string; repository?: ManagerPlanRepository };
export async function publishManagerNextPlan(actor: AuthenticatedUser | null, packetId: string, value: unknown, input: Dependencies = {}) {
  const user = assertAuthenticatedUser(actor); if (!isManager(user)) throw new Error("Manager authority is required to publish the next plan.");
  const organizationId = input.organizationId ?? INITIAL_ORGANIZATION.id, repository = input.repository ?? createManagerPlanRepository(), now = (input.now ?? (() => new Date()))(), data = normalizeManagerPlan(value), context = await repository.getContext(organizationId, packetId.trim()); if (!context) throw new Error("Inventory Work Packet was not found."); if (context.managerPlan) throw new Error("Manager next plan already exists for this work packet.");
  const managerPlanId = randomUUID(), nextTaskId = data.publishNextWork ? randomUUID() : null, nextPacketId = data.publishNextWork ? randomUUID() : null, payload = { decision: data.decision, direction: data.direction, internalNotePresent: Boolean(data.internalNote), nextWork: data.nextWork ? { assignedUserId: data.nextWork.assignedUserId, dueAt: data.nextWork.dueAt.toISOString(), stageCode: data.nextWork.packet.stageCode, title: data.nextWork.title } : null, publishNextWork: data.publishNextWork };
  const command = normalizeEnterpriseCommand({ actorUserId: user.id, commandType: "PUBLISH_INVENTORY_MANAGER_NEXT_PLAN", domain: "INVENTORY_EXECUTION", expectedVersion: data.expectedVersion, idempotencyKey: data.idempotencyKey, locationId: null, organizationId, payload, reason: data.reason, subjectId: context.id, subjectType: "INVENTORY_WORK_PACKET" });
  return repository.publish(command, { ...data, managerId: user.id, managerPlanId, nextPacketId, nextTaskId, now });
}
