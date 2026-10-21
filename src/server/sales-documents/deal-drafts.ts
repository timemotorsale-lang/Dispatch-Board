import { persistDealContext } from "@/server/deal-continuity/service";
import { dealCustomer } from "@/server/deal-continuity/identities";
import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/client";
import type { AuthenticatedUser } from "@/server/auth/store";
import { resolveDocumentStorageRuntimeFromEnv } from "@/server/document-library/storage-config";
import { isSalesDocumentPathway } from "@/lib/sales-document-pathways";
import { isSavedDealStatus } from "@/lib/saved-deal-status";
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
  return prisma.dealDeskDraft.findMany({ where: { ...scope(actor), ...(customerId ? { customerId } : {}) }, select: { id: true, customerId: true, customerName: true, pathway: true, vehicleReference: true, status: true, updatedAt: true, revision: true }, orderBy: { updatedAt: "desc" }, take: 100 });
}

export async function listSavedDealLibrary(actor: AuthenticatedUser | null, params: URLSearchParams) {
  const access = scope(actor), search = text(params.get("search")), status = params.get("status") || "ALL", pathway = params.get("pathway") || "ALL";
  const page = Number(params.get("page") || 1);
  if (!Number.isInteger(page) || page < 1 || page > 100000) throw new SalesDocumentsError("Choose a valid saved-deals page.");
  if (status !== "ALL" && !isSavedDealStatus(status)) throw new SalesDocumentsError("Choose a valid deal status.");
  if (pathway !== "ALL" && !isSalesDocumentPathway(pathway)) throw new SalesDocumentsError("Choose a valid revenue path.");
  const base: Prisma.DealDeskDraftWhereInput = { ...access, ...(pathway !== "ALL" ? { pathway } : {}), ...(search ? { OR: ["customerName", "vehicleReference", "id"].map((key) => ({ [key]: { contains: search, mode: "insensitive" } })) } : {}) };
  const where = { ...base, ...(status !== "ALL" ? { status } : {}) };
  const [items, total, groups] = await Promise.all([
    prisma.dealDeskDraft.findMany({ where, select: { id: true, customerId: true, customerName: true, pathway: true, vehicleReference: true, status: true, updatedAt: true, revision: true }, orderBy: [{ updatedAt: "desc" }, { id: "desc" }], skip: (page - 1) * 25, take: 25 }),
    prisma.dealDeskDraft.count({ where }),
    prisma.dealDeskDraft.groupBy({ by: ["status"], where: base, _count: { _all: true } }),
  ]);
  return { items, total, page, pages: Math.max(1, Math.ceil(total / 25)), counts: Object.fromEntries(groups.map((group) => [group.status, group._count._all])) };
}

export async function readDealDeskDraft(actor: AuthenticatedUser | null, id: string) {
  const draft = await prisma.dealDeskDraft.findFirst({ where: { ...scope(actor), id } });
  if (!draft) throw new SalesDocumentsError("Saved deal draft was not found.", 404);
  return draft;
}

export async function saveDealDeskDraft(actor: AuthenticatedUser | null, raw: Record<string, unknown>) {
  const access = scope(actor), id = text(raw.id), pathway = text(raw.pathway);
  if (raw.status !== undefined && !isSavedDealStatus(raw.status)) throw new SalesDocumentsError("Choose a valid deal status.");
  if (!/^[a-zA-Z0-9-]{8,100}$/.test(id) || !isSalesDocumentPathway(pathway)) throw new SalesDocumentsError("Choose a valid deal draft and revenue path.");
  if (!Number.isInteger(raw.revision) || Number(raw.revision) < 0) throw new SalesDocumentsError("Refresh the draft before saving.", 409);
  if (!raw.snapshot || typeof raw.snapshot !== "object" || Array.isArray(raw.snapshot)) throw new SalesDocumentsError("Draft details are invalid.");
  const serialized = JSON.stringify(raw.snapshot);
  if (Buffer.byteLength(serialized) > 512 * 1024) throw new SalesDocumentsError("This draft is too large. Store documents in Sales Documents, then save the draft.", 413);
  const snapshot = sanitizeDealDraftSnapshot(JSON.parse(serialized)) as Prisma.InputJsonValue;
  const data = { snapshot, pathway, customerId: text(raw.customerId) || null, customerName: text(raw.customerName) || "Customer not selected", vehicleReference: text(raw.vehicleReference) };
  return prisma.$transaction(async (db) => {
    const identity = (snapshot as Record<string, unknown>)["desk:identity"] as Record<string, unknown> | undefined;
    if (identity?.customerId && data.customerId) data.customerName = (await dealCustomer(actor, data.customerId, db)).name;
    const current = await db.dealDeskDraft.findUnique({ where: { id } });
    const status = raw.status === undefined ? current?.status ?? "IN_PROGRESS" : raw.status as string;
    const history = Array.isArray(current?.statusHistory) ? current.statusHistory : [];
    const statusData = { status, ...(!current || current.status !== status ? { statusHistory: [...history, { from: current?.status ?? null, to: status, actorId: access.ownerUserId, at: new Date().toISOString() }] as Prisma.InputJsonValue } : {}) };
    if (!current) {
      if (raw.revision !== 0) throw new SalesDocumentsError("Saved draft was not found. Refresh before continuing.", 409);
      const created = await db.dealDeskDraft.create({ data: { id, ...access, ...data, ...statusData } });
      await persistDealContext(actor, db, id, data.customerId, snapshot as Record<string, unknown>);
      return created;
    }
    if (current.organizationId !== access.organizationId || current.ownerUserId !== access.ownerUserId) throw new SalesDocumentsError("Saved deal draft was not found.", 404);
    const previousIdentity = current.snapshot && typeof current.snapshot === "object" && !Array.isArray(current.snapshot) ? current.snapshot["desk:identity"] : null;
    if (previousIdentity && typeof previousIdentity === "object" && !Array.isArray(previousIdentity) && previousIdentity.customerId && !identity?.customerId) throw new SalesDocumentsError("Keep the shared customer link when saving this deal. Use the selector to change customer through a separate deal.");
    if (current.pathway !== pathway && await db.vehicleUseBooking.count({ where: { contextId: id, status: { in: ["RESERVED", "CHECKED_OUT"] } } })) throw new SalesDocumentsError("Return or cancel the active vehicle assignment before changing its deal path.", 409);
    const updated = await db.dealDeskDraft.updateMany({ where: { id, ...access, revision: Number(raw.revision) }, data: { ...data, ...statusData, revision: { increment: 1 } } });
    if (updated.count !== 1) throw new SalesDocumentsError("This draft was changed in another window. Reopen the saved draft before continuing; your current entries have not been replaced.", 409);
    await persistDealContext(actor, db, id, data.customerId, snapshot as Record<string, unknown>);
    return db.dealDeskDraft.findUniqueOrThrow({ where: { id } });
  });
}
