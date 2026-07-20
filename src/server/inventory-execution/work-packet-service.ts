import { randomUUID } from "node:crypto";
import type { AuthenticatedUser } from "@/server/auth/store";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { normalizeEnterpriseCommand } from "@/server/enterprise-command/domain";
import { createEnterpriseCommandRepository, type EnterpriseCommandRepository } from "@/server/enterprise-command/repository";
import { assertVehicleCapability } from "@/server/enterprise-command/vehicle-capabilities";
import { assertAuthenticatedUser, isManager } from "@/server/policies/access";
import { normalizeInventoryWorkPacketCreate, normalizeInventoryWorkPacketPosition } from "./work-packet-domain";
import { createInventoryWorkPacketRepository, type InventoryWorkPacketRepository } from "./work-packet-repository";

type Dependencies = { foundationRepository?: EnterpriseCommandRepository; now?: () => Date; organizationId?: string; repository?: InventoryWorkPacketRepository };
function dependencies(input: Dependencies) { return { foundationRepository: input.foundationRepository ?? createEnterpriseCommandRepository(), now: input.now ?? (() => new Date()), organizationId: input.organizationId ?? INITIAL_ORGANIZATION.id, repository: input.repository ?? createInventoryWorkPacketRepository() }; }

async function authorize(actor: AuthenticatedUser | null, capability: "INVENTORY_UNIT_VIEW" | "INVENTORY_UNIT_MANAGE", input: ReturnType<typeof dependencies>, managerOnly = false) {
  const user = assertAuthenticatedUser(actor);
  const grants = await input.foundationRepository.listCapabilityGrants(user.id, input.organizationId);
  assertVehicleCapability({ actor: user, capability, grants, locationId: null, now: input.now() });
  if (managerOnly && !isManager(user)) throw new Error("Manager authority is required to control Inventory Work Packet priority or position.");
  return user;
}

function command(input: { actorUserId: string; commandType: string; expectedVersion: number; idempotencyKey: string; organizationId: string; payload: Record<string, unknown>; reason: string; subjectId: string }) {
  return normalizeEnterpriseCommand({ ...input, domain: "INVENTORY_EXECUTION", locationId: null, subjectType: "INVENTORY_WORK_PACKET" });
}

export async function createInventoryWorkPacket(actor: AuthenticatedUser | null, value: unknown, input: Dependencies = {}) {
  const context = dependencies(input), data = normalizeInventoryWorkPacketCreate(value), user = await authorize(actor, "INVENTORY_UNIT_MANAGE", context, true), id = randomUUID();
  const payload = { ...data, targetAt: data.targetAt.toISOString(), nextCheckAt: data.nextCheckAt?.toISOString() ?? null, escalationAt: data.escalationAt?.toISOString() ?? null };
  return context.repository.create(command({ actorUserId: user.id, commandType: "CREATE_INVENTORY_WORK_PACKET", expectedVersion: 0, idempotencyKey: data.idempotencyKey, organizationId: context.organizationId, payload, reason: data.reason, subjectId: id }), { ...data, createdByUserId: user.id, id });
}

export async function getInventoryWorkPacket(actor: AuthenticatedUser | null, id: string, input: Dependencies = {}) {
  const context = dependencies(input); await authorize(actor, "INVENTORY_UNIT_VIEW", context); const packet = await context.repository.find(context.organizationId, id.trim());
  if (!packet) throw new Error("Inventory Work Packet was not found.");
  return packet;
}

export async function setInventoryWorkPacketPosition(actor: AuthenticatedUser | null, id: string, value: unknown, input: Dependencies = {}) {
  const context = dependencies(input), data = normalizeInventoryWorkPacketPosition(value), user = await authorize(actor, "INVENTORY_UNIT_MANAGE", context, true);
  return context.repository.setPosition(command({ actorUserId: user.id, commandType: "SET_INVENTORY_WORK_PACKET_POSITION", expectedVersion: data.expectedVersion, idempotencyKey: data.idempotencyKey, organizationId: context.organizationId, payload: { state: data.state }, reason: data.reason, subjectId: id.trim() }), data.state);
}
