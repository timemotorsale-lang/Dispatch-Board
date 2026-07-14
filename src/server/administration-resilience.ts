import { prisma } from "@/server/db/client";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import type { AuthenticatedUser } from "@/server/auth/store";
import { assertAuthenticatedUser, isManager } from "@/server/policies/access";

function authorize(actor: AuthenticatedUser | null) {
  const user = assertAuthenticatedUser(actor);
  if (!isManager(user)) throw new Error("Manager authorization is required.");
  return user;
}

/** Retention/legal-hold/privacy work queue. Deletion remains governed by the evidence service. */
export async function getRetentionPrivacyOperations(actor: AuthenticatedUser | null, input: { organizationId?: string; now?: Date } = {}) {
  authorize(actor);
  const organizationId = input.organizationId ?? INITIAL_ORGANIZATION.id;
  const now = input.now ?? new Date();
  const [due, held, quarantined, deleted] = await Promise.all([
    prisma.vehicleEvidenceObject.findMany({ where: { organizationId, status: { not: "DELETED" }, retentionUntil: { lte: now } }, orderBy: { retentionUntil: "asc" }, take: 200, select: { id: true, fileName: true, retentionUntil: true, legalHold: true, status: true, accessLevel: true, createdAt: true } }),
    prisma.vehicleEvidenceObject.count({ where: { organizationId, status: { not: "DELETED" }, legalHold: true } }),
    prisma.vehicleEvidenceObject.count({ where: { organizationId, status: "QUARANTINED" } }),
    prisma.vehicleEvidenceObject.count({ where: { organizationId, status: "DELETED" } })
  ]);
  return { evaluatedAt: now.toISOString(), policy: { deletionRequiresExpiredRetentionAndNoLegalHold: true, auditEvidencePreserved: true }, summary: { dueForDisposition: due.length, legalHolds: held, quarantined, deleted }, dueForDisposition: due.map((item) => ({ ...item, retentionUntil: item.retentionUntil.toISOString(), createdAt: item.createdAt.toISOString(), disposition: item.legalHold ? "HOLD_BLOCKED" : "READY_FOR_REVIEW" })) };
}

/** Background operations console projection: outbox, dead letters, and projection lag. */
export async function getBackgroundOperationsConsole(actor: AuthenticatedUser | null, input: { organizationId?: string; now?: Date; limit?: number } = {}) {
  authorize(actor);
  const organizationId = input.organizationId ?? INITIAL_ORGANIZATION.id;
  const now = input.now ?? new Date();
  const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
  const [pending, deadLetters, checkpoints] = await Promise.all([
    prisma.enterpriseOutboxMessage.findMany({ where: { organizationId, status: { in: ["PENDING", "PROCESSING"] } }, orderBy: { createdAt: "asc" }, take: limit, select: { id: true, topic: true, messageKey: true, status: true, attemptCount: true, maxAttempts: true, nextAttemptAt: true, lockedAt: true, lastError: true, createdAt: true } }),
    prisma.enterpriseOutboxMessage.findMany({ where: { organizationId, status: "DEAD_LETTER" }, orderBy: { updatedAt: "desc" }, take: limit, select: { id: true, topic: true, messageKey: true, status: true, attemptCount: true, maxAttempts: true, lastError: true, updatedAt: true } }),
    prisma.enterpriseProjectionCheckpoint.findMany({ where: { organizationId }, orderBy: { lagSeconds: "desc" }, select: { id: true, locationId: true, projectionCode: true, lagSeconds: true, lastSuccessAt: true, lastFailureAt: true, lastError: true, updatedAt: true } })
  ]);
  return { evaluatedAt: now.toISOString(), pending: pending.map((item) => ({ ...item, nextAttemptAt: item.nextAttemptAt.toISOString(), lockedAt: item.lockedAt?.toISOString() ?? null, createdAt: item.createdAt.toISOString() })), deadLetters, projections: checkpoints.map((item) => ({ ...item, lastSuccessAt: item.lastSuccessAt?.toISOString() ?? null, lastFailureAt: item.lastFailureAt?.toISOString() ?? null, updatedAt: item.updatedAt.toISOString(), state: item.lastFailureAt && (!item.lastSuccessAt || item.lastFailureAt > item.lastSuccessAt) ? "FAILED" : item.lagSeconds > 60 ? "LAGGING" : "HEALTHY" })) };
}
