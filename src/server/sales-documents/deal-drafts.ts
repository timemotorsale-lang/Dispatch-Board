import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/client";
import type { AuthenticatedUser } from "@/server/auth/store";
import { resolveDocumentStorageRuntimeFromEnv } from "@/server/document-library/storage-config";
import { isSalesDocumentPathway } from "@/lib/sales-document-pathways";
import { requireSalesDocumentsUser } from "./service";
import { SalesDocumentsError } from "./domain";

const text = (value: unknown) => typeof value === "string" ? value.trim().slice(0, 240) : "";
export function sanitizeDealDraftSnapshot(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeDealDraftSnapshot);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).filter(([key]) => !/ssn|itin|social.?security|routing.?number|bank.?account|credit.?card.?number|__proto__|^constructor$|^prototype$/i.test(key)).map(([key, item]) => [key, sanitizeDealDraftSnapshot(item)]));
}
function scope(actor: AuthenticatedUser | null) {
  const user = requireSalesDocumentsUser(actor);
  return { organizationId: resolveDocumentStorageRuntimeFromEnv().organizationId, ownerUserId: user.id };
}

export async function listDealDrafts(actor: AuthenticatedUser | null, customerId = "") {
  return prisma.dealDeskDraft.findMany({ where: { ...scope(actor), ...(customerId ? { customerId } : {}) }, select: { id: true, customerId: true, customerName: true, pathway: true, vehicleReference: true, updatedAt: true, revision: true }, orderBy: { updatedAt: "desc" }, take: 100 });
}

export async function readDealDeskDraft(actor: AuthenticatedUser | null, id: string) {
  const draft = await prisma.dealDeskDraft.findFirst({ where: { ...scope(actor), id } });
  if (!draft) throw new SalesDocumentsError("Saved deal draft was not found.", 404);
  return draft;
}

export async function saveDealDeskDraft(actor: AuthenticatedUser | null, raw: Record<string, unknown>) {
  const access = scope(actor), id = text(raw.id), pathway = text(raw.pathway);
  if (!/^[a-zA-Z0-9-]{8,100}$/.test(id) || !isSalesDocumentPathway(pathway)) throw new SalesDocumentsError("Choose a valid deal draft and revenue path.");
  if (!Number.isInteger(raw.revision) || Number(raw.revision) < 0) throw new SalesDocumentsError("Refresh the draft before saving.", 409);
  if (!raw.snapshot || typeof raw.snapshot !== "object" || Array.isArray(raw.snapshot)) throw new SalesDocumentsError("Draft details are invalid.");
  const serialized = JSON.stringify(raw.snapshot);
  if (Buffer.byteLength(serialized) > 512 * 1024) throw new SalesDocumentsError("This draft is too large. Store documents in Sales Documents, then save the draft.", 413);
  const snapshot = sanitizeDealDraftSnapshot(JSON.parse(serialized)) as Prisma.InputJsonValue;
  const data = { snapshot, pathway, customerId: text(raw.customerId) || null, customerName: text(raw.customerName) || "Customer not selected", vehicleReference: text(raw.vehicleReference) };
  return prisma.$transaction(async (db) => {
    const current = await db.dealDeskDraft.findUnique({ where: { id } });
    if (!current) {
      if (raw.revision !== 0) throw new SalesDocumentsError("Saved draft was not found. Refresh before continuing.", 409);
      return db.dealDeskDraft.create({ data: { id, ...access, ...data } });
    }
    if (current.organizationId !== access.organizationId || current.ownerUserId !== access.ownerUserId) throw new SalesDocumentsError("Saved deal draft was not found.", 404);
    const updated = await db.dealDeskDraft.updateMany({ where: { id, ...access, revision: Number(raw.revision) }, data: { ...data, revision: { increment: 1 } } });
    if (updated.count !== 1) throw new SalesDocumentsError("This draft was changed in another window. Reopen the saved draft before continuing; your current entries have not been replaced.", 409);
    return db.dealDeskDraft.findUniqueOrThrow({ where: { id } });
  });
}
