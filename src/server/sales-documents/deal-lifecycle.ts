import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/client";
import type { AuthenticatedUser } from "@/server/auth/store";
import { resolveDocumentStorageRuntimeFromEnv } from "@/server/document-library/storage-config";
import { createSalesDocumentJacket, requireSalesDocumentsUser, updateSalesDocumentJacket } from "./service";
import { SalesDocumentsError } from "./domain";
import { dealGroup } from "@/lib/deal-dashboard";
import { canManageDeals } from "./dashboard-operations";

const object = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
export async function manageDealLifecycle(actor: AuthenticatedUser | null, raw: Record<string, unknown>) {
  const action = String(raw.action || "");
  if (!["MARK_SOLD", "PREPARE_PAPERWORK", "FINISH", "REOPEN", "REQUEST_UNWIND"].includes(action)) throw new SalesDocumentsError("Choose a supported deal action.");
  const user = requireSalesDocumentsUser(actor, ["REOPEN", "REQUEST_UNWIND"].includes(action));
  if (typeof raw.id !== "string" || !Number.isInteger(raw.revision)) throw new SalesDocumentsError("Refresh this deal before continuing.", 409);
  const organizationId = resolveDocumentStorageRuntimeFromEnv().organizationId;
  const note = typeof raw.note === "string" ? raw.note.trim().slice(0, 1000) : "";
  if (["REOPEN", "REQUEST_UNWIND"].includes(action) && note.length < 10) throw new SalesDocumentsError("Enter a reason of at least 10 characters. The original signed packet will remain preserved.");
  return prisma.$transaction(async database => {
    const draft = await database.dealDeskDraft.findFirst({ where: { id: raw.id as string, organizationId, ...(!canManageDeals(user) ? { ownerUserId: user.id } : {}) } });
    if (!draft) throw new SalesDocumentsError("This deal is not available to your account.", 404);
    if (!["SALES", "LEASING"].includes(dealGroup(draft.pathway))) throw new SalesDocumentsError("Use the return or completion workflow for this revenue pathway.");
    const snapshot = object(draft.snapshot), jacketIds = object(snapshot.jackets), references = Object.values(object(snapshot.references));
    const linkedId = typeof raw.jacketId === "string" && raw.jacketId ? raw.jacketId : jacketIds[draft.pathway];
    const jacket = linkedId || references.length ? await database.salesDocumentJacket.findFirst({ where: { organizationId, pathway: draft.pathway, ...(typeof linkedId === "string" ? { id: linkedId } : { dealReference: { in: references.filter((value): value is string => typeof value === "string") } }) }, include: { versions: { orderBy: { version: "asc" }, select: { disposition: true, finalizedAt: true } } } }) : null;
    if (jacket && ((jacketIds[draft.pathway] !== jacket.id && !references.includes(jacket.dealReference)) || (draft.customerId && jacket.customerId !== draft.customerId))) throw new SalesDocumentsError("Open the packet linked to this existing deal.", 409);
    if (["ARCHIVED", "CANCELLED", "LOST"].includes(draft.status)) throw new SalesDocumentsError("This deal is inactive. Review its history before making lifecycle changes.", 409);
    if (jacket?.state === "UNWIND_PENDING" && action !== "REQUEST_UNWIND") throw new SalesDocumentsError("An unwind review is pending. No refund or funds reversal has been confirmed.", 409);
    if (action === "MARK_SOLD" && draft.status === "SOLD") return { id: draft.id, jacketId: jacket?.id ?? null, revision: draft.revision, status: draft.status, state: jacket?.state ?? null };
    if (action === "PREPARE_PAPERWORK" && jacket && jacketIds[draft.pathway] === jacket.id) return { id: draft.id, jacketId: jacket.id, revision: draft.revision, status: draft.status, state: jacket.state };
    if ((action === "FINISH" && draft.status === "SOLD" && jacket?.state === "CLOSED") || (action === "REQUEST_UNWIND" && jacket?.state === "UNWIND_PENDING")) return { id: draft.id, jacketId: jacket.id, status: draft.status, state: jacket.state };
    if (draft.revision !== raw.revision) throw new SalesDocumentsError("This deal changed in another window. Refresh this panel before continuing.", 409);
    if (["MARK_SOLD", "PREPARE_PAPERWORK"].includes(action)) {
      if (!draft.customerName?.trim() || /^(Customer not selected|Customer not captured)$/i.test(draft.customerName.trim()) || !draft.vehicleReference?.trim() || draft.vehicleReference === "Vehicle not assigned") throw new SalesDocumentsError("Select the customer and vehicle on this existing deal first. Signed paperwork can be added after it is sold.");
      if (action === "PREPARE_PAPERWORK" && draft.status !== "SOLD") throw new SalesDocumentsError("Mark this deal sold first, then complete its paperwork.", 409);
      const history = Array.isArray(draft.statusHistory) ? draft.statusHistory : [], at = new Date().toISOString();
      const changed = await database.dealDeskDraft.updateMany({ where: { id: draft.id, organizationId, ownerUserId: draft.ownerUserId, revision: Number(raw.revision) }, data: { ...(action === "MARK_SOLD" ? { status: "SOLD" } : {}), revision: { increment: 1 }, statusHistory: [...history, { from: draft.status, to: action === "MARK_SOLD" ? "SOLD" : draft.status, action, actorId: user.id, actorName: user.name, at, effectiveAt: action === "MARK_SOLD" ? jacket?.versions.find(version => version.disposition === "CLOSED")?.finalizedAt.toISOString() || at : at, reason: note || (action === "MARK_SOLD" ? "Deal marked sold. Paperwork remains a separate follow-up; no funding or document completion is implied." : "Prepared paperwork checklist on the existing sold deal.") }] as Prisma.InputJsonValue } });
      if (changed.count !== 1) throw new SalesDocumentsError("This deal changed in another window. Refresh this panel before continuing.", 409);
      if (action === "MARK_SOLD") return { id: draft.id, jacketId: jacket?.id ?? null, revision: draft.revision + 1, status: "SOLD", state: jacket?.state ?? null };
      const form = object(snapshot["desk:form"]), facts = object(snapshot[`${draft.pathway}:vehicleFacts`]);
      const key = `crm-next:document-jacket:${String(form.customerId || "")}:${draft.pathway}:${String(form.vehicle || "").trim()}`;
      const reference = String(jacket?.dealReference || object(snapshot.references)[key] || draft.id);
      const packet = jacket || await createSalesDocumentJacket(user, { pathway: draft.pathway, dealReference: reference, dealNumber: String(draft.dealNumber), customerId: draft.customerId, customerName: draft.customerName, vehicleReference: draft.vehicleReference, vin: facts.vin, stockNumber: facts.stockNumber }, database);
      await database.dealDeskDraft.update({ where: { id: draft.id }, data: { snapshot: { ...snapshot, jackets: { ...jacketIds, [draft.pathway]: packet.id }, references: { ...object(snapshot.references), [key]: reference } } as Prisma.InputJsonValue } });
      return { id: draft.id, jacketId: packet.id, revision: draft.revision + 1, status: draft.status, state: packet.state };
    }
    if (!jacket || typeof raw.jacketId !== "string" || !Number.isInteger(raw.jacketRevision)) throw new SalesDocumentsError("Open this deal's paperwork checklist before finalizing documents.", 409);
    if (action === "FINISH" && draft.status !== "SOLD") throw new SalesDocumentsError("Mark this deal sold first. Finalize its paperwork separately afterward.", 409);
    if (draft.revision !== raw.revision || jacket.revision !== raw.jacketRevision) throw new SalesDocumentsError("This deal changed in another window. Refresh this panel before continuing.", 409);
    if (jacket.state === "UNWIND_PENDING") throw new SalesDocumentsError("An unwind review is pending. No refund or funds reversal has been confirmed.", 409);
    if (action === "REOPEN" && !["CLOSED", "DELIVERED_FUNDING_PENDING"].includes(jacket.state)) throw new SalesDocumentsError("Only finalized deals can be reopened for corrections.", 409);
    const status = action === "REQUEST_UNWIND" ? "PENDING" : draft.status;
    const history = Array.isArray(draft.statusHistory) ? draft.statusHistory : [];
    const at = new Date().toISOString();
    const firstClosed = jacket.versions.find(version => version.disposition === "CLOSED")?.finalizedAt.toISOString();
    const changed = await database.dealDeskDraft.updateMany({ where: { id: draft.id, organizationId, ownerUserId: draft.ownerUserId, revision: Number(raw.revision) }, data: { status, revision: { increment: 1 }, statusHistory: [...history, { from: draft.status, to: status, action, actorId: user.id, actorName: user.name, at, effectiveAt: action === "FINISH" ? firstClosed || at : at, reason: note || "Paperwork finalized on this existing sold deal. Original sold date and revenue pathway preserved." }] as Prisma.InputJsonValue } });
    if (changed.count !== 1) throw new SalesDocumentsError("This deal changed in another window. Refresh this panel before continuing.", 409);
    let state = jacket.state;
    if (action !== "FINISH" || jacket.state !== "CLOSED") {
      const result = await updateSalesDocumentJacket(user, jacket.id, { action: action === "FINISH" ? "FINALIZE" : action === "REOPEN" ? "ADDENDUM" : "REQUEST_UNWIND", revision: raw.jacketRevision, note }, database);
      state = result.state;
    }
    return { id: draft.id, jacketId: jacket.id, status, state };
  }, { timeout: 30000 });
}
