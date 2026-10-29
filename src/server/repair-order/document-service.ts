import { assertAuthenticatedUser } from "@/server/policies/access";
import { createEnterpriseCommandRepository } from "@/server/enterprise-command/repository";
import { assertVehicleCapability } from "@/server/enterprise-command/vehicle-capabilities";
import type { AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";
import { getRepairOrderDetail } from "./service";
import { billingAccess } from "@/server/service-billing/service";
import { hashEnterpriseCommand } from "@/server/enterprise-command/domain";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import type { ServiceDocumentContent } from "./service-documents";

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
  assertVehicleCapability({ actor: user, grants, locationId: null, capability: "REPAIR_ORDER_VIEW" });
  const order = await prisma.repairOrder.findFirst({ where: { id: repairOrderId, organizationId }, select: { locationId: true } });
  if (!order) throw new Error("Service document was not found.");
  assertVehicleCapability({ actor: user, grants, locationId: order.locationId, capability: "REPAIR_ORDER_VIEW" });
  const document = await prisma.serviceDocument.findFirst({ where: { id: documentId, repairOrderId, organizationId } });
  if (!document) throw new Error("Service document was not found.");
  if (!["RO", "ESTIMATE", "AUTHORIZATION"].includes(document.kind)) await billingAccess(user, order.locationId);
  if (hashEnterpriseCommand({ templateVersion: document.templateVersion, content: document.content }) !== document.sha256) throw new Error("Document integrity verification failed. Do not issue this document.");
  return { ...document, content: document.content as unknown as ServiceDocumentContent };
}
