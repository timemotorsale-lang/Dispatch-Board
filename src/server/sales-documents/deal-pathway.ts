import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/client";
import type { AuthenticatedUser } from "@/server/auth/store";
import { isManager } from "@/server/policies/access";
import { dealOrganization } from "@/server/deal-continuity/identities";
import { resolveDocumentStorageRuntimeFromEnv } from "@/server/document-library/storage-config";
import { isSalesDocumentPathway } from "@/lib/sales-document-pathways";
import { requireOwnDealUser } from "@/server/deal-continuity/own-deal-access";
import { SalesDocumentsError } from "./domain";

const object = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
export function pathwayChangeAccess() { return process.env.DEAL_PATHWAY_CHANGE_ACCESS?.trim().toUpperCase() === "MANAGERS_ONLY" ? "MANAGERS_ONLY" : "STAFF"; }
export async function changeDealPathway(actor: AuthenticatedUser | null, raw: Record<string, unknown>) {
  const user = requireOwnDealUser(actor), organizationId = resolveDocumentStorageRuntimeFromEnv().organizationId;
  if (pathwayChangeAccess() === "MANAGERS_ONLY" && !isManager(user)) throw new SalesDocumentsError("Pathway changes are currently configured for managers only.", 403);
  const id = typeof raw.id === "string" ? raw.id : "", target = String(raw.pathway ?? "");
  if (raw.reason != null && typeof raw.reason !== "string") throw new SalesDocumentsError("The optional reason must be text.");
  const reason = typeof raw.reason === "string" ? raw.reason.trim() : "";
  if (!id || !isSalesDocumentPathway(target) || !Number.isInteger(raw.revision)) throw new SalesDocumentsError("Choose the new pathway for a saved deal.");
  if (reason.length > 1000) throw new SalesDocumentsError("Keep the optional reason to 1,000 characters or fewer.");
  return prisma.$transaction(async database => {
    await database.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${dealOrganization() + ":deal-context:" + id}, 0))`;
    const draft = await database.dealDeskDraft.findFirst({ where: { id, organizationId, ...(isManager(user) ? {} : { ownerUserId: user.id }) } });
    if (!draft) throw new SalesDocumentsError("This saved deal is unavailable to your account.", 404);
    if (draft.pathway === target) return { id, pathway: target, status: draft.status, revision: draft.revision, unchanged: true };
    if (draft.revision !== raw.revision) throw new SalesDocumentsError("This deal changed. Refresh its details before changing the pathway.", 409);
    const nextStatus = ["SOLD", "COMPLETED", "PENDING"].includes(draft.status) ? "PENDING" : "IN_PROGRESS";
    const activeAssignment = await database.vehicleUseBooking.count({ where: { contextId: id, status: { in: ["RESERVED", "CHECKED_OUT", "RETURNED_REVIEW"] } } });
    const snapshot = object(draft.snapshot), jackets = object(snapshot.jackets), references = object(snapshot.references);
    const jacketIds = Object.values(jackets).filter((value): value is string => typeof value === "string");
    const refs = Object.values(references).filter((value): value is string => typeof value === "string");
    const protectedPacket = await database.salesDocumentJacket.findFirst({ where: { organizationId, OR: [{ id: { in: jacketIds } }, { dealReference: { in: refs } }], AND: [{ OR: [{ state: { not: "WORKING" } }, { versions: { some: {} } }, { packet: { auditEvents: { some: { action: "DEAL_FINANCIAL_RECORDED" } } } }, { packet: { documents: { some: { document: { source: { not: "GENERATED" }, OR: [{ status: "ACCEPTED" }, { classificationSnapshot: { path: ["signed"], equals: true } }] } } } } }] }] }, select: { id: true } });

    const targetJacket = jackets[target] ?? null;
    const nextJackets = { ...jackets }; delete nextJackets[target];
    const nextReferences = Object.fromEntries(Object.entries(references).filter(([key]) => key !== target && !key.includes(`:${target}:`)));
    const next = { ...snapshot, "desk:workflowId": target, "desk:executionOpen": false, ...(activeAssignment ? { "desk:assignmentPathway": snapshot["desk:assignmentPathway"] ?? draft.pathway } : {}), "desk:form": { ...object(snapshot["desk:form"]), amount: "" }, jackets: nextJackets, references: nextReferences };
    delete (next as Record<string, unknown>)["desk:selectedPresetId"];
    const history = Array.isArray(draft.statusHistory) ? draft.statusHistory : [];
    const changed = await database.dealDeskDraft.updateMany({ where: { id, organizationId, revision: draft.revision, pathway: draft.pathway, status: draft.status }, data: { pathway: target, status: nextStatus, snapshot: next as Prisma.InputJsonValue, revision: { increment: 1 }, statusHistory: [...history, { action: "PATHWAY_CHANGED", from: draft.status, to: nextStatus, fromPathway: draft.pathway, toPathway: target, actorId: user.id, actorName: user.name, reason, at: new Date().toISOString(), priorTargetJacketId: targetJacket, previousAmount: object(snapshot["desk:form"]).amount ?? null, preservedPacketId: protectedPacket?.id ?? null, activeAssignmentPreserved: Boolean(activeAssignment) }] as Prisma.InputJsonValue } });
    if (changed.count !== 1) throw new SalesDocumentsError("This deal changed. Refresh its details before continuing.", 409);
    return { id, pathway: target, status: nextStatus, revision: draft.revision + 1, unchanged: false };
  });
}
