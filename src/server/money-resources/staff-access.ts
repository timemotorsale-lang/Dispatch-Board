import { randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import type { AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";
import { isGeneralManager } from "@/server/policies/access";
import { MoneyError, text } from "@/lib/money-resources";
import { moneyAccess } from "./service";

async function managerScope(actor: AuthenticatedUser | null, database: Prisma.TransactionClient) {
  if (!actor?.isActive) throw new MoneyError("Sign in with an active staff account.", 401);
  if (!isGeneralManager(actor)) throw new MoneyError("Only the General Manager can assign staff company access.", 403);
  return moneyAccess(actor, database);
}

export async function staffCompanyAccess(actor: AuthenticatedUser | null, userId = "", database: Prisma.TransactionClient = prisma) {
  const access = await managerScope(actor, database);
  const now = new Date();
  const [users, locations, grants] = await Promise.all([
    database.user.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    database.location.findMany({ where: { organizationId: access.organizationId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    userId ? database.userLocationAccess.findMany({ where: { userId, validFrom: { lte: now }, OR: [{ validTo: null }, { validTo: { gte: now } }] }, select: { location: { select: { organizationId: true, name: true } } } }) : []
  ]);
  if (userId && !users.some(user => user.id === userId)) throw new MoneyError("Choose an active staff account.", 404);
  const otherCompany = grants.some(grant => grant.location.organizationId !== access.organizationId);
  return { users, locations, userId, status: !userId ? "SELECT_STAFF" : otherCompany ? "OTHER_COMPANY" : grants.length ? "ASSIGNED" : "MISSING", assignedLocations: grants.filter(grant => grant.location.organizationId === access.organizationId).map(grant => grant.location.name) };
}

export async function assignStaffCompanyAccess(actor: AuthenticatedUser | null, value: Record<string, unknown>, database: PrismaClient = prisma) {
  const userId = text(value.userId, 100), locationId = text(value.locationId, 100), reason = text(value.reason, 1000);
  if (!userId || !locationId || reason.length < 10) throw new MoneyError("Choose staff, a company location and a reason of at least 10 characters.");
  return database.$transaction(async transaction => {
    const access = await managerScope(actor, transaction);
    const model = await staffCompanyAccess(actor, userId, transaction);
    if (!model.locations.some(location => location.id === locationId)) throw new MoneyError("Choose a location in your authorized company.", 403);
    if (model.status === "OTHER_COMPANY") throw new MoneyError("This staff account has another company assignment. Review it separately; no access was changed.", 409);
    if (model.status === "ASSIGNED") return { message: "This staff account already has active company access. No permissions changed." };
    const existing = await transaction.userLocationAccess.findUnique({ where: { userId_locationId: { userId, locationId } } });
    if (existing) throw new MoneyError("An expired or future assignment exists. Review its dates separately; it was not overwritten.", 409);
    const created = await transaction.userLocationAccess.createMany({ data: { userId, locationId, validFrom: new Date(), canViewSchedule: false, canParticipate: false, canOwnAppointments: false, canManageAppointments: false, canViewLimitedData: false }, skipDuplicates: true });
    if (created.count !== 1) throw new MoneyError("This assignment changed elsewhere. Reload and review before trying again.", 409);
    await transaction.enterpriseAuditEvent.create({ data: { organizationId: access.organizationId, actorUserId: access.actor.id, domain: "TEAM_SECURITY", subjectType: "USER", subjectId: userId, eventType: "STAFF_COMPANY_ACCESS_GRANTED", reason, correlationId: randomUUID(), metadata: { locationId, source: "STAFF_COMPANY_ACCESS_REPAIR", schedulingPermissionsAdded: false, managerPowersAdded: false } } });
    return { message: "Company access assigned. The staff member can reload Money & Resources. No manager or scheduling permissions were added." };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
