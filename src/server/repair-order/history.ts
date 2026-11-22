import { assertRepairReadCandidate, readableRepairLocations } from "./read-access";
import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma } from "@/server/db/client";
import type { AuthenticatedUser } from "@/server/auth/store";
import { assertAuthenticatedUser } from "@/server/policies/access";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { createEnterpriseCommandRepository, type EnterpriseCommandRepository } from "@/server/enterprise-command/repository";
import { evaluateVehicleCapability } from "@/server/enterprise-command/vehicle-capabilities";
import { serviceDocumentHistoryHref, type RepairHistoryItem, type RepairHistoryKind, type RepairHistoryResult, type RepairHistoryState } from "@/lib/repair-history";

export class RepairHistoryQueryError extends Error {}
type Query = { query?: unknown; kind?: unknown; state?: unknown; page?: unknown; pageSize?: unknown; vehicleId?: unknown; customerId?: unknown };
type Dependencies = { database?: PrismaClient; foundation?: Pick<EnterpriseCommandRepository, "listCapabilityGrants">; organizationId?: string; now?: Date };
const receiptKinds = ["PAYMENT", "REFUND", "CREDIT", "VOID", "RECEIPT", "DEPOSIT", "DEPOSIT_REFUND", "DEPOSIT_APPLICATION", "DEPOSIT_REVERSAL"];
const publicDocumentKinds = ["RO", "ESTIMATE", "AUTHORIZATION"];
const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const string = (value: unknown, fallback = "") => typeof value === "string" ? value : fallback;
const href = (path: string, key: string, value: string) => `${path}?${new URLSearchParams({ [key]: value })}`;
const clauses = (values: Prisma.Sql[]) => values.length ? Prisma.join(values, " ") : Prisma.empty;

export function normalizeRepairHistoryQuery(input: Query) {
  function integer(value: unknown, fallback: number, maximum: number) {
    if (value === undefined || value === null || value === "") return fallback;
    const result = Number(value);
    if (!Number.isSafeInteger(result) || result < 1 || result > maximum) throw new RepairHistoryQueryError("Choose a valid history page and page size.");
    return result;
  }
  function identifier(value: unknown) {
    if (value === undefined || value === null || value === "") return "";
    if (typeof value !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(value)) throw new RepairHistoryQueryError("Choose a valid customer or vehicle reference.");
    return value;
  }
  const kind = input.kind ?? "ALL", state = input.state ?? "ALL";
  if (!["ALL", "DRAFT", "ESTIMATE", "INVOICE", "RECEIPT"].includes(String(kind)) || !["ALL", "OPEN", "CLOSED"].includes(String(state))) throw new RepairHistoryQueryError("Choose a supported history filter.");
  if (input.query != null && (typeof input.query !== "string" || input.query.length > 200)) throw new RepairHistoryQueryError("Search must be 200 characters or fewer.");
  return { query: typeof input.query === "string" ? input.query.trim() : "", kind: kind as RepairHistoryKind, state: state as RepairHistoryState, page: integer(input.page, 1, 100000), pageSize: integer(input.pageSize, 20, 50), vehicleId: identifier(input.vehicleId), customerId: identifier(input.customerId) };
}

/** Read-only history: no date cutoff, no status rewrite, and no creation of legacy documents. */
export async function searchRepairHistory(actor: AuthenticatedUser | null, raw: Query, input: Dependencies = {}): Promise<RepairHistoryResult> {
  const user = assertAuthenticatedUser(actor), query = normalizeRepairHistoryQuery(raw);
  const database = input.database ?? prisma, organizationId = input.organizationId ?? INITIAL_ORGANIZATION.id;
  const grants = await (input.foundation ?? createEnterpriseCommandRepository()).listCapabilityGrants(user.id, organizationId);
  const now = input.now ?? new Date();
  // Match the existing document/workbench read policy; write rollout flags do not hide history.
  assertRepairReadCandidate(user, grants, now);
  const locations = await database.location.findMany({ where: { organizationId }, select: { id: true } });
  const allowed = readableRepairLocations(user, grants, locations, now, true);
  if (!allowed.length) return { items: [], page: query.page, hasMore: false };
  const billing = allowed.filter(locationId => evaluateVehicleCapability({ actor: user, grants, capability: "SERVICE_BILLING_VIEW", locationId, now }).allowed);
  const inLocations = (column: Prisma.Sql, ids: string[]) => ids.length ? Prisma.sql`${column} IN (${Prisma.join(ids)})` : Prisma.sql`FALSE`;
  const accessibleOrder = inLocations(Prisma.sql`r."locationId"`, allowed);
  const billingOrder = inLocations(Prisma.sql`r."locationId"`, billing);
  const visibleDocument = Prisma.sql`(sd.kind IN (${Prisma.join(publicDocumentKinds)}) OR ${billingOrder})`;
  const orderScope = Prisma.sql`r."organizationId" = ${organizationId} AND ${accessibleOrder}
    ${query.vehicleId ? Prisma.sql`AND r."vehicleId" = ${query.vehicleId}` : Prisma.empty}
    ${query.customerId ? Prisma.sql`AND r."customerId" = ${query.customerId}` : Prisma.empty}`;
  const orderState = query.state === "ALL" ? Prisma.empty : query.state === "CLOSED" ? Prisma.sql`AND r."closedAt" IS NOT NULL` : Prisma.sql`AND r."closedAt" IS NULL`;
  const invoiceExists = Prisma.sql`(EXISTS (SELECT 1 FROM "ServiceInvoicePackage" ip WHERE ip."organizationId" = ${organizationId} AND ip."repairOrderId" = r.id) OR EXISTS (SELECT 1 FROM "ServiceInvoice" si WHERE si."organizationId" = ${organizationId} AND si."repairOrderId" = r.id))`;
  const receiptExists = Prisma.sql`EXISTS (SELECT 1 FROM "ServiceInvoiceEntry" ie JOIN "ServiceInvoice" si ON si.id = ie."invoiceId" AND si."organizationId" = ${organizationId} WHERE ie."organizationId" = ${organizationId} AND si."repairOrderId" = r.id AND ie.kind IN (${Prisma.join(receiptKinds)}))`;
  const draftExists = Prisma.sql`(EXISTS (SELECT 1 FROM "AutobodyEstimateDraft" ad WHERE ad."organizationId" = ${organizationId} AND ad."repairOrderId" = r.id AND ${inLocations(Prisma.sql`ad."locationId"`, allowed)})
    OR EXISTS (SELECT 1 FROM "DiagnosticEstimateDraftVersion" dd WHERE dd."organizationId" = ${organizationId} AND dd."repairOrderId" = r.id)
    OR EXISTS (SELECT 1 FROM "ShopReconStageDraft" rd WHERE rd."organizationId" = ${organizationId} AND rd."repairOrderId" = r.id))`;
  const kindClause = query.kind === "ALL" ? Prisma.empty : query.kind === "DRAFT" ? Prisma.sql`AND ${draftExists}` : query.kind === "ESTIMATE" ? Prisma.sql`AND (EXISTS (SELECT 1 FROM "RepairEstimateVersion" ev WHERE ev."organizationId" = ${organizationId} AND ev."repairOrderId" = r.id) OR EXISTS (SELECT 1 FROM "ServiceDocument" sd WHERE sd."organizationId" = ${organizationId} AND sd."repairOrderId" = r.id AND sd.kind = 'ESTIMATE'))` : Prisma.sql`AND ${billingOrder} AND (EXISTS (SELECT 1 FROM "ServiceDocument" sd WHERE sd."organizationId" = ${organizationId} AND sd."repairOrderId" = r.id AND sd.kind IN (${Prisma.join(query.kind === "INVOICE" ? ["INVOICE"] : receiptKinds)})) OR ${query.kind === "INVOICE" ? invoiceExists : receiptExists})`;
  // Parameters, not interpolated SQL. Escape LIKE metacharacters so VIN/reference searches are literal.
  const tokens = query.query.split(/\s+/).filter(Boolean).map(token => `%${token.replace(/[\\%_]/g, "\\$&")}%`);
  const search = tokens.map(token => Prisma.sql`AND (
    concat_ws(' ', r."repairOrderNumber", r.id, v."vehicleNumber", v.vin, v."stockNumber", v.year, v.make, v.model, c."displayName", sv."concernSummary") ILIKE ${token}
    OR EXISTS (SELECT 1 FROM "ServiceDocument" sd WHERE sd."organizationId" = ${organizationId} AND sd."repairOrderId" = r.id AND ${visibleDocument} AND concat_ws(' ', sd.content->>'number', sd.content->'identity'->>'customer', sd.content->'identity'->>'vehicle', sd.content->'identity'->>'vin', sd.content->'identity'->>'stockNumber', sd.content->'receipt'->>'reference') ILIKE ${token})
    OR EXISTS (SELECT 1 FROM "AutobodyEstimateDraft" ad WHERE ad."organizationId" = ${organizationId} AND ad."repairOrderId" = r.id AND ${inLocations(Prisma.sql`ad."locationId"`, allowed)} AND ad.title ILIKE ${token})
    OR (${billingOrder} AND (
      EXISTS (SELECT 1 FROM "ServiceInvoicePackage" ip WHERE ip."organizationId" = ${organizationId} AND ip."repairOrderId" = r.id AND (concat_ws(' ', ip.id, ip."externalSystemCode", ip."externalReference") ILIKE ${token} OR EXISTS (SELECT 1 FROM "ServiceInvoiceReconciliation" ir WHERE ir."organizationId" = ${organizationId} AND ir."invoicePackageId" = ip.id AND concat_ws(' ', ir."externalSystemCode", ir."externalReference") ILIKE ${token})))
      OR EXISTS (SELECT 1 FROM "ServiceInvoice" si WHERE si."organizationId" = ${organizationId} AND si."repairOrderId" = r.id AND (si."invoiceNumber" ILIKE ${token} OR EXISTS (SELECT 1 FROM "ServiceInvoiceEntry" ie WHERE ie."organizationId" = ${organizationId} AND ie."invoiceId" = si.id AND ie.reference ILIKE ${token})))
    ))
  )`);
  const includeDrafts = query.kind === "ALL" || query.kind === "DRAFT";
  const draftState = (column: Prisma.Sql) => query.state === "ALL" ? Prisma.empty : query.state === "CLOSED" ? Prisma.sql`AND ${column}` : Prisma.sql`AND NOT (${column})`;
  type Hit = { id: string; source: RepairHistoryItem["source"]; updatedAt: Date };
  const hits = await database.$queryRaw<Hit[]>(Prisma.sql`
    SELECT * FROM (
      SELECT r.id, 'REPAIR_ORDER'::text AS source, r."updatedAt" FROM "RepairOrder" r
      JOIN "Vehicle" v ON v.id = r."vehicleId" AND v."organizationId" = ${organizationId}
      LEFT JOIN "Customer" c ON c.id = r."customerId" AND c."organizationId" = ${organizationId}
      JOIN "ServiceVisit" sv ON sv.id = r."serviceVisitId" AND sv."organizationId" = ${organizationId}
      WHERE ${orderScope} ${orderState} ${kindClause} ${clauses(search)}
      ${includeDrafts ? Prisma.sql`UNION ALL
        SELECT ad.id, 'AUTOBODY_DRAFT'::text AS source, ad."updatedAt" FROM "AutobodyEstimateDraft" ad
        LEFT JOIN "Vehicle" v ON v.id = ad."vehicleId" AND v."organizationId" = ${organizationId}
        WHERE ad."organizationId" = ${organizationId} AND ad."repairOrderId" IS NULL AND ${inLocations(Prisma.sql`ad."locationId"`, allowed)}
        ${query.vehicleId ? Prisma.sql`AND ad."vehicleId" = ${query.vehicleId}` : Prisma.empty}
        ${query.customerId ? Prisma.sql`AND FALSE` : Prisma.empty}
        ${draftState(Prisma.sql`ad.status = 'ARCHIVED'`)}
        ${clauses(tokens.map(token => Prisma.sql`AND concat_ws(' ', ad.title, ad.id, v.vin, v."vehicleNumber", v."stockNumber", v.year, v.make, v.model) ILIKE ${token}`))}
        UNION ALL
        SELECT ld.id, 'LABOR_DRAFT'::text AS source, ld."updatedAt" FROM "DiagnosticWorkspaceDraft" ld
        LEFT JOIN "RepairOrder" r ON r.id = ld.content->'ro'->>'id' AND r."organizationId" = ${organizationId}
        WHERE ld."userId" = ${user.id}
        AND (NULLIF(ld.content->'ro'->>'id', '') IS NULL OR (${orderScope}))
        ${query.vehicleId ? Prisma.sql`AND r."vehicleId" = ${query.vehicleId}` : Prisma.empty}
        ${query.customerId ? Prisma.sql`AND r."customerId" = ${query.customerId}` : Prisma.empty}
        ${draftState(Prisma.sql`(ld.content ? 'archivedAt' OR r."closedAt" IS NOT NULL)`)}
        ${clauses(tokens.map(token => Prisma.sql`AND concat_ws(' ', ld.title, ld.id, ld.content->'manual'->>'customer', ld.content->'manual'->>'vehicle', ld.content->'manual'->>'vin', ld.content->'manual'->>'concern', ld.content->'ro'->>'customer', ld.content->'ro'->>'repairOrderNumber', ld.content->'ro'->'vehicle'->>'label', ld.content->'ro'->'vehicle'->>'vin') ILIKE ${token}`))}
      ` : Prisma.empty}
    ) history ORDER BY "updatedAt" DESC, source ASC, id ASC LIMIT ${query.pageSize + 1} OFFSET ${(query.page - 1) * query.pageSize}
  `);
  const page = hits.slice(0, query.pageSize);
  const ids = (source: Hit["source"]) => page.filter(hit => hit.source === source).map(hit => hit.id);
  const [orders, bodies, labors] = await Promise.all([
    database.repairOrder.findMany({ where: { organizationId, locationId: { in: allowed }, id: { in: ids("REPAIR_ORDER") } }, include: { vehicle: true, customer: true, serviceVisit: true, autobodyDrafts: { where: { organizationId, locationId: { in: allowed } }, orderBy: { updatedAt: "desc" } }, estimateVersions: { where: { organizationId }, orderBy: { version: "desc" } }, diagnosticEstimateDrafts: { where: { organizationId }, select: { id: true, version: true } }, shopReconLifecycle: { select: { id: true, drafts: { select: { id: true }, take: 1 } } } } }),
    database.autobodyEstimateDraft.findMany({ where: { organizationId, locationId: { in: allowed }, id: { in: ids("AUTOBODY_DRAFT") } }, include: { vehicle: true } }),
    database.diagnosticWorkspaceDraft.findMany({ where: { userId: user.id, id: { in: ids("LABOR_DRAFT") } } })
  ]);
  const orderIds = orders.map(order => order.id), billingIds = orders.filter(order => billing.includes(order.locationId)).map(order => order.id);
  const documents = orderIds.length ? await database.serviceDocument.findMany({ where: { organizationId, repairOrderId: { in: orderIds }, OR: [{ kind: { in: publicDocumentKinds } }, { repairOrderId: { in: billingIds } }] }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] }) : [];
  const [packages, invoices] = billingIds.length ? await Promise.all([
    database.serviceInvoicePackage.findMany({ where: { organizationId, repairOrderId: { in: billingIds } }, orderBy: { version: "desc" } }),
    database.serviceInvoice.findMany({ where: { organizationId, repairOrderId: { in: billingIds } }, orderBy: { issuedAt: "desc" } }),
  ]) : [[], []];
  const entries = invoices.length ? await database.serviceInvoiceEntry.findMany({ where: { organizationId, invoiceId: { in: invoices.map(invoice => invoice.id) }, kind: { in: receiptKinds } }, orderBy: { occurredAt: "desc" } }) : [];
  const mapped = new Map<string, RepairHistoryItem>();
  for (const order of orders) {
    const workbench = href("/vehicles/repair-workbench", "repairOrderId", order.id);
    const savedDocuments = documents.filter(document => document.repairOrderId === order.id);
    mapped.set(`REPAIR_ORDER:${order.id}`, { id: order.id, source: "REPAIR_ORDER", number: order.repairOrderNumber, title: order.serviceVisit.concernSummary, customer: order.customer?.displayName ?? "Internal work", vehicle: [order.vehicle.year, order.vehicle.make, order.vehicle.model].filter(Boolean).join(" ") || order.vehicle.vehicleNumber, vin: order.vehicle.vin, stockNumber: order.vehicle.stockNumber, status: order.closedAt ? "CLOSED" : order.operatingState, updatedAt: order.updatedAt.toISOString(), href: workbench,
      documents: [
        ...savedDocuments.map(document => { const content = record(document.content); return { id: document.id, kind: document.kind, number: string(content.number, order.repairOrderNumber), version: document.sourceVersion, issuedAt: string(content.issuedAt, document.createdAt.toISOString()), href: serviceDocumentHistoryHref(order.id, document.id) }; }),
        ...order.estimateVersions.filter(estimate => !savedDocuments.some(document => document.kind === "ESTIMATE" && document.sourceId === estimate.id)).map(estimate => ({ id: estimate.id, kind: "LEGACY_ESTIMATE", number: order.repairOrderNumber, version: estimate.version, issuedAt: estimate.presentedAt.toISOString(), href: `/repair-estimate?${new URLSearchParams({ repairOrderId: order.id, estimateId: estimate.id })}` })),
        ...packages.filter(pkg => pkg.repairOrderId === order.id).map(pkg => ({ id: pkg.id, kind: "INVOICE_PACKAGE", number: pkg.externalReference ?? order.repairOrderNumber, version: pkg.version, issuedAt: pkg.generatedAt.toISOString(), href: `/repair-billing-record?${new URLSearchParams({ repairOrderId: order.id, packageId: pkg.id })}` })),
        ...invoices.filter(invoice => invoice.repairOrderId === order.id && !savedDocuments.some(document => document.kind === "INVOICE" && document.sourceId === invoice.id)).map(invoice => ({ id: invoice.id, kind: "LEGACY_INVOICE", number: invoice.invoiceNumber, version: invoice.version, issuedAt: invoice.issuedAt.toISOString(), href: `/repair-billing-record?${new URLSearchParams({ repairOrderId: order.id, invoiceId: invoice.id })}` })),
        ...entries.filter(entry => invoices.some(invoice => invoice.id === entry.invoiceId && invoice.repairOrderId === order.id) && !savedDocuments.some(document => document.sourceId === entry.id)).map(entry => ({ id: entry.id, kind: "LEGACY_RECEIPT", number: `${entry.kind} ${entry.reference}`, version: 1, issuedAt: entry.occurredAt.toISOString(), href: `/repair-billing-record?${new URLSearchParams({ repairOrderId: order.id, entryId: entry.id })}` })),
      ],
      drafts: [
        ...order.autobodyDrafts.map(draft => ({ id: draft.id, label: `${draft.title} · ${draft.status.toLowerCase()}`, href: href("/prototype/autobody-estimate", "draftId", draft.id) })),
        ...(order.diagnosticEstimateDrafts.length ? [{ id: order.diagnosticEstimateDrafts[0].id, label: "Diagnostic estimate drafts", href: `${workbench}&step=estimate` }] : []),
        ...(order.shopReconLifecycle?.drafts.length ? [{ id: order.shopReconLifecycle.id, label: "Saved repair workflow", href: workbench }] : [])
      ] });
  }
  for (const draft of bodies) mapped.set(`AUTOBODY_DRAFT:${draft.id}`, { id: draft.id, source: "AUTOBODY_DRAFT", number: `Auto Body · v${draft.version}`, title: draft.title, customer: "Unlinked draft", vehicle: draft.vehicle ? [draft.vehicle.year, draft.vehicle.make, draft.vehicle.model].filter(Boolean).join(" ") : "Vehicle not linked", vin: draft.vehicle?.vin ?? null, stockNumber: draft.vehicle?.stockNumber ?? null, status: draft.status, updatedAt: draft.updatedAt.toISOString(), href: href("/prototype/autobody-estimate", "draftId", draft.id), documents: [], drafts: [] });
  for (const draft of labors) {
    const content = record(draft.content), manual = record(content.manual), ro = record(content.ro), vehicle = record(ro.vehicle);
    mapped.set(`LABOR_DRAFT:${draft.id}`, { id: draft.id, source: "LABOR_DRAFT", number: `My saved quote · v${draft.version}`, title: draft.title, customer: string(ro.customer, string(manual.customer)), vehicle: string(vehicle.label, string(manual.vehicle)), vin: string(vehicle.vin, string(manual.vin)) || null, stockNumber: null, status: "archivedAt" in content ? "ARCHIVED" : "DRAFT", updatedAt: draft.updatedAt.toISOString(), href: href("/prototype/repair-explorer", "draftId", draft.id), documents: [], drafts: [] });
  }
  return { items: page.flatMap(hit => { const item = mapped.get(`${hit.source}:${hit.id}`); return item ? [item] : []; }), page: query.page, hasMore: hits.length > query.pageSize };
}
