import { prisma } from "@/server/db/client";
import { toAuthenticatedUser, type AuthenticatedUser } from "@/server/auth/store";
import { assertAuthenticatedUser } from "@/server/policies/access";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { createEnterpriseCommandRepository } from "@/server/enterprise-command/repository";
import { assertVehicleCapability, evaluateVehicleCapability } from "@/server/enterprise-command/vehicle-capabilities";
const organizationId = INITIAL_ORGANIZATION.id;
const foundation = createEnterpriseCommandRepository();
export async function purchaseTeamAccess(actor: AuthenticatedUser | null, locationId: string) {
  const user = assertAuthenticatedUser(actor), grants = await foundation.listCapabilityGrants(user.id, organizationId);
  if (!locationId || !await prisma.location.findFirst({ where: { id: locationId, organizationId }, select: { id: true } })) throw new Error("Select a valid location.");
  for (const capability of ["VEHICLE_OPERATIONS_VIEW", "INVENTORY_INTAKE_EDIT", "VEHICLE_EVIDENCE_MANAGE"] as const) assertVehicleCapability({ actor: user, capability, grants, locationId, now: new Date() });
  return { user, manager: evaluateVehicleCapability({ actor: user, capability: "INVENTORY_ACQUISITION_MANAGE", grants, locationId, now: new Date() }).allowed };
}
export async function purchaseJobAccess(actor: AuthenticatedUser, id: string) {
  const job = await prisma.purchaseImportJob.findFirst({ where: { id, organizationId } });
  if (!job) return null;
  const access = await purchaseTeamAccess(actor, job.locationId);
  if (!access.manager && job.createdByUserId !== actor.id && job.assignedToUserId !== actor.id) throw new Error("Purchase import is not assigned to this staff account.");
  return job;
}
export async function purchaseReviewers(actor: AuthenticatedUser, locationId: string) {
  if (!(await purchaseTeamAccess(actor, locationId)).manager) throw new Error("Inventory acquisition management permission required.");
  const users = await prisma.user.findMany({ where: { isActive: true }, take: 200, orderBy: { name: "asc" }, include: { userRoles: { include: { role: { include: { roleDuties: { include: { duty: true } } } } } }, userDuties: { include: { duty: true } } } });
  const eligible: { id: string; name: string }[] = [];
  for (const row of users) {
    const candidate = toAuthenticatedUser(row), grants = await foundation.listCapabilityGrants(row.id, organizationId);
    if (["VEHICLE_OPERATIONS_VIEW", "INVENTORY_INTAKE_EDIT", "VEHICLE_EVIDENCE_MANAGE"].every(capability => evaluateVehicleCapability({ actor: candidate, capability: capability as "VEHICLE_OPERATIONS_VIEW" | "INVENTORY_INTAKE_EDIT" | "VEHICLE_EVIDENCE_MANAGE", grants, locationId, now: new Date() }).allowed)) eligible.push({ id: row.id, name: row.name });
  }
  return eligible;
}
export async function reassignPurchaseImport(actor: AuthenticatedUser, id: string, assignedToUserId: string, expectedVersion: number) {
  const job = await purchaseJobAccess(actor, id);
  if (!job) throw new Error("Import not found.");
  const eligible = await purchaseReviewers(actor, job.locationId);
  if (!eligible.some(user => user.id === assignedToUserId)) throw new Error("Select active staff with intake and evidence permissions at this location.");
  if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1) throw new Error("Reload the import before reassigning.");
  await prisma.$transaction(async tx => {
    const changed = await tx.purchaseImportJob.updateMany({ where: { id, organizationId, version: expectedVersion, status: { in: ["NEEDS_REVIEW", "READY", "FAILED"] } }, data: { assignedToUserId, version: { increment: 1 }, status: "NEEDS_REVIEW" } });
    if (changed.count !== 1) throw new Error("Import changed or is processing. Refresh before reassigning.");
    await tx.enterpriseAuditEvent.create({ data: { organizationId, actorUserId: actor.id, locationId: job.locationId, domain: "VEHICLE_REGISTRY", subjectType: "PURCHASE_IMPORT", subjectId: id, eventType: "PURCHASE_DOCUMENT_REASSIGNED", reason: "Inventory manager reassigned purchase review", metadata: { priorAssignee: job.assignedToUserId, assignedToUserId }, correlationId: id } });
  });
  return { assigned: true };
}
export async function purchaseJobQueue(actor: AuthenticatedUser, locationId: string, query: string, status: string, cursor?: string) {
  const access = await purchaseTeamAccess(actor, locationId);
  if (query.length > 100 || status && !["ATTENTION", "NEEDS_REVIEW", "READY", "FAILED", "QUARANTINED", "IMPORTED", "UNDONE", "PROCESSING", "SCANNING"].includes(status)) throw new Error("Invalid queue filter.");
  const where = { organizationId, locationId, status: status === "ATTENTION" ? { notIn: ["IMPORTED", "UNDONE", "BATCH", "RETRIED"] } : status || { not: "BATCH" }, ...(!access.manager ? { OR: [{ createdByUserId: actor.id }, { assignedToUserId: actor.id }] } : {}), ...(query ? { AND: [{ OR: [{ fileName: { contains: query, mode: "insensitive" as const } }, { vin: { contains: query, mode: "insensitive" as const } }] }] } : {}) };
  if (cursor && (cursor.length > 100 || !await prisma.purchaseImportJob.findFirst({ where: { ...where, id: cursor }, select: { id: true } }))) throw new Error("Invalid queue page.");
  const jobs = await prisma.purchaseImportJob.findMany({ where, take: 26, orderBy: [{ createdAt: "desc" }, { id: "desc" }], ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}) });
  const scope = { organizationId, locationId, ...(!access.manager ? { OR: [{ createdByUserId: actor.id }, { assignedToUserId: actor.id }] } : {}) };
  const failed = await prisma.purchaseImportJob.count({ where: { ...scope, status: { in: ["FAILED", "QUARANTINED"] } } });
  const stalled = await prisma.purchaseImportJob.count({ where: { ...scope, status: { in: ["PROCESSING", "SCANNING", "APPLYING"] }, leaseUntil: { lt: new Date() } } });
  const page = jobs.slice(0, 25);
  return { jobs: page.map(job => { const outcome = job.outcome && typeof job.outcome === "object" && !Array.isArray(job.outcome) ? job.outcome as Record<string, unknown> : {}; return { readId: job.id, fileName: job.fileName, vin: job.vin, createdAt: job.createdAt.toISOString(), status: job.status, expired: job.leaseUntil ? job.leaseUntil.getTime() < Date.now() : job.updatedAt.getTime() + 30 * 60_000 < Date.now(), message: job.failureCode ? "Requires staff review" : "", vehicleId: typeof outcome.vehicleId === "string" ? outcome.vehicleId : null, version: job.version, assignedToUserId: job.assignedToUserId }; }), nextCursor: jobs.length > 25 ? page[page.length - 1].id : null, metrics: { failed, stalled }, canManage: access.manager };
}
