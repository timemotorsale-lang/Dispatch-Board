import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import type { AuthenticatedUser } from "@/server/auth/store";
import { purchaseTeamAccess } from "./purchase-team";
import { validatePurchaseColumnMapping } from "@/lib/purchase-column-mapping";
const organizationId = INITIAL_ORGANIZATION.id;
export async function purchaseTemplates(actor: AuthenticatedUser, locationId: string) {
  await purchaseTeamAccess(actor, locationId);
  return prisma.purchaseImportTemplate.findMany({ where: { organizationId, locationId, createdByUserId: actor.id }, take: 100, orderBy: { name: "asc" }, select: { id: true, name: true, mapping: true } });
}
export async function savePurchaseTemplate(actor: AuthenticatedUser, input: { locationId: string; name: string; mapping: unknown; headers: string[] }) {
  await purchaseTeamAccess(actor, input.locationId);
  if (typeof input.name !== "string" || !input.name.trim() || input.name.length > 80 || !Array.isArray(input.headers)) throw new Error("Enter a template name and valid columns.");
  const mapping = validatePurchaseColumnMapping(input.mapping, input.headers);
  return prisma.$transaction(async tx => {
    const scope = { organizationId, locationId: input.locationId, createdByUserId: actor.id, name: input.name.trim() };
    const existing = await tx.purchaseImportTemplate.findUnique({ where: { organizationId_locationId_createdByUserId_name: scope } });
    if (!existing && await tx.purchaseImportTemplate.count({ where: { organizationId, locationId: input.locationId, createdByUserId: actor.id } }) >= 100) throw new Error("Maximum 100 saved templates per location.");
    const template = await tx.purchaseImportTemplate.upsert({ where: { organizationId_locationId_createdByUserId_name: scope }, create: { ...scope, mapping: mapping as Prisma.InputJsonValue }, update: { mapping: mapping as Prisma.InputJsonValue, version: { increment: 1 } } });
    await tx.enterpriseAuditEvent.create({ data: { organizationId, actorUserId: actor.id, locationId: input.locationId, domain: "VEHICLE_REGISTRY", subjectType: "PURCHASE_IMPORT_TEMPLATE", subjectId: template.id, eventType: "PURCHASE_TEMPLATE_SAVED", reason: "Saved reviewed purchase column mapping", metadata: { name: template.name, version: template.version, mapping }, correlationId: template.id } });
    return { id: template.id, saved: true };
  });
}
