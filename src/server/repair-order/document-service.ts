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
