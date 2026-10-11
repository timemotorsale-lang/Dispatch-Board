import { prisma } from "@/server/db/client";
import { createPrismaAuthStore } from "@/server/auth/store";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { purchaseTeamAccess } from "./purchase-team";

export function purchaseAlertDue(prior: unknown, failed: number, stalled: number, now: Date) {
  const value = prior && typeof prior === "object" ? prior as Record<string, unknown> : {};
  const deliveredAt = typeof value.deliveredAt === "string" ? Date.parse(value.deliveredAt) : NaN;
  return value.failed !== failed || value.stalled !== stalled || !Number.isFinite(deliveredAt) || deliveredAt + 86400_000 <= now.getTime();
}

export async function validatePurchaseOperationsConfiguration() {
  const email = process.env.IMPORT_OPERATIONS_ACTOR_EMAIL?.trim();
  if (!email) throw new Error("Import operations owner is not configured.");
  const actor = await createPrismaAuthStore(prisma).findUserByEmail(email);
  if (!actor?.isActive) throw new Error("Import operations owner must be active.");
  const endpoint = new URL(process.env.IMPORT_ALERT_WEBHOOK_URL || "");
  if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password) throw new Error("Import alerts require a configured HTTPS endpoint.");
  const organizationId = INITIAL_ORGANIZATION.id;
  const locations = await prisma.location.findMany({ where: { organizationId }, select: { id: true } });
  if (!locations.length) throw new Error("Import operations requires at least one dealership location.");
  for (const location of locations) {
    if (!(await purchaseTeamAccess(actor, location.id)).manager) throw new Error("Operations owner requires acquisition management at every monitored location.");
  }
  return { actor, endpoint, organizationId, locations };
}

export async function evaluatePurchaseOperations() {
  const { actor, endpoint, organizationId, locations } = await validatePurchaseOperationsConfiguration();
  const now = new Date();
  let monitored = 0, alerts = 0, retired = 0;
  for (const location of locations) {
    monitored++;
    alerts += await prisma.$transaction(async tx => {
      const scope = `purchase-operations:${organizationId}:${location.id}`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${scope}))`;
      const failed = await tx.purchaseImportJob.count({ where: { organizationId, locationId: location.id, status: { in: ["FAILED", "QUARANTINED"] }, updatedAt: { gte: new Date(now.getTime() - 86400_000) } } });
      const stalled = await tx.purchaseImportJob.count({ where: { organizationId, locationId: location.id, status: { in: ["SCANNING", "PROCESSING", "APPLYING"] }, leaseUntil: { lt: now } } });
      const prior = await tx.enterpriseAuditEvent.findFirst({ where: { organizationId, locationId: location.id, eventType: "PURCHASE_OPERATIONS_ALERT_DELIVERED" }, orderBy: { createdAt: "desc" } });
      if ((!failed && !stalled) || !purchaseAlertDue(prior?.metadata, failed, stalled, now)) return 0;
      const response = await fetch(endpoint, { method: "POST", redirect: "error", signal: AbortSignal.timeout(5000), headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event: "purchase-import-attention", locationId: location.id, failed, stalled, checkedAt: now.toISOString() }) });
      if (!response.ok) throw new Error("Import alert delivery failed.");
      await tx.enterpriseAuditEvent.create({ data: { organizationId, actorUserId: actor.id, locationId: location.id, domain: "VEHICLE_REGISTRY", subjectType: "PURCHASE_IMPORT_OPERATIONS", subjectId: location.id, eventType: "PURCHASE_OPERATIONS_ALERT_DELIVERED", reason: "Import operations owner notified; review failed and stalled queue", metadata: { failed, stalled, deliveredAt: now.toISOString() }, correlationId: scope } });
      return 1;
    }, { timeout: 15_000 });
    // Cleanup is opt-in; never retire linked evidence, active work, or legal holds.
    if (process.env.IMPORT_RETENTION_CLEANUP_ENABLED !== "true") continue;
    const candidates = await prisma.vehicleEvidenceObject.findMany({ where: { organizationId, storageKey: { startsWith: "purchase-import:" }, status: { not: "DELETED" }, legalHold: false, retentionUntil: { lt: now }, links: { none: {} }, diagnosticLinks: { none: {} }, purchaseImports: { some: { locationId: location.id }, every: { status: { in: ["BATCH", "FAILED", "QUARANTINED", "RETRIED", "UNDONE"] } } } }, select: { id: true }, take: 100 });
    for (const source of candidates) retired += await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "VehicleEvidenceObject" WHERE id = ${source.id} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM "PurchaseImportJob" WHERE "sourceEvidenceId" = ${source.id} FOR UPDATE`;
      const changed = await tx.vehicleEvidenceObject.updateMany({ where: { id: source.id, organizationId, legalHold: false, retentionUntil: { lt: now }, status: { not: "DELETED" }, links: { none: {} }, diagnosticLinks: { none: {} }, purchaseImports: { every: { status: { in: ["BATCH", "FAILED", "QUARANTINED", "RETRIED", "UNDONE"] } } } }, data: { content: new Uint8Array(), status: "DELETED", deletedAt: now, version: { increment: 1 } } });
      if (changed.count) await tx.enterpriseAuditEvent.create({ data: { organizationId, actorUserId: actor.id, locationId: location.id, domain: "VEHICLE_REGISTRY", subjectType: "PURCHASE_IMPORT_SOURCE", subjectId: source.id, eventType: "PURCHASE_SOURCE_RETENTION_EXPIRED", reason: "Opt-in retention policy retired expired unlinked source bytes; audit history retained", metadata: { contentRetired: true }, correlationId: source.id } });
      return changed.count;
    });
  }
  return { monitored, alerts, retired, cleanupEnabled: process.env.IMPORT_RETENTION_CLEANUP_ENABLED === "true" };
}
