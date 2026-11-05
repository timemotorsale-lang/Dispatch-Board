import { Prisma, type DocumentLibraryPacketTemplate } from "@prisma/client";
import type { AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";
import { dealOrganization } from "@/server/deal-continuity/identities";
import { resolveCrmNextAccess } from "@/server/crm-next/access";
import { requireUnifiedCrmCustomerReadPolicy } from "@/server/policies/unified-crm-customer-read";
import { isManager } from "@/server/policies/access";
import { validateCashPrintPack } from "@/lib/cash-sale-print-library";
import { SalesDocumentsError } from "./domain";

const workflow = "CRM_NEXT_CASH_PRINT_SELECTION", packetType = "MINNESOTA_RETAIL_SALE_PRINT_SELECTION";
function access(actor: AuthenticatedUser | null) {
  if (!actor?.isActive) throw new SalesDocumentsError("Sign in to use saved print packs.", 401);
  requireUnifiedCrmCustomerReadPolicy(actor);
  if (!resolveCrmNextAccess(actor).allowed) throw new SalesDocumentsError("Print packs are unavailable for this workspace.", 403);
  return actor;
}
function packModel(record: DocumentLibraryPacketTemplate, canEdit: boolean) {
  const data = validateCashPrintPack(record.requirements);
  return { id: record.templateKey.replace("cash-print:", ""), ...data, updatedAt: record.updatedAt.toISOString(), canEdit };
}
const policyWhere = (organizationId: string) => ({ organizationId, templateKey: "cash-print-policy", workflow: `${workflow}_POLICY`, packetType });
async function packPolicy(database: Prisma.TransactionClient, organizationId: string, user: AuthenticatedUser) {
  const record = await database.documentLibraryPacketTemplate.findFirst({ where: policyWhere(organizationId) });
  const settings = record?.requirements as { staffCanEdit?: boolean } | undefined;
  const staffCanEdit = settings?.staffCanEdit !== false;
  return { staffCanEdit, canManage: isManager(user), canEdit: staffCanEdit || isManager(user), updatedAt: record?.updatedAt.toISOString() ?? null };
}
export async function listCashPrintPacks(actor: AuthenticatedUser | null) {
  const user = access(actor);
  const policy = await packPolicy(prisma, dealOrganization(), user);
  const records = await prisma.documentLibraryPacketTemplate.findMany({ where: { organizationId: dealOrganization(), workflow, packetType, status: "ACTIVE" }, orderBy: [{ title: "asc" }, { id: "asc" }], take: 100 });
  return { packs: records.map(record => packModel(record, policy.canEdit)), policy };
}
export async function setCashPrintPackPolicy(actor: AuthenticatedUser | null, value: unknown) {
  const user = access(actor), organizationId = dealOrganization();
  if (!isManager(user)) throw new SalesDocumentsError("Only a manager can change team print pack permissions.", 403);
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  if (typeof raw.staffCanEdit !== "boolean") throw new SalesDocumentsError("Choose whether staff may edit shared packs.");
  const staffCanEdit = raw.staffCanEdit;
  return prisma.$transaction(async database => {
    await database.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${organizationId + ":cash-print-packs"}, 0))`;
    const previous = await database.documentLibraryPacketTemplate.findFirst({ where: policyWhere(organizationId) });
    if ((previous?.updatedAt.toISOString() ?? null) !== raw.updatedAt) throw new SalesDocumentsError("Pack permissions changed. Reload before changing the setting.", 409);
    const data = { staffCanEdit };
    const saved = await database.documentLibraryPacketTemplate.upsert({ where: { organizationId_templateKey: { organizationId, templateKey: "cash-print-policy" } }, create: { ...policyWhere(organizationId), title: "Shared cash print pack permissions", status: "ACTIVE", requirements: data, createdByUserId: user.id, updatedByUserId: user.id }, update: { requirements: data, updatedByUserId: user.id } });
    await database.documentLibraryAuditEvent.create({ data: { organizationId, actorUserId: user.id, subjectType: "CASH_PRINT_PACK_POLICY", subjectId: saved.id, action: "CASH_PRINT_PACK_POLICY_CHANGED", idempotencyKey: crypto.randomUUID(), note: "Updated staff permission to manage shared print packs.", newValue: data } });
    return { policy: { ...data, canManage: true, canEdit: true, updatedAt: saved.updatedAt.toISOString() } };
  });
}
export async function changeCashPrintPack(actor: AuthenticatedUser | null, action: "CREATE" | "UPDATE" | "ARCHIVE", value: unknown) {
  const user = access(actor), organizationId = dealOrganization();
  const raw = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const id = typeof raw.id === "string" ? raw.id : "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new SalesDocumentsError("Use a valid print pack identifier.");
  let data: ReturnType<typeof validateCashPrintPack> | null = null;
  if (action !== "ARCHIVE") { try { data = validateCashPrintPack(raw); } catch (error) { throw new SalesDocumentsError(error instanceof Error ? error.message : "Review the print pack."); } }
  return prisma.$transaction(async database => {
    await database.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${organizationId + ":cash-print-packs"}, 0))`;
    const policy = await packPolicy(database, organizationId, user);
    if (!policy.canEdit) throw new SalesDocumentsError("A manager has restricted shared pack changes to managers. You can still use packs and adjust this print selection.", 403);
    const templateKey = `cash-print:${id}`;
    const previous = await database.documentLibraryPacketTemplate.findFirst({ where: { organizationId, templateKey, workflow, packetType } });
    if (action === "CREATE" && previous) {
      if (previous.status === "ACTIVE" && previous.createdByUserId === user.id && JSON.stringify(validateCashPrintPack(previous.requirements)) === JSON.stringify(data)) return { pack: packModel(previous, policy.canEdit) };
      throw new SalesDocumentsError("This pack was already saved. Refresh the pack list before changing it.", 409);
    }
    if (action !== "CREATE") {
      if (!previous || previous.status !== "ACTIVE") throw new SalesDocumentsError("This print pack is no longer available. Reload the pack list.", 404);
      if (raw.updatedAt !== previous.updatedAt.toISOString()) throw new SalesDocumentsError("Another staff member changed this pack. Reload the list before editing it.", 409);
    } else if (await database.documentLibraryPacketTemplate.count({ where: { organizationId, workflow, packetType, status: "ACTIVE" } }) >= 100) throw new SalesDocumentsError("The team has 100 saved packs. Remove an unused pack before adding another.");
    const saved = previous ? await database.documentLibraryPacketTemplate.update({ where: { id: previous.id }, data: { ...(data ? { title: data.label, requirements: data } : {}), status: action === "ARCHIVE" ? "ARCHIVED" : "ACTIVE", updatedByUserId: user.id } }) : await database.documentLibraryPacketTemplate.create({ data: { organizationId, templateKey, workflow, packetType, status: "ACTIVE", title: data!.label, requirements: data!, createdByUserId: user.id, updatedByUserId: user.id } });
    await database.documentLibraryAuditEvent.create({ data: { organizationId, actorUserId: user.id, subjectType: "CASH_PRINT_SELECTION_PACK", subjectId: saved.id, action: `CASH_PRINT_PACK_${action}`, idempotencyKey: crypto.randomUUID(), note: action === "ARCHIVE" ? "Archived reusable print selection; existing deal packets are unchanged." : "Saved reusable form selection; no customer information or signed documents included.", ...(previous ? { priorValue: previous.requirements as Prisma.InputJsonValue } : {}), newValue: saved.requirements as Prisma.InputJsonValue } });
    return { pack: action === "ARCHIVE" ? null : packModel(saved, policy.canEdit) };
  });
}
