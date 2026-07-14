import { randomUUID } from "node:crypto";
import type { AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";
import { assertAuthenticatedUser } from "@/server/policies/access";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";

const ORG = INITIAL_ORGANIZATION.id;
const text = (v: unknown, label: string) => { const s = typeof v === "string" ? v.trim() : ""; if (!s) throw new Error(`${label} is required.`); return s; };
const json = (v: unknown) => (v && typeof v === "object" ? v : {});
const cents = (v: unknown, label: string, optional = false) => { if (optional && v == null) return null; const n = Number(v); if (!Number.isInteger(n) || n < 0) throw new Error(`${label} must be a non-negative whole number.`); return n; };
function user(actor: AuthenticatedUser | null) { return assertAuthenticatedUser(actor); }

export async function recordAcquisitionAppraisal(actor: AuthenticatedUser | null, inventoryUnitId: string, input: { conditionSummary: unknown; comparableSnapshot: unknown; evidenceObjectIds: string[]; confidence?: "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN"; estimatedRetailCents?: number; estimatedReconCents?: number; estimatedFeesCents?: number; decisionStatus?: "DRAFT" | "RECOMMENDED" | "APPROVED" | "DECLINED" | "SUPERSEDED" }) {
  const u = user(actor); const unit = await prisma.inventoryUnit.findFirst({ where: { id: text(inventoryUnitId, "Inventory unit"), organizationId: ORG, closedAt: null } }); if (!unit) throw new Error("Inventory unit was not found.");
  const latest = await prisma.inventoryAcquisitionAppraisal.findFirst({ where: { inventoryUnitId: unit.id }, orderBy: { version: "desc" }, select: { version: true } });
  return prisma.inventoryAcquisitionAppraisal.create({ data: { id: randomUUID(), organizationId: ORG, inventoryUnitId: unit.id, version: (latest?.version ?? 0) + 1, conditionSummary: json(input.conditionSummary), comparableSnapshot: json(input.comparableSnapshot), evidenceObjectIds: input.evidenceObjectIds ?? [], confidence: input.confidence ?? "UNKNOWN", estimatedRetailCents: cents(input.estimatedRetailCents, "Estimated retail", true), estimatedReconCents: cents(input.estimatedReconCents, "Estimated recon", true), estimatedFeesCents: cents(input.estimatedFeesCents, "Estimated fees", true), decisionStatus: input.decisionStatus ?? "DRAFT", evaluatedAt: new Date(), createdByUserId: u.id } });
}

export async function createPurchaseAuthorization(actor: AuthenticatedUser | null, inventoryUnitId: string, input: { maximumBidCents: number; authorityLimitCents?: number; evidenceObjectIds: string[]; reason: string; expiresAt?: Date }) {
  user(actor); const unit = await prisma.inventoryUnit.findFirst({ where: { id: text(inventoryUnitId, "Inventory unit"), organizationId: ORG, closedAt: null } }); if (!unit) throw new Error("Inventory unit was not found.");
  const max = cents(input.maximumBidCents, "Maximum bid")!; const limit = cents(input.authorityLimitCents, "Authority limit", true); if (limit != null && max > limit) throw new Error("Maximum bid exceeds the authority limit.");
  const latest = await prisma.inventoryPurchaseAuthorization.findFirst({ where: { inventoryUnitId: unit.id }, orderBy: { version: "desc" }, select: { version: true } });
  return prisma.inventoryPurchaseAuthorization.create({ data: { id: randomUUID(), organizationId: ORG, inventoryUnitId: unit.id, version: (latest?.version ?? 0) + 1, maximumBidCents: max, authorityLimitCents: limit, evidenceObjectIds: input.evidenceObjectIds ?? [], reason: text(input.reason, "Reason"), expiresAt: input.expiresAt } });
}

export async function recordInventoryReceipt(actor: AuthenticatedUser | null, inventoryUnitId: string, input: { source: string; status?: "PLANNED" | "IN_TRANSIT" | "RECEIVED" | "EXCEPTION" | "CANCELLED"; transportReference?: string; carrier?: string; arrivedAt?: Date; damageSummary?: string; keyCount?: number; documentSummary?: unknown; evidenceObjectIds?: string[]; exceptionReason?: string }) {
  const u = user(actor); const unit = await prisma.inventoryUnit.findFirst({ where: { id: text(inventoryUnitId, "Inventory unit"), organizationId: ORG, closedAt: null } }); if (!unit) throw new Error("Inventory unit was not found.");
  if (input.status === "EXCEPTION" && !input.exceptionReason?.trim()) throw new Error("Exception reason is required.");
  return prisma.inventoryReceipt.create({ data: { id: randomUUID(), organizationId: ORG, inventoryUnitId: unit.id, source: text(input.source, "Receipt source"), status: input.status ?? "RECEIVED", transportReference: input.transportReference, carrier: input.carrier, arrivedAt: input.arrivedAt ?? new Date(), damageSummary: input.damageSummary, keyCount: input.keyCount, documentSummary: json(input.documentSummary), evidenceObjectIds: input.evidenceObjectIds ?? [], exceptionReason: input.exceptionReason, recordedByUserId: u.id } });
}

export async function createReconHandoff(actor: AuthenticatedUser | null, inventoryUnitId: string, input: { repairOrderId: string; inspectionVersion: number; planSnapshot: unknown; evidenceObjectIds: string[] }) {
  const u = user(actor); const unit = await prisma.inventoryUnit.findFirst({ where: { id: text(inventoryUnitId, "Inventory unit"), organizationId: ORG, closedAt: null } }); if (!unit) throw new Error("Inventory unit was not found."); if (!Number.isInteger(input.inspectionVersion) || input.inspectionVersion < 1) throw new Error("Inspection version must be positive.");
  return prisma.inventoryReconHandoff.create({ data: { id: randomUUID(), organizationId: ORG, inventoryUnitId: unit.id, repairOrderId: text(input.repairOrderId, "Repair order"), inspectionVersion: input.inspectionVersion, planSnapshot: json(input.planSnapshot), evidenceObjectIds: input.evidenceObjectIds ?? [], handedOffByUserId: u.id } });
}

export async function recordTitleReadiness(actor: AuthenticatedUser | null, inventoryUnitId: string, input: { status: "NOT_STARTED" | "INCOMPLETE" | "READY" | "BLOCKED" | "EXPIRED"; requiredDocuments: unknown; documentStatuses: unknown; evidenceObjectIds: string[]; externalDependencies?: unknown; blockerReasons?: string[]; ownerUserId: string }) {
  const u = user(actor); const unit = await prisma.inventoryUnit.findFirst({ where: { id: text(inventoryUnitId, "Inventory unit"), organizationId: ORG, closedAt: null } }); if (!unit) throw new Error("Inventory unit was not found."); if (input.status === "BLOCKED" && !(input.blockerReasons?.length)) throw new Error("Blocked title readiness requires blocker reasons.");
  const latest = await prisma.inventoryTitleReadiness.findFirst({ where: { inventoryUnitId: unit.id }, orderBy: { version: "desc" }, select: { version: true } }); return prisma.inventoryTitleReadiness.create({ data: { id: randomUUID(), organizationId: ORG, inventoryUnitId: unit.id, version: (latest?.version ?? 0) + 1, status: input.status, requiredDocuments: json(input.requiredDocuments), documentStatuses: json(input.documentStatuses), evidenceObjectIds: input.evidenceObjectIds ?? [], externalDependencies: json(input.externalDependencies), blockerReasons: input.blockerReasons ?? [], ownerUserId: text(input.ownerUserId || u.id, "Owner"), evaluatedAt: new Date() } });
}
