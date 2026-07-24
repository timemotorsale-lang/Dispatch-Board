import { Prisma } from "@prisma/client";
import type { AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";
import { getVehicle360 } from "@/server/vehicle-360/service";
import { buildVehicleWorkbenchOverview, withVehicleWorkbenchReturn } from "./workbench-algorithms";

type Dependencies = { now?: () => Date; organizationId?: string; packetReader?: (vehicleId: string) => Promise<unknown> };
type RecordItem = Record<string, unknown>;

function record(value: unknown): RecordItem { return value && typeof value === "object" && !Array.isArray(value) ? value as RecordItem : {}; }
function list(value: unknown): RecordItem[] { return Array.isArray(value) ? value.filter((item): item is RecordItem => Boolean(item) && typeof item === "object" && !Array.isArray(item)) : []; }
function text(value: unknown, fallback = "Unavailable") { return typeof value === "string" && value.trim() ? value.trim() : fallback; }

async function defaultPacketReader(vehicleId: string) {
  const packetDelegate = (prisma as Partial<Pick<typeof prisma, "inventoryWorkPacket">>)
    .inventoryWorkPacket;

  if (!packetDelegate) {
    return {
      unavailable: true,
      reason: "Inventory execution data is temporarily unavailable while the data client is updated."
    };
  }

  try {
    return await packetDelegate.findMany({ where: { vehicleId, state: { notIn: ["COMPLETED", "CANCELLED"] } }, include: { task: { select: { id: true, title: true, description: true, assignedUser: { select: { id: true, name: true } }, status: true, dueAt: true, checklistItems: { orderBy: { sortOrder: "asc" }, select: { id: true, label: true, isRequired: true, completed: true } } }, workSessions: { where: { status: { in: ["ACTIVE", "PAUSED"] } }, orderBy: { startedAt: "desc" }, take: 1 }, closeout: true, handoffs: { orderBy: { offeredAt: "desc" }, take: 5 } } }, orderBy: [{ state: "asc" }, { targetAt: "asc" }] });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2021" || error.code === "P2022")) return { unavailable: true, reason: "Inventory Work Packet migration is not applied in this environment." };
    throw error;
  }
}

export async function getVehicleExecutionWorkbench(actor: AuthenticatedUser | null, vehicleId: string, input: Dependencies = {}) {
  const view = await getVehicle360(actor, vehicleId, { now: input.now, organizationId: input.organizationId });
  const packetSource = await (input.packetReader ?? defaultPacketReader)(vehicleId), packetRows = Array.isArray(packetSource) ? packetSource.map(record) : [], unavailable = !Array.isArray(packetSource) ? record(packetSource) : null;
  const current = packetRows.find(packet => packet.state === "CURRENT") ?? null, staged = packetRows.find(packet => packet.state === "STAGED") ?? null;
  const orders = view.tabs.service.repairOrders.map(record), demands = view.tabs.parts.demands.map(record), documents = view.tabs.documents.items.map(record);
  const links = { vehicle360: `/vehicles/360/${vehicleId}`, evidence: `/vehicles/360/${vehicleId}?section=documents`, parts: `/vehicles/parts-operations?vehicleId=${vehicleId}`, tasks: `/tasks?vehicleId=${vehicleId}` };
  const work = {
    status: unavailable?.unavailable === true ? "UNAVAILABLE" as const : "CONNECTED" as const,
    unavailableReason: unavailable ? text(unavailable.reason) : null,
    current,
    staged,
    other: packetRows.filter(packet => packet !== current && packet !== staged)
  };
  const workOrders = { allowed: view.tabs.service.allowed, items: orders.map(order => ({ ...order, jobs: list(order.repairJobs) })) };
  const parts = { allowed: view.tabs.parts.allowed, demands, custody: view.tabs.parts.custody.map(record) };
  const evidence = { allowed: view.tabs.documents.allowed, items: documents };
  const operation = { ...view.summary, vehicle: undefined };
  return {
    contractVersion: "inventory-eos-workbench/v1",
    generatedAt: (input.now ?? (() => new Date()))().toISOString(),
    identity: view.summary.vehicle,
    operation,
    overview: buildVehicleWorkbenchOverview({ activity: view.timeline, evidence, identity: view.summary.vehicle, links, operation, parts, work, workOrders }),
    work,
    workOrders,
    parts,
    evidence,
    activity: view.timeline,
    audit: { allowed: view.tabs.audit.allowed, items: view.tabs.audit.items.map(record) },
    links: {
      evidence: withVehicleWorkbenchReturn(links.evidence, vehicleId),
      parts: withVehicleWorkbenchReturn(links.parts, vehicleId),
      tasks: withVehicleWorkbenchReturn(links.tasks, vehicleId),
      vehicle360: withVehicleWorkbenchReturn(links.vehicle360, vehicleId)
    }
  };
}

export type VehicleExecutionWorkbenchProjection = Awaited<ReturnType<typeof getVehicleExecutionWorkbench>>;
