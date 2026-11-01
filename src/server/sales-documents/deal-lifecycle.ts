import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/client";
import type { AuthenticatedUser } from "@/server/auth/store";
import { resolveDocumentStorageRuntimeFromEnv } from "@/server/document-library/storage-config";
import { requireSalesDocumentsUser, updateSalesDocumentJacket } from "./service";
import { SalesDocumentsError } from "./domain";
import { dealGroup } from "@/lib/deal-dashboard";

const object = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
export async function manageDealLifecycle(actor: AuthenticatedUser | null, raw: Record<string, unknown>) {
  const action = String(raw.action || "");
  if (!["FINISH", "REOPEN", "REQUEST_UNWIND"].includes(action)) throw new SalesDocumentsError("Choose a supported deal action.");
  const user = requireSalesDocumentsUser(actor, action !== "FINISH");
  if (typeof raw.id !== "string" || typeof raw.jacketId !== "string" || !Number.isInteger(raw.revision) || !Number.isInteger(raw.jacketRevision)) throw new SalesDocumentsError("Refresh this deal before continuing.", 409);
  const organizationId = resolveDocumentStorageRuntimeFromEnv().organizationId;
  const note = typeof raw.note === "string" ? raw.note.trim().slice(0, 1000) : "";
  if (action !== "FINISH" && note.length < 10) throw new SalesDocumentsError("Enter a reason of at least 10 characters. The original signed packet will remain preserved.");
  return prisma.$transaction(async database => {
    const draft = await database.dealDeskDraft.findFirst({ where: { id: raw.id as string, organizationId, ownerUserId: user.id } });
    if (!draft) throw new SalesDocumentsError("This deal is not available to your account.", 404);
    if (!["SALES", "LEASING"].includes(dealGroup(draft.pathway))) throw new SalesDocumentsError("Use the return or completion workflow for this revenue pathway.");
    const jacket = await database.salesDocumentJacket.findFirst({ where: { id: raw.jacketId as string, organizationId, pathway: draft.pathway }, include: { versions: { orderBy: { version: "asc" }, select: { disposition: true, finalizedAt: true } } } });
    const snapshot = object(draft.snapshot), jacketIds = object(snapshot.jackets), references = Object.values(object(snapshot.references));
    if (!jacket || (jacketIds[draft.pathway] !== jacket.id && !references.includes(jacket.dealReference)) || (draft.customerId && jacket.customerId !== draft.customerId)) throw new SalesDocumentsError("Open the packet saved on this existing deal before finishing it.", 409);
    if (["ARCHIVED", "CANCELLED", "LOST"].includes(draft.status)) throw new SalesDocumentsError("This deal is inactive. Review its history before making lifecycle changes.", 409);
    if ((action === "FINISH" && draft.status === "SOLD" && jacket.state === "CLOSED") || (action === "REQUEST_UNWIND" && jacket.state === "UNWIND_PENDING")) return { id: draft.id, jacketId: jacket.id, status: draft.status, state: jacket.state };
    if (draft.revision !== raw.revision || jacket.revision !== raw.jacketRevision) throw new SalesDocumentsError("This deal changed in another window. Refresh this panel before continuing.", 409);
    if (jacket.state === "UNWIND_PENDING") throw new SalesDocumentsError("An unwind review is pending. No refund or funds reversal has been confirmed.", 409);
    if (action === "REOPEN" && !["CLOSED", "DELIVERED_FUNDING_PENDING"].includes(jacket.state)) throw new SalesDocumentsError("Only finalized deals can be reopened for corrections.", 409);
    const status = action === "FINISH" ? "SOLD" : action === "REQUEST_UNWIND" ? "PENDING" : draft.status;
    const history = Array.isArray(draft.statusHistory) ? draft.statusHistory : [];
    const at = new Date().toISOString();
    const firstClosed = jacket.versions.find(version => version.disposition === "CLOSED")?.finalizedAt.toISOString();
    const changed = await database.dealDeskDraft.updateMany({ where: { id: draft.id, organizationId, ownerUserId: user.id, revision: Number(raw.revision) }, data: { status, revision: { increment: 1 }, statusHistory: [...history, { from: draft.status, to: status, action, actorId: user.id, at, effectiveAt: action === "FINISH" ? firstClosed || at : at, reason: note || "Existing deal packet finalized and marked sold. Revenue pathway unchanged." }] as Prisma.InputJsonValue } });
    if (changed.count !== 1) throw new SalesDocumentsError("This deal changed in another window. Refresh this panel before continuing.", 409);
    let state = jacket.state;
    if (action !== "FINISH" || jacket.state !== "CLOSED") {
      const result = await updateSalesDocumentJacket(user, jacket.id, { action: action === "FINISH" ? "FINALIZE" : action === "REOPEN" ? "ADDENDUM" : "REQUEST_UNWIND", revision: raw.jacketRevision, note }, database);
      state = result.state;
    }
    return { id: draft.id, jacketId: jacket.id, status, state };
  }, { timeout: 30000 });
}
