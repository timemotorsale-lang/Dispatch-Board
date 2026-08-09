import { Prisma } from "@prisma/client";
import type { AuthenticatedUser } from "@/server/auth/store";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { prisma } from "@/server/db/client";
import { getVehicleRegistryDetail } from "@/server/vehicle-registry/service";
import { getVehicle360 } from "@/server/vehicle-360/service";
import { isGeneralManager } from "@/server/policies/access";
import { buildVehicleWorkbenchOverview, withVehicleWorkbenchReturn } from "./workbench-algorithms";

type Dependencies = { now?: () => Date; organizationId?: string; packetReader?: (vehicleId: string) => Promise<unknown> };
type RecordItem = Record<string, unknown>;

function record(value: unknown): RecordItem { return value && typeof value === "object" && !Array.isArray(value) ? value as RecordItem : {}; }
function list(value: unknown): RecordItem[] { return Array.isArray(value) ? value.filter((item): item is RecordItem => Boolean(item) && typeof item === "object" && !Array.isArray(item)) : []; }
function text(value: unknown, fallback = "Unavailable") { return typeof value === "string" && value.trim() ? value.trim() : fallback; }
function fallbackDetailReason() { return "Vehicle 360 details are temporarily unavailable. The Workbench is showing the canonical vehicle record so staff can keep moving."; }
function fallbackPacketReason() { return "Inventory work packet data is temporarily unavailable. The Workbench is still available for vehicle map, repair, parts, evidence, and lifecycle navigation."; }

async function fallbackRegistryVehicle(actor: AuthenticatedUser | null, vehicleId: string, input: Dependencies, reason: string) {
  try {
    const detail = await getVehicleRegistryDetail(actor, vehicleId, { now: input.now, organizationId: input.organizationId });
    return registryFallbackView({
      vehicle: detail,
      location: detail.custodyEvents[0]?.location ?? null,
      latestOdometer: detail.odometerObservations[0] ?? null,
      owner: detail.registryRelationships.find((item) => item.effectiveTo == null)?.customer ?? null,
      occurredAt: detail.updatedAt,
      reason
    });
  } catch {
    const vehicle = await prisma.vehicle.findFirst({ where: { id: vehicleId, organizationId: input.organizationId ?? INITIAL_ORGANIZATION.id, mergedIntoVehicleId: null }, select: { id: true, vehicleNumber: true, vin: true, vinState: true, stockNumber: true, year: true, make: true, model: true, color: true, licensePlate: true, status: true, version: true, updatedAt: true } });
    if (!vehicle) throw new Error("Vehicle was not found.");
    return registryFallbackView({ vehicle, location: null, latestOdometer: null, owner: null, occurredAt: vehicle.updatedAt, reason });
  }
}

function registryFallbackView(input: { vehicle: RecordItem; location: RecordItem | null; latestOdometer: RecordItem | null; owner: RecordItem | null; occurredAt: unknown; reason: string }) {
  return {
    summary: {
      vehicle: { id: input.vehicle.id, vehicleNumber: input.vehicle.vehicleNumber, vin: input.vehicle.vin, vinState: input.vehicle.vinState, stockNumber: input.vehicle.stockNumber, year: input.vehicle.year, make: input.vehicle.make, model: input.vehicle.model, color: input.vehicle.color, licensePlate: input.vehicle.licensePlate, status: input.vehicle.status, version: input.vehicle.version },
      owner: input.owner,
      location: input.location,
      stage: "REGISTRY",
      operatingState: input.vehicle.status,
      nextAction: "Review vehicle map and start the right workflow",
      targetAt: null,
      latestOdometer: input.latestOdometer,
      risks: ["VEHICLE_360_DETAIL_UNAVAILABLE"]
    },
    timeline: [{ id: "fallback:registry", occurredAt: input.occurredAt, source: "REGISTRY", type: "WORKBENCH_FALLBACK", title: "Vehicle registry loaded", detail: input.reason, subjectType: "VEHICLE", subjectId: input.vehicle.id }],
    tabs: {
      service: { allowed: true, repairOrders: [] },
      parts: { allowed: true, demands: [], custody: [] },
      documents: { allowed: true, items: [] },
      audit: { allowed: true, items: [] }
    }
  };
}

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
  let view;
  let viewUnavailableReason: string | null = null;
  try {
    view = await getVehicle360(actor, vehicleId, { now: input.now, organizationId: input.organizationId });
  } catch {
    viewUnavailableReason = fallbackDetailReason();
    view = await fallbackRegistryVehicle(actor, vehicleId, input, viewUnavailableReason);
  }
  let packetSource: unknown;
  try {
    packetSource = await (input.packetReader ?? defaultPacketReader)(vehicleId);
  } catch {
    packetSource = { unavailable: true, reason: fallbackPacketReason() };
  }
  const packetRows = Array.isArray(packetSource) ? packetSource.map(record) : [], unavailable = !Array.isArray(packetSource) ? record(packetSource) : null;
  const current = packetRows.find(packet => packet.state === "CURRENT") ?? null, staged = packetRows.find(packet => packet.state === "STAGED") ?? null;
  const orders = view.tabs.service.repairOrders.map(record), demands = view.tabs.parts.demands.map(record), documents = view.tabs.documents.items.map(record);
  const links = { vehicle360: `/vehicles/360/${vehicleId}`, evidence: `/vehicles/360/${vehicleId}?section=documents`, parts: `/vehicles/parts-operations?vehicleId=${vehicleId}`, tasks: `/tasks?vehicleId=${vehicleId}` };
  const work = {
    status: unavailable?.unavailable === true ? "UNAVAILABLE" as const : "CONNECTED" as const,
    unavailableReason: unavailable ? text(unavailable.reason) : viewUnavailableReason,
    current,
    staged,
    other: packetRows.filter(packet => packet !== current && packet !== staged)
  };
  const workOrders = { allowed: view.tabs.service.allowed, items: orders.map(order => ({ ...order, jobs: list(order.repairJobs) })) };
  const parts = { allowed: view.tabs.parts.allowed, demands, custody: view.tabs.parts.custody.map(record) };
  const evidence = { allowed: view.tabs.documents.allowed, items: documents };
  const operation = { ...view.summary, vehicle: undefined };
  const roles = new Set(actor?.roles ?? []);
  const roleLenses = [
    "Overview",
    ...(roles.has("Inventory Manager") ? ["Inventory Manager"] : []),
    ...(roles.has("Mechanic") || roles.has("Technician") ? ["Technician"] : []),
    ...(roles.has("Parts") || roles.has("Parts Manager") || roles.has("Parts Specialist") ? ["Parts"] : []),
    ...(roles.has("Salesperson") || roles.has("Sales Manager") || roles.has("Marketing/Advertisement Manager") || roles.has("Marketing") || roles.has("Advertising") ? ["Sales / Marketing"] : []),
    ...(roles.has("Service Advisor") ? ["Service Advisor"] : []),
    ...(isGeneralManager(actor) ? ["General Manager"] : []),
  ];
  return {
    contractVersion: "inventory-eos-workbench/v1",
    generatedAt: (input.now ?? (() => new Date()))().toISOString(),
    roleLenses,
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
