import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/client";
import type { AuthenticatedUser } from "@/server/auth/store";
import { resolveDocumentStorageRuntimeFromEnv } from "@/server/document-library/storage-config";
import { isSalesDocumentPathway } from "@/lib/sales-document-pathways";
import { isSavedDealStatus, type SavedDealStatus } from "@/lib/saved-deal-status";
import { requireSalesDocumentsUser } from "./service";
import { SalesDocumentsError } from "./domain";

type WorkbenchRow = { id: string; draftId: string | null; jacketId: string | null; customerName: string; vehicleReference: string; pathway: string; status: SavedDealStatus; packetState: string | null; dealNumber: string | null; updatedAt: Date };

export async function listDealWorkbench(actor: AuthenticatedUser | null, params: URLSearchParams) {
  const user = requireSalesDocumentsUser(actor), organizationId = resolveDocumentStorageRuntimeFromEnv().organizationId;
  const search = (params.get("search") || "").trim().slice(0, 240), status = params.get("status") || "ALL", pathway = params.get("pathway") || "ALL", page = Number(params.get("page") || 1);
  if (!Number.isInteger(page) || page < 1 || page > 100000) throw new SalesDocumentsError("Choose a valid deals page.");
  if (status !== "ALL" && !isSavedDealStatus(status)) throw new SalesDocumentsError("Choose a valid deal status.");
  if (pathway !== "ALL" && !isSalesDocumentPathway(pathway)) throw new SalesDocumentsError("Choose a valid revenue path.");
  // Drafts stay owner-private; packets keep the existing organization-scoped document policy.
  // Link by saved jacket ID/reference, never by a customer's name alone.
  const source = Prisma.sql`WITH drafts AS (
    SELECT d."id", d."id" AS "draftId", j."id" AS "jacketId", d."customerName", d."vehicleReference", d."pathway", d."status",
      j."state" AS "packetState", j."dealNumber", GREATEST(d."updatedAt", j."updatedAt") AS "updatedAt"
    FROM "DealDeskDraft" d
    LEFT JOIN LATERAL (
      SELECT j."id", j."state", j."dealNumber", j."updatedAt" FROM "SalesDocumentJacket" j
      WHERE j."organizationId" = ${organizationId} AND j."pathway" = d."pathway"
        AND (j."id" = d."snapshot" -> 'jackets' ->> d."pathway" OR j."dealReference" IN (
          SELECT value FROM jsonb_each_text(CASE WHEN jsonb_typeof(d."snapshot" -> 'references') = 'object' THEN d."snapshot" -> 'references' ELSE '{}'::jsonb END)
        )) ORDER BY j."updatedAt" DESC LIMIT 1
    ) j ON TRUE WHERE d."organizationId" = ${organizationId} AND d."ownerUserId" = ${user.id}
  ), records AS (
    SELECT * FROM drafts
    UNION ALL
    SELECT j."id", NULL::text AS "draftId", j."id" AS "jacketId", j."customerName", j."vehicleReference", j."pathway",
      CASE WHEN j."state" = 'CLOSED' THEN 'COMPLETED' WHEN j."state" = 'DELIVERED_FUNDING_PENDING' THEN 'PENDING' ELSE 'IN_PROGRESS' END AS "status",
      j."state" AS "packetState", j."dealNumber", j."updatedAt"
    FROM "SalesDocumentJacket" j WHERE j."organizationId" = ${organizationId}
      AND NOT EXISTS (SELECT 1 FROM drafts d WHERE d."jacketId" = j."id")
  )`;
  const pattern = `%${search.replace(/[\\%_]/g, "\\$&")}%`;
  const filters = Prisma.sql`WHERE (${pathway} = 'ALL' OR "pathway" = ${pathway}) AND (${search} = '' OR "customerName" ILIKE ${pattern} OR "vehicleReference" ILIKE ${pattern} OR "dealNumber" ILIKE ${pattern} OR "id" ILIKE ${pattern})`;
  const [items, groups] = await Promise.all([
    prisma.$queryRaw<WorkbenchRow[]>(Prisma.sql`${source} SELECT * FROM records ${filters} AND (${status} = 'ALL' OR "status" = ${status}) ORDER BY "updatedAt" DESC, "id" DESC LIMIT 25 OFFSET ${(page - 1) * 25}`),
    prisma.$queryRaw<Array<{ status: string; count: bigint }>>(Prisma.sql`${source} SELECT "status", COUNT(*) AS count FROM records ${filters} GROUP BY "status"`),
  ]);
  const counts = Object.fromEntries(groups.map((group) => [group.status, Number(group.count)]));
  const total = status === "ALL" ? Object.values(counts).reduce((sum, count) => sum + count, 0) : counts[status] || 0;
  return { items: items.map((item) => ({ ...item, updatedAt: item.updatedAt.toISOString() })), counts, total, page, pages: Math.max(1, Math.ceil(total / 25)) };
}
