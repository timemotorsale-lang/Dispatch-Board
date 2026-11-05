import { rentalLifecycle } from "@/lib/rental-lifecycle";
import { dealOrganization } from "@/server/deal-continuity/identities";
import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/client";
import type { AuthenticatedUser } from "@/server/auth/store";
import { chicagoDate, DEAL_GROUPS, dealGroup, reportingRange, summarizeDeals, type DashboardDeal } from "@/lib/deal-dashboard";
import { moneyToday } from "@/lib/money-resources";
import { summarizeTax, type TaxCalculation } from "@/lib/compliance-tax";
import { complianceAccess } from "@/server/compliance/service";
import { closingChecklist, SalesDocumentsError } from "./domain";
import type { SalesDocumentRequirement } from "@/lib/sales-document-pathways";
import { resolveDocumentStorageRuntimeFromEnv } from "@/server/document-library/storage-config";
import { canManageDeals } from "./dashboard-operations";
import { DEAL_WORK_VIEWS, dealAgeDays, financialEntry, record, summarizeDealFinancials, taskDealLink, type DealMilestone } from "@/lib/deal-dashboard-enterprise";

type SourceRow = Omit<DashboardDeal, "stage" | "nextAction" | "dueAt" | "taskHref" | "completedDate" | "createdDate" | "documentsReady" | "documentsTotal" | "needsAttention" | "updatedAt"> & { updatedAt: Date; createdAt: Date; statusHistory: Prisma.JsonValue };
export async function buildDealDashboard(user: AuthenticatedUser, source: Prisma.Sql, params: URLSearchParams) {
  let range: ReturnType<typeof reportingRange>;
  try { range = reportingRange(params.get("date") || moneyToday(), params.get("period") || "month"); }
  catch { throw new SalesDocumentsError("Choose a valid report date and Day, Week, or Month."); }
  const group = params.get("group") || "ALL", owner = params.get("owner") || "ALL", bucket = params.get("bucket") || "ALL";
  const canManage = canManageDeals(user), workspace = params.get("workspace") || "ACCESSIBLE", team = workspace === "TEAM";
  if (!Object.hasOwn(DEAL_GROUPS, group) || !Object.hasOwn(DEAL_WORK_VIEWS, bucket) || !["MY", "TEAM", "ACCESSIBLE"].includes(workspace)) throw new SalesDocumentsError("Choose a valid dashboard filter.");
  if (team && !canManage) throw new SalesDocumentsError("Team work requires manager access.", 403);
  const all = await prisma.$queryRaw<SourceRow[]>(Prisma.sql`SELECT r.*, COALESCE(d."customerId", j."customerId") AS "customerId",
    COALESCE(d."ownerUserId", j."createdByUserId") AS "ownerId", COALESCE(u."name", 'Unassigned') AS "ownerName",
    COALESCE(d."createdAt", j."createdAt") AS "createdAt", d."statusHistory",
    d."snapshot" -> 'lease-to-own:leaseFacts' ->> 'insuranceExpirationDate' AS "insuranceExpirationDate"
    FROM (${source} SELECT * FROM records) r
    LEFT JOIN "DealDeskDraft" d ON d."id" = r."draftId"
    LEFT JOIN "SalesDocumentJacket" j ON j."id" = r."jacketId"
    LEFT JOIN "User" u ON u."id" = COALESCE(d."ownerUserId", j."createdByUserId")`);
  const organizationId = resolveDocumentStorageRuntimeFromEnv().organizationId;
  const jackets = await prisma.salesDocumentJacket.findMany({ where: { organizationId, id: { in: all.flatMap(row => row.jacketId ? [row.jacketId] : []) } }, select: { id: true, requirements: true, versions: { select: { phase: true, disposition: true, finalizedAt: true }, orderBy: { finalizedAt: "desc" } }, packet: { select: { auditEvents: { where: { action: { in: ["DEAL_FINANCIAL_RECORDED", "DEAL_MILESTONE_RECORDED"] } }, orderBy: [{ occurredAt: "asc" }, { id: "asc" }], select: { id: true, action: true, metadata: true, occurredAt: true } }, documents: { select: { document: { select: { id: true, documentType: true, status: true, classificationSnapshot: true, source: true, createdAt: true } } } } } } } });
  const jacketMap = new Map(jackets.map(jacket => [jacket.id, jacket]));
  const tasks = await prisma.task.findMany({ where: { ...(!team ? { assignedUserId: user.id } : {}), status: { not: "COMPLETED" }, templateSnapshot: { path: ["dealDashboard", "organizationId"], equals: organizationId } }, select: { id: true, assignedUserId: true, templateSnapshot: true, title: true, dueAt: true }, orderBy: { dueAt: "asc" } });
  const linkedTasks = tasks.filter(task => taskDealLink(task.templateSnapshot)?.organizationId === organizationId);
  const bookings = await prisma.vehicleUseBooking.findMany({ where: { organizationId: dealOrganization(), status: { in: ["CHECKED_OUT", "RETURNED", "RESERVED"] }, OR: [{ contextId: { in: all.flatMap(row => row.draftId ? [row.draftId] : []) } }, { agreementJacketId: { in: all.flatMap(row => row.jacketId ? [row.jacketId] : []) } }] }, select: { contextId: true, agreementJacketId: true, expectedReturnAt: true, status: true }, orderBy: { createdAt: "desc" } });
  const rows: DashboardDeal[] = all.map(row => {
    const jacket = jacketMap.get(row.jacketId || ""), task = linkedTasks.find(task => { const link = taskDealLink(task.templateSnapshot); return Boolean(link && (row.draftId && link.draftId === row.draftId || row.jacketId && link.jacketId === row.jacketId)); });
    const booking = bookings.find(booking => booking.contextId === row.draftId || Boolean(row.jacketId && booking.agreementJacketId === row.jacketId));
    const phase = dealGroup(row.pathway) === "USE" ? jacket?.versions.some(version => version.phase === "CHECKOUT") ? "RETURN" : "CHECKOUT" : "CLOSING";
    const docs = (jacket?.packet.documents || []).map(link => link.document).sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime()).map(document => ({ id: document.id, type: document.documentType, reviewed: document.status === "ACCEPTED", signed: Boolean(document.classificationSnapshot && typeof document.classificationSnapshot === "object" && !Array.isArray(document.classificationSnapshot) && document.classificationSnapshot.signed === true), source: document.source, versionId: "", checksum: "", fileName: "", contentType: "" }));
    const checklist = closingChecklist((Array.isArray(jacket?.requirements) ? jacket.requirements : []) as unknown as SalesDocumentRequirement[], docs, phase);
    const finished = row.packetState === "CLOSED" && checklist.every(item => !item.blocker) || row.status === "COMPLETED" && !row.packetState;
    const inactive = ["LOST", "CANCELLED", "ARCHIVED"].includes(row.status);
    const corrections = row.packetState === "WORKING" && jacket?.versions.some(version => version.disposition === "CLOSED" || version.disposition === "DELIVERED_FUNDING_PENDING");
    const rental = row.pathway === "daily-rental" && !inactive && !finished ? rentalLifecycle(booking) : null;
    const stage = rental || (row.status === "ARCHIVED" ? "Archived" : inactive ? "Closed without completion" : row.packetState === "UNWIND_PENDING" ? "Unwind review pending" : corrections ? "Corrections in progress" : row.packetState === "DELIVERED_FUNDING_PENDING" ? "Awaiting funding" : finished ? "Completed" : row.status === "SOLD" ? "Sold · paperwork pending" : checklist.length > 0 && checklist.every(item => !item.blocker) ? "Ready to finalize" : row.packetState === "CHECKED_OUT" ? "Checkout paperwork finalized" : "Working");
    const history = Array.isArray(row.statusHistory) ? row.statusHistory : [];
    const completion = history.find(event => event && typeof event === "object" && !Array.isArray(event) && ["SOLD", "COMPLETED"].includes(String(event.to)));
    const historyDate = completion && typeof completion === "object" && !Array.isArray(completion) ? String(completion.effectiveAt || completion.at || "") : null;
    const closedDate = chicagoDate(jacket?.versions.filter(version => version.disposition === "CLOSED").reverse()[0]?.finalizedAt);
    const completedDate = stage === "Completed" ? closedDate || chicagoDate(historyDate) : null;
    const soldDate = dealGroup(row.pathway) === "SALES" ? chicagoDate(historyDate) || closedDate : null;
    const missing = checklist.find(item => item.blocker);
    const overdue = Boolean(task && task.dueAt.getTime() < Date.now());
    const auditEvents = jacket?.packet.auditEvents || [];
    const financialEntries = auditEvents.filter(event => event.action === "DEAL_FINANCIAL_RECORDED").flatMap(event => { const entry = financialEntry(event.id, event.metadata, event.occurredAt.toISOString()); return entry ? [entry] : []; });
    const milestone = (dimension: string): DealMilestone | null => { const event = auditEvents.filter(event => event.action === "DEAL_MILESTONE_RECORDED" && record(event.metadata).dimension === dimension).at(-1); return event ? { ...record(event.metadata), at: event.occurredAt.toISOString() } as DealMilestone : null; };
    const soldAgeDays = dealAgeDays(chicagoDate(historyDate)), ageDays = dealAgeDays(chicagoDate(row.createdAt));
    const unattended = !inactive && stage !== "Completed" && !task;
    const returnOverdue = Boolean(booking?.status === "CHECKED_OUT" && booking.expectedReturnAt.getTime() <= Date.now());
    const expiration = String((row as SourceRow & { insuranceExpirationDate?: string }).insuranceExpirationDate || "");
    const expiredInsurance = /^\d{4}-\d{2}-\d{2}$/.test(expiration) && expiration < chicagoDate(new Date())!;
    const alerts = [...(rental === "Rental Due Soon" ? ["Rental due within 24 hours · confirm return"] : []),...(overdue ? ["Deal follow-up overdue"] : []), ...(returnOverdue ? ["Vehicle return due"] : []), ...(row.status === "SOLD" && stage !== "Completed" && soldAgeDays >= 3 ? [`Sold ${soldAgeDays} days ago · paperwork pending`] : []), ...(expiredInsurance ? [`Recorded insurance expired ${expiration} · verify coverage`] : []), ...(unattended ? ["No scheduled deal follow-up"] : [])];
    const documentChecklist = (["CLOSING", "CHECKOUT", "RETURN"] as const).flatMap(packetPhase => closingChecklist((Array.isArray(jacket?.requirements) ? jacket.requirements : []) as unknown as SalesDocumentRequirement[], docs, packetPhase).map(item => {
      const latest = docs.find(document => document.type === item.id && document.source !== "GENERATED") || docs.find(document => document.type === item.id);
      return { id: item.id, label: item.label, phase: packetPhase, status: item.waiver ? "Approved exception" : item.ready ? item.signed ? "Signed and reviewed" : "Reviewed" : !item.required && !latest ? "Not required" : !latest ? "Missing" : item.signed && (!latest.signed || latest.source === "GENERATED") ? "Signed copy needed" : "Needs staff review" };
    }));
    return { id: row.id, draftId: row.draftId, draftRevision: row.draftRevision, jacketId: row.jacketId, dealNumber: row.dealNumber,
      customerId: row.customerId, customerName: row.customerName, vehicleReference: row.vehicleReference, pathway: row.pathway, status: row.status, packetState: row.packetState, updatedAt: row.updatedAt.toISOString(),
      ownerId: row.ownerId, ownerName: row.ownerName, stage, dealStage: row.pathway === "daily-rental" && booking && ["CHECKED_OUT", "RETURNED"].includes(booking.status) ? "Delivered" : null, completedDate, soldDate, documentChecklist, createdDate: chicagoDate(row.createdAt), documentsReady: checklist.filter(item => item.ready).length, documentsTotal: checklist.length,
      nextAction: rental === "Rental Overdue" ? "Contact customer and record actual return or approved extension" : rental === "Rental Due Soon" ? "Confirm expected return" : rental === "Rental Active" ? "Monitor rental" : rental === "Rental Returned" ? "Review return condition and close rental paperwork" : stage === "Unwind review pending" ? "Manager: reconcile payments, funding, vehicle, title and taxes" : task?.title || (returnOverdue ? "Record vehicle return" : stage === "Completed" ? "Review completed packet" : stage === "Awaiting funding" ? "Confirm funding" : row.status === "SOLD" && !row.jacketId ? "Start paperwork checklist" : row.status === "SOLD" && !missing ? "Finalize paperwork" : stage === "Ready to finalize" ? "Finalize packet" : missing ? missing.label : row.pathway === "repairs" ? "Continue repair check-in" : row.jacketId ? "Review packet" : "Prepare packet"),
      indicators: { canEdit: !row.draftId || row.ownerId === user.id, ageDays, soldAgeDays, unattended, overdue, returnDueAt: booking?.status === "CHECKED_OUT" ? booking.expectedReturnAt.toISOString() : null, alerts, funding: milestone("FUNDING"), delivery: milestone("DELIVERY"), financials: row.jacketId ? summarizeDealFinancials(financialEntries, range) : null },
      dueAt: task?.dueAt.toISOString() || (booking && ["RESERVED", "CHECKED_OUT"].includes(booking.status) ? booking.expectedReturnAt.toISOString() : null), taskHref: task && stage !== "Unwind review pending" ? `/tasks/${encodeURIComponent(task.id)}` : null, needsAttention: !inactive && (overdue || returnOverdue || rental === "Rental Due Soon" || expiredInsurance || stage !== "Completed" && (row.status === "SOLD" || stage === "Unwind review pending" || Boolean(corrections) || Boolean(missing) || unattended || !row.jacketId)) };
  });
  const owners = [...new Map(rows.map(row => [row.ownerId, { id: row.ownerId, name: row.ownerName }])).values()];
  const search = (params.get("search") || "").trim().slice(0, 240).toLowerCase(), pathway = params.get("pathway") || "ALL";
  const filtered = rows.filter(row => (workspace !== "MY" || row.ownerId === user.id || linkedTasks.some(task => task.assignedUserId === user.id && (taskDealLink(task.templateSnapshot)?.draftId === row.draftId && Boolean(row.draftId) || taskDealLink(task.templateSnapshot)?.jacketId === row.jacketId && Boolean(row.jacketId)))) && (group === "ALL" || dealGroup(row.pathway) === group) && (pathway === "ALL" || row.pathway === pathway) && (owner === "ALL" || row.ownerId === (owner === "ME" ? user.id : owner)) && [row.customerName, row.vehicleReference, row.dealNumber || "", row.id].join(" ").toLowerCase().includes(search));
  const uniqueMap = new Map<string, DashboardDeal>();
  for (const row of [...filtered].sort((left, right) => Number(left.status === "ARCHIVED") - Number(right.status === "ARCHIVED") || right.updatedAt.localeCompare(left.updatedAt))) if (!uniqueMap.has(row.jacketId || row.id)) uniqueMap.set(row.jacketId || row.id, row);
  const unique = [...uniqueMap.values()];
  const summary = summarizeDeals(unique, range), counts: Record<string, number> = {};
  const countRows = [...unique.filter(row => row.status !== "ARCHIVED"), ...filtered.filter(row => row.status === "ARCHIVED")];
  for (const row of countRows) counts[row.status] = (counts[row.status] || 0) + 1;
  const status = params.get("status") || "CURRENT";
  const selected = countRows.filter(row => (status === "ALL" || (status === "CURRENT" ? row.status !== "ARCHIVED" : row.status === status)) && (bucket === "ALL" || (bucket === "attention" ? row.needsAttention : bucket === "paperwork" ? row.status === "SOLD" && row.stage !== "Completed" : bucket === "overdue" ? row.indicators?.overdue : bucket === "unattended" ? row.indicators?.unattended : bucket === "aging" ? row.status === "SOLD" && row.stage !== "Completed" && (row.indicators?.soldAgeDays ?? 0) >= 3 : bucket === "returns" ? row.indicators?.returnDueAt && new Date(row.indicators.returnDueAt).getTime() <= Date.now() : bucket === "completed" ? row.stage === "Completed" && row.completedDate && row.completedDate >= range.start && row.completedDate <= range.end : row.stage === ({ working: "Working", ready: "Ready to finalize", funding: "Awaiting funding" }[bucket]))));
  selected.sort((left, right) => Number(Boolean(right.indicators?.overdue)) - Number(Boolean(left.indicators?.overdue)) || Number(right.needsAttention) - Number(left.needsAttention) || (left.dueAt && right.dueAt ? left.dueAt.localeCompare(right.dueAt) : left.dueAt ? -1 : right.dueAt ? 1 : 0) || right.updatedAt.localeCompare(left.updatedAt));
  const page = Math.max(1, Number(params.get("page") || 1)), pageSize = [25, 50, 100].includes(Number(params.get("pageSize"))) ? Number(params.get("pageSize")) : 25;
  let taxes: { available: boolean; message: string; summary?: ReturnType<typeof summarizeTax> } = { available: false, message: "Tax-ledger totals require manager access." };
  try {
    const access = await complianceAccess(user);
    const records = await prisma.complianceTaxRecord.findMany({ where: { organizationId: access.organizationId, status: "ACTIVE", month: { in: [...new Set([range.start.slice(0, 7), range.end.slice(0, 7)])] } }, select: { id: true, snapshot: true, status: true } });
    const ledger = records.map(record => ({ ...record, snapshot: record.snapshot as unknown as TaxCalculation })).filter(record => record.snapshot.input.date >= range.start && record.snapshot.input.date <= range.end);
    taxes = { available: true, message: "Tax ledger for the selected dates, across all sales and leases. Pathway and owner filters do not change these ledger totals.", summary: summarizeTax(ledger) };
  } catch (error) { if (!(error && typeof error === "object" && "status" in error && error.status === 403)) taxes = { available: false, message: "Tax ledger could not be loaded. Open Compliance to review it; no zero tax total has been assumed." }; }
  const financialDeals = unique.filter(row => row.status !== "ARCHIVED" || (row.indicators?.financials?.entryCount ?? 0) > 0);
  const financialRows = financialDeals.flatMap(row => row.indicators?.financials ? [row.indicators.financials] : []);
  const financials = { scope: "Selected accessible deals, including archived deals with financial records. Balances are current; activity uses the selected business dates. Verified records only; no draft estimates or bank processing are implied.", recordedDeals: financialRows.filter(row => row.entryCount > 0).length, missingAgreedAmounts: financialDeals.length - financialRows.filter(row => row.agreedCents !== null).length, agreedCents: financialRows.reduce((sum, row) => sum + (row.agreedCents || 0), 0), outstandingCents: financialRows.reduce((sum, row) => sum + (row.outstandingCents || 0), 0), creditCents: financialRows.reduce((sum, row) => sum + row.creditCents, 0), paymentsCents: financialRows.reduce((sum, row) => sum + row.periodPaymentsCents, 0), refundsCents: financialRows.reduce((sum, row) => sum + row.periodRefundsCents, 0), reversalsCents: financialRows.reduce((sum, row) => sum + row.periodReversalsCents, 0), netCents: financialRows.reduce((sum, row) => sum + row.periodNetCents, 0) };
  return { items: selected.slice((page - 1) * pageSize, page * pageSize), total: selected.length, pages: Math.max(1, Math.ceil(selected.length / pageSize)), page, counts, dashboard: { range, summary, owners, taxes, canManage, actorId: user.id, workspace, financials: canManage ? financials : null, scope: `${team ? "Manager team work" : workspace === "MY" ? "My assigned work" : "Accessible work"}. Due dates come from exact deal-linked reminders or active vehicle returns. General customer reminders are unchanged in Tasks.` } };
}
