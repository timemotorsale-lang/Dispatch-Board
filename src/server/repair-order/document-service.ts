import { Prisma } from "@prisma/client";
import { assertRepairReadCandidate } from "./read-access";
import { assertAuthenticatedUser } from "@/server/policies/access";
import { createEnterpriseCommandRepository } from "@/server/enterprise-command/repository";
import { assertVehicleCapability, evaluateVehicleCapability } from "@/server/enterprise-command/vehicle-capabilities";
import type { AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";
import { getRepairOrderDetail } from "./service";
import { billingAccess } from "@/server/service-billing/service";
import { hashEnterpriseCommand } from "@/server/enterprise-command/domain";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import type { ServiceDocumentContent } from "./service-documents";

export type ServiceDocumentSearchKind = "all" | "estimates" | "invoices";

export async function searchServiceDocuments(actor: AuthenticatedUser, input: { kind: ServiceDocumentSearchKind; query: string; page: number }) {
  const organizationId = INITIAL_ORGANIZATION.id;
  const [locations, grants] = await Promise.all([
    prisma.location.findMany({ where: { organizationId }, select: { id: true } }),
    createEnterpriseCommandRepository().listCapabilityGrants(actor.id, organizationId)
  ]);
  const allowed = (locationId: string, capability: "REPAIR_ORDER_VIEW" | "SERVICE_BILLING_VIEW") =>
    evaluateVehicleCapability({ actor, grants, locationId, capability }).allowed;
  const repairLocations = locations.map(location => location.id).filter(id => allowed(id, "REPAIR_ORDER_VIEW"));
  const billingLocations = repairLocations.filter(id => allowed(id, "SERVICE_BILLING_VIEW"));
  const scopes: Prisma.Sql[] = [];
  if (input.kind !== "invoices" && repairLocations.length) {
    scopes.push(Prisma.sql`(doc."kind" = 'ESTIMATE' AND ro."locationId" IN (${Prisma.join(repairLocations)}))`);
  }
  if (input.kind !== "estimates" && billingLocations.length) {
    scopes.push(Prisma.sql`(doc."kind" = 'INVOICE' AND ro."locationId" IN (${Prisma.join(billingLocations)}) AND EXISTS (
      SELECT 1 FROM "ServiceInvoice" invoice
      WHERE invoice."id" = doc."sourceId" AND invoice."organizationId" = doc."organizationId"
        AND invoice."repairOrderId" = doc."repairOrderId" AND invoice."status" = 'POSTED'
    ))`);
  }
  if (!scopes.length) return { rows: [], hasNext: false };
  const pageSize = 40;
  const query = input.query.trim().slice(0, 120);
  const rows = await prisma.$queryRaw<Array<{
    id: string; repairOrderId: string; kind: string; createdAt: Date;
    number: string | null; customer: string | null; vehicle: string | null;
  }>>`
    SELECT doc."id", doc."repairOrderId", doc."kind", doc."createdAt", doc."content" ->> 'number' AS "number",
      doc."content" #>> '{identity,customer}' AS "customer", doc."content" #>> '{identity,vehicle}' AS "vehicle"
    FROM "ServiceDocument" doc
    JOIN "RepairOrder" ro ON ro."id" = doc."repairOrderId" AND ro."organizationId" = doc."organizationId"
    WHERE doc."organizationId" = ${organizationId}
      AND (${Prisma.join(scopes, " OR ")})
      AND (${query} = '' OR strpos(lower(concat_ws(' ', doc."content" ->> 'number', ro."repairOrderNumber",
        doc."content" #>> '{identity,customer}', doc."content" #>> '{identity,vehicle}',
        doc."content" #>> '{identity,stockNumber}', doc."content" #>> '{identity,vin}')), lower(${query})) > 0)
    ORDER BY doc."createdAt" DESC, doc."id" DESC
    LIMIT ${pageSize + 1} OFFSET ${(input.page - 1) * pageSize}
  `;
  return { rows: rows.slice(0, pageSize), hasNext: rows.length > pageSize };
}

export async function getRepairDocuments(actor: AuthenticatedUser | null, repairOrderId: string) {
  const order = await getRepairOrderDetail(actor, repairOrderId);
  let financialAccess = false;
  try { await billingAccess(actor, order.locationId); financialAccess = true; }
  catch (error) { if (!(error instanceof Error) || !error.message.startsWith("Vehicle capability required:")) throw error; }
  const documents = await prisma.serviceDocument.findMany({ where: { organizationId: INITIAL_ORGANIZATION.id, repairOrderId, ...(!financialAccess ? { kind: { in: ["RO", "ESTIMATE", "AUTHORIZATION"] } } : {}) }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
  const authors = documents.length ? await prisma.user.findMany({ where: { id: { in: [...new Set(documents.map(document => document.createdByUserId))] } }, select: { id: true, name: true } }) : [];
  const authorNames = new Map(authors.map(author => [author.id, author.name]));
  return { order, documents: documents.map(document => {
    if (hashEnterpriseCommand({ templateVersion: document.templateVersion, content: document.content }) !== document.sha256) throw new Error("Document integrity verification failed. Do not issue this document.");
    return { ...document, createdByName: authorNames.get(document.createdByUserId) ?? "Staff", content: document.content as unknown as ServiceDocumentContent };
  }) };
}

// Printing a saved document does not need the workbench, full history, or author lookups.
export async function getServiceDocumentForPrint(actor: AuthenticatedUser | null, repairOrderId: string, documentId: string) {
  const user = assertAuthenticatedUser(actor), organizationId = INITIAL_ORGANIZATION.id;
  const grants = await createEnterpriseCommandRepository().listCapabilityGrants(user.id, organizationId);
  assertRepairReadCandidate(user, grants);
  const order = await prisma.repairOrder.findFirst({ where: { id: repairOrderId, organizationId }, select: { locationId: true } });
  if (!order) throw new Error("Service document was not found.");
  assertVehicleCapability({ actor: user, grants, locationId: order.locationId, capability: "REPAIR_ORDER_VIEW" });
  const document = await prisma.serviceDocument.findFirst({ where: { id: documentId, repairOrderId, organizationId } });
  if (!document) throw new Error("Service document was not found.");
  if (!["RO", "ESTIMATE", "AUTHORIZATION"].includes(document.kind)) await billingAccess(user, order.locationId);
  if (hashEnterpriseCommand({ templateVersion: document.templateVersion, content: document.content }) !== document.sha256) throw new Error("Document integrity verification failed. Do not issue this document.");
  return { ...document, content: document.content as unknown as ServiceDocumentContent };
}
