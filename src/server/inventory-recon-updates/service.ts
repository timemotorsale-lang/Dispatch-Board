import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";

import type { AuthenticatedUser } from "@/server/auth/store";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { prisma } from "@/server/db/client";
import { assertAuthenticatedUser } from "@/server/policies/access";

const json = (value: unknown) => value as Prisma.InputJsonValue;
const text = (value: unknown, name: string, max = 2000) => {
  const result = typeof value === "string" ? value.trim() : "";
  if (!result) throw new Error(`${name} is required.`);
  if (result.length > max) throw new Error(`${name} must be ${max} characters or fewer.`);
  return result;
};
const optional = (value: unknown, max = 2000) => {
  const result = typeof value === "string" ? value.trim() : "";
  if (result.length > max) throw new Error(`Text must be ${max} characters or fewer.`);
  return result || null;
};

export type ReconProgressUpdate = {
  id: string;
  createdAt: string;
  actorName: string;
  status: string;
  completedWork: string;
  remainingWork: string | null;
  nextAction: string;
  blocker: string | null;
};

export async function listReconProgressUpdates(actor: AuthenticatedUser | null, vehicleId: string, input: { organizationId?: string } = {}) {
  assertAuthenticatedUser(actor);
  const organizationId = input.organizationId ?? INITIAL_ORGANIZATION.id;
  const vehicle = await prisma.vehicle.findFirst({ where: { id: vehicleId, organizationId }, select: { id: true } });
  if (!vehicle) throw new Error("Vehicle was not found.");
  const events = await prisma.enterpriseAuditEvent.findMany({
    where: { organizationId, domain: "SHOP_RECON", eventType: "RAPID_RECON_PROGRESS_UPDATED", subjectId: vehicle.id, subjectType: "VEHICLE" },
    orderBy: { occurredAt: "desc" },
    take: 10,
    include: { actorUser: { select: { name: true } } }
  });
  return {
    items: events.map((event): ReconProgressUpdate => {
      const value = event.newValue && typeof event.newValue === "object" && !Array.isArray(event.newValue) ? event.newValue as Record<string, unknown> : {};
      return {
        id: event.id,
        actorName: event.actorUser.name,
        blocker: typeof value.blocker === "string" && value.blocker ? value.blocker : null,
        completedWork: typeof value.completedWork === "string" ? value.completedWork : "",
        createdAt: event.occurredAt.toISOString(),
        nextAction: typeof value.nextAction === "string" ? value.nextAction : "",
        remainingWork: typeof value.remainingWork === "string" && value.remainingWork ? value.remainingWork : null,
        status: typeof value.status === "string" ? value.status : "IN_PROGRESS"
      };
    })
  };
}

export async function createReconProgressUpdate(actor: AuthenticatedUser | null, vehicleId: string, value: unknown, input: { organizationId?: string } = {}) {
  const user = assertAuthenticatedUser(actor);
  const organizationId = input.organizationId ?? INITIAL_ORGANIZATION.id;
  const raw = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const status = text(raw.status, "Status", 80).toUpperCase();
  const completedWork = text(raw.completedWork, "Completed work", 2000);
  const remainingWork = optional(raw.remainingWork, 2000);
  const nextAction = text(raw.nextAction, "Next action", 500);
  const blocker = optional(raw.blocker, 500);
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, organizationId, mergedIntoVehicleId: null },
    select: {
      id: true,
      inventoryUnits: { where: { closedAt: null }, orderBy: { updatedAt: "desc" }, take: 1, select: { locationId: true } }
    }
  });
  if (!vehicle) throw new Error("Vehicle was not found.");
  const payload = { blocker, completedWork, nextAction, remainingWork, status, vehicleId: vehicle.id };
  const event = await prisma.enterpriseAuditEvent.create({
    data: {
      actorUserId: user.id,
      correlationId: randomUUID(),
      domain: "SHOP_RECON",
      eventType: "RAPID_RECON_PROGRESS_UPDATED",
      locationId: vehicle.inventoryUnits[0]?.locationId ?? null,
      metadata: json({ source: "VEHICLE_RAPID_RECON_UPDATE", workflowBypass: "DOCUMENT_NOW_GOVERN_LATER" }),
      newValue: json(payload),
      organizationId,
      reason: "Record practical recon progress from the vehicle workspace.",
      subjectId: vehicle.id,
      subjectType: "VEHICLE"
    },
    include: { actorUser: { select: { name: true } } }
  });
  return {
    id: event.id,
    actorName: event.actorUser.name,
    blocker,
    completedWork,
    createdAt: event.occurredAt.toISOString(),
    nextAction,
    remainingWork,
    status
  } satisfies ReconProgressUpdate;
}
