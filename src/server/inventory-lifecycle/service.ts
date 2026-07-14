import type { AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";
import { assertAuthenticatedUser } from "@/server/policies/access";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";

export const LIFECYCLE_STAGES = ["PHOTOGRAPHY_MERCHANDISING", "FRONTLINE_READY", "RESERVED_DEAL_PENDING", "SOLD", "DELIVERED", "WHOLESALED_OR_OTHER_DISPOSITION"] as const;
export type LifecycleStage = (typeof LIFECYCLE_STAGES)[number];
const transitions: Record<string, string[]> = { PHOTOGRAPHY_MERCHANDISING: ["FRONTLINE_READY", "WHOLESALED_OR_OTHER_DISPOSITION"], FRONTLINE_READY: ["RESERVED_DEAL_PENDING", "WHOLESALED_OR_OTHER_DISPOSITION"], RESERVED_DEAL_PENDING: ["FRONTLINE_READY", "SOLD"], SOLD: ["DELIVERED", "RESERVED_DEAL_PENDING"], DELIVERED: [], WHOLESALED_OR_OTHER_DISPOSITION: [] };
function actor(user: AuthenticatedUser | null) { return assertAuthenticatedUser(user); }
function text(v: unknown, name: string) { const s = typeof v === "string" ? v.trim() : ""; if (!s) throw new Error(`${name} is required.`); return s; }

export async function saveMerchandisingPackage(user: AuthenticatedUser | null, inventoryUnitId: string, input: { description?: string; priceCents?: number; photoReferences?: string[]; listingChannels?: string[]; reason: string }) {
  actor(user); const reason = text(input.reason, "Reason"); const organizationId = INITIAL_ORGANIZATION.id;
  const unit = await prisma.inventoryUnit.findFirst({ where: { id: inventoryUnitId, organizationId, closedAt: null } }); if (!unit) throw new Error("Inventory unit was not found.");
  if (!["TITLE_DOCUMENT_READINESS", "PHOTOGRAPHY_MERCHANDISING"].includes(unit.lifecycleStage)) throw new Error("Merchandising requires title/document readiness.");
  const pkg = await prisma.inventoryMerchandisingPackage.upsert({ where: { inventoryUnitId }, create: { organizationId, inventoryUnitId, description: input.description?.trim() || null, priceCents: input.priceCents ?? null, photoReferences: input.photoReferences ?? [], listingChannels: input.listingChannels ?? [] }, update: { description: input.description?.trim() || null, priceCents: input.priceCents ?? null, photoReferences: input.photoReferences ?? [], listingChannels: input.listingChannels ?? [], version: { increment: 1 } } });
  return { package: pkg, reason };
}

export async function setFrontlineReady(user: AuthenticatedUser | null, inventoryUnitId: string, input: { expectedVersion: number; reason: string }) {
  const u = actor(user); const reason = text(input.reason, "Reason"); const organizationId = INITIAL_ORGANIZATION.id;
  return prisma.$transaction(async tx => {
    const unit = await tx.inventoryUnit.findFirst({ where: { id: inventoryUnitId, organizationId, closedAt: null }, include: { merchandisingPackage: true } }); if (!unit) throw new Error("Inventory unit was not found.");
    if (unit.version !== input.expectedVersion) throw new Error("Inventory unit version conflict."); if (unit.lifecycleStage !== "PHOTOGRAPHY_MERCHANDISING") throw new Error("Unit is not in merchandising.");
    const pkg = unit.merchandisingPackage; if (!pkg || !pkg.description || !pkg.priceCents || !Array.isArray(pkg.photoReferences) || pkg.photoReferences.length < 5) throw new Error("Frontline readiness requires description, price, and at least five photos.");
    const version = unit.version + 1; await tx.inventoryUnit.update({ where: { id: unit.id }, data: { lifecycleStage: "FRONTLINE_READY", stageStartedAt: new Date(), version, nextAction: "Accept reservation or sale", stateReason: null } }); await tx.inventoryMerchandisingPackage.update({ where: { id: pkg.id }, data: { frontlineReady: true } });
    await tx.inventoryUnitStateEvent.create({ data: { organizationId, inventoryUnitId: unit.id, version, fromStage: unit.lifecycleStage, toStage: "FRONTLINE_READY", fromOperatingState: unit.operatingState, toOperatingState: unit.operatingState, ownerUserId: unit.ownerUserId, locationId: unit.locationId, targetAt: unit.targetAt, nextAction: "Accept reservation or sale", reason, actorUserId: u.id, correlationId: `frontline-${unit.id}-${version}` } }); return { id: unit.id, lifecycleStage: "FRONTLINE_READY", version };
  });
}

export async function recordSaleLifecycle(user: AuthenticatedUser | null, inventoryUnitId: string, input: { eventType: "RESERVE" | "RELEASE_RESERVATION" | "SELL" | "DELIVER" | "REVERSE"; expectedVersion: number; reason: string; reference?: string; metadata?: unknown }) {
  const u = actor(user); const reason = text(input.reason, "Reason"); const organizationId = INITIAL_ORGANIZATION.id;
  return prisma.$transaction(async tx => {
    const unit = await tx.inventoryUnit.findFirst({ where: { id: inventoryUnitId, organizationId, closedAt: null } }); if (!unit) throw new Error("Inventory unit was not found."); if (unit.version !== input.expectedVersion) throw new Error("Inventory unit version conflict.");
    const next = input.eventType === "RESERVE" ? "RESERVED_DEAL_PENDING" : input.eventType === "RELEASE_RESERVATION" || input.eventType === "REVERSE" ? (unit.lifecycleStage === "SOLD" ? "RESERVED_DEAL_PENDING" : "FRONTLINE_READY") : input.eventType === "SELL" ? "SOLD" : "DELIVERED";
    if (!(transitions[unit.lifecycleStage] ?? []).includes(next)) throw new Error(`Cannot ${input.eventType.toLowerCase()} from ${unit.lifecycleStage}.`);
    const version = unit.version + 1; await tx.inventoryUnit.update({ where: { id: unit.id }, data: { lifecycleStage: next as typeof unit.lifecycleStage, stageStartedAt: new Date(), version, nextAction: next === "DELIVERED" ? "Close delivery record" : next === "SOLD" ? "Complete delivery" : "Continue retail sale" } });
    await tx.inventorySaleEvent.create({ data: { organizationId, inventoryUnitId: unit.id, eventType: input.eventType, reference: input.reference, reason, actorUserId: u.id, metadata: (input.metadata && typeof input.metadata === "object" ? input.metadata : {}) as object } }); return { id: unit.id, lifecycleStage: next, version };
  });
}
