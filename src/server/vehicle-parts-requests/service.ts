import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";

import type { AuthenticatedUser } from "@/server/auth/store";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { prisma } from "@/server/db/client";
import { assertAuthenticatedUser } from "@/server/policies/access";

const json = (value: unknown) => value as Prisma.InputJsonValue;
const text = (value: unknown, name: string, max = 500) => {
  const result = typeof value === "string" ? value.trim() : "";
  if (!result) throw new Error(`${name} is required.`);
  if (result.length > max) throw new Error(`${name} must be ${max} characters or fewer.`);
  return result;
};
const optional = (value: unknown, max = 500) => {
  const result = typeof value === "string" ? value.trim() : "";
  if (result.length > max) throw new Error(`Text must be ${max} characters or fewer.`);
  return result || null;
};
const positiveInt = (value: unknown, name: string) => {
  const result = Number(value);
  if (!Number.isInteger(result) || result <= 0) throw new Error(`${name} must be a positive whole number.`);
  return result;
};
const nonnegativeInt = (value: unknown, name: string) => {
  const result = Number(value ?? 0);
  if (!Number.isInteger(result) || result < 0) throw new Error(`${name} must be a nonnegative whole number.`);
  return result;
};
const optionalDate = (value: unknown, name: string) => {
  const result = typeof value === "string" && value.trim() ? new Date(value) : null;
  if (result && Number.isNaN(result.getTime())) throw new Error(`${name} must be a valid date and time.`);
  return result;
};

export type VehiclePartsRequest = {
  id: string;
  createdAt: string;
  actorName: string;
  partDescription: string;
  quantity: number;
  status: string;
  vendorOrSource: string | null;
  orderedAt: string | null;
  costCents: number;
  nextAction: string;
  notes: string | null;
  repairOrderId: string | null;
};

export async function listVehiclePartsRequests(actor: AuthenticatedUser | null, vehicleId: string, input: { organizationId?: string } = {}) {
  assertAuthenticatedUser(actor);
  const organizationId = input.organizationId ?? INITIAL_ORGANIZATION.id;
  const vehicle = await prisma.vehicle.findFirst({ where: { id: vehicleId, organizationId }, select: { id: true } });
  if (!vehicle) throw new Error("Vehicle was not found.");
  const events = await prisma.enterpriseAuditEvent.findMany({
    where: { organizationId, domain: "PARTS_OPERATIONS", eventType: { in: ["RAPID_VEHICLE_PARTS_REQUEST_RECORDED", "RAPID_VEHICLE_PARTS_REQUEST_REMOVED"] }, subjectId: vehicle.id, subjectType: "VEHICLE" },
    orderBy: { occurredAt: "desc" },
    take: 100,
    include: { actorUser: { select: { name: true } } }
  });
  const removedIds = new Set(events.flatMap(event => {
    const value = event.newValue && typeof event.newValue === "object" && !Array.isArray(event.newValue) ? event.newValue as Record<string, unknown> : {};
    return event.eventType === "RAPID_VEHICLE_PARTS_REQUEST_REMOVED" && typeof value.requestId === "string" ? [value.requestId] : [];
  }));
  return {
    items: events.filter(event => event.eventType === "RAPID_VEHICLE_PARTS_REQUEST_RECORDED" && !removedIds.has(event.id)).slice(0, 10).map((event): VehiclePartsRequest => {
      const value = event.newValue && typeof event.newValue === "object" && !Array.isArray(event.newValue) ? event.newValue as Record<string, unknown> : {};
      return {
        id: event.id,
        actorName: event.actorUser.name,
        createdAt: event.occurredAt.toISOString(),
        costCents: typeof value.costCents === "number" ? value.costCents : 0,
        nextAction: typeof value.nextAction === "string" ? value.nextAction : "",
        notes: typeof value.notes === "string" && value.notes ? value.notes : null,
        orderedAt: typeof value.orderedAt === "string" && value.orderedAt ? value.orderedAt : null,
        partDescription: typeof value.partDescription === "string" ? value.partDescription : "",
        quantity: typeof value.quantity === "number" ? value.quantity : 1,
        repairOrderId: typeof value.repairOrderId === "string" && value.repairOrderId ? value.repairOrderId : null,
        status: typeof value.status === "string" ? value.status : "NEEDED",
        vendorOrSource: typeof value.vendorOrSource === "string" && value.vendorOrSource ? value.vendorOrSource : null
      };
    })
  };
}

export async function createVehiclePartsRequest(actor: AuthenticatedUser | null, vehicleId: string, value: unknown, input: { organizationId?: string } = {}) {
  const user = assertAuthenticatedUser(actor);
  const organizationId = input.organizationId ?? INITIAL_ORGANIZATION.id;
  const raw = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const partDescription = text(raw.partDescription, "Part description", 500);
  const quantity = positiveInt(raw.quantity ?? 1, "Quantity");
  const status = text(raw.status ?? "NEEDED", "Status", 80).toUpperCase();
  const vendorOrSource = optional(raw.vendorOrSource, 200);
  const orderedAt = optionalDate(raw.orderedAt, "Ordered time")?.toISOString() ?? null;
  const costCents = nonnegativeInt(raw.costCents, "Cost");
  const nextAction = text(raw.nextAction ?? "Order or source this part.", "Next action", 500);
  const notes = optional(raw.notes, 1000);
  const repairOrderId = optional(raw.repairOrderId, 100);
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, organizationId, mergedIntoVehicleId: null },
    select: {
      id: true,
      inventoryUnits: { where: { closedAt: null }, orderBy: { updatedAt: "desc" }, take: 1, select: { locationId: true } }
    }
  });
  if (!vehicle) throw new Error("Vehicle was not found.");
  const payload = { costCents, nextAction, notes, orderedAt, partDescription, quantity, repairOrderId, status, vehicleId: vehicle.id, vendorOrSource };
  const event = await prisma.enterpriseAuditEvent.create({
    data: {
      actorUserId: user.id,
      correlationId: randomUUID(),
      domain: "PARTS_OPERATIONS",
      eventType: "RAPID_VEHICLE_PARTS_REQUEST_RECORDED",
      locationId: vehicle.inventoryUnits[0]?.locationId ?? null,
      metadata: json({ source: "VEHICLE_SIMPLE_PARTS_FORM", workflowBypass: "REQUEST_NOW_CONVERT_TO_PARTS_DEMAND_LATER" }),
      newValue: json(payload),
      organizationId,
      reason: "Record a practical parts request from the vehicle workspace.",
      subjectId: vehicle.id,
      subjectType: "VEHICLE"
    },
    include: { actorUser: { select: { name: true } } }
  });
  return {
    id: event.id,
    actorName: event.actorUser.name,
    costCents,
    createdAt: event.occurredAt.toISOString(),
    nextAction,
    notes,
    orderedAt,
    partDescription,
    quantity,
    repairOrderId,
    status,
    vendorOrSource
  } satisfies VehiclePartsRequest;
}

export async function removeVehiclePartsRequest(actor: AuthenticatedUser | null, vehicleId: string, requestId: string, value: unknown, input: { organizationId?: string } = {}) {
  const user = assertAuthenticatedUser(actor);
  const organizationId = input.organizationId ?? INITIAL_ORGANIZATION.id;
  const raw = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const reason = optional(raw.reason, 500) ?? "Remove mistaken vehicle parts request.";
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, organizationId, mergedIntoVehicleId: null },
    select: {
      id: true,
      inventoryUnits: { where: { closedAt: null }, orderBy: { updatedAt: "desc" }, take: 1, select: { locationId: true } }
    }
  });
  if (!vehicle) throw new Error("Vehicle was not found.");
  const original = await prisma.enterpriseAuditEvent.findFirst({
    where: { id: requestId, organizationId, domain: "PARTS_OPERATIONS", eventType: "RAPID_VEHICLE_PARTS_REQUEST_RECORDED", subjectId: vehicle.id, subjectType: "VEHICLE" },
    select: { id: true, newValue: true }
  });
  if (!original) throw new Error("Parts request was not found.");
  const event = await prisma.enterpriseAuditEvent.create({
    data: {
      actorUserId: user.id,
      correlationId: randomUUID(),
      domain: "PARTS_OPERATIONS",
      eventType: "RAPID_VEHICLE_PARTS_REQUEST_REMOVED",
      locationId: vehicle.inventoryUnits[0]?.locationId ?? null,
      metadata: json({ source: "VEHICLE_SIMPLE_PARTS_FORM", requestId }),
      newValue: json({ reason, requestId, removedAt: new Date().toISOString(), vehicleId: vehicle.id }),
      organizationId,
      priorValue: json(original.newValue),
      reason,
      subjectId: vehicle.id,
      subjectType: "VEHICLE"
    }
  });
  return { id: event.id, removed: true, requestId };
}
