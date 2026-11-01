import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/client";
import type { AuthenticatedUser } from "@/server/auth/store";
import { chicagoDate, DEAL_GROUPS, dealGroup, reportingRange, summarizeDeals, type DashboardDeal } from "@/lib/deal-dashboard";
import { moneyToday } from "@/lib/money-resources";
import { summarizeTax, type TaxCalculation } from "@/lib/compliance-tax";
import { complianceAccess } from "@/server/compliance/service";
import { closingChecklist, SalesDocumentsError } from "./domain";
import type { SalesDocumentRequirement } from "@/lib/sales-document-pathways";
import { requireSalesDocumentsUser } from "./service";

type SourceRow = Omit<DashboardDeal, "stage" | "nextAction" | "dueAt" | "taskHref" | "completedDate" | "createdDate" | "documentsReady" | "documentsTotal" | "needsAttention" | "updatedAt"> & { updatedAt: Date; createdAt: Date; statusHistory: Prisma.JsonValue };
export async function buildDealDashboard(user: AuthenticatedUser, source: Prisma.Sql, params: URLSearchParams) {
  let range: ReturnType<typeof reportingRange>;
  try { range = reportingRange(params.get("date") || moneyToday(), params.get("period") || "month"); }
  catch { throw new SalesDocumentsError("Choose a valid report date and Day, Week, or Month."); }
  const group = params.get("group") || "ALL", owner = params.get("owner") || "ALL", bucket = params.get("bucket") || "ALL";
  if (!Object.hasOwn(DEAL_GROUPS, group) || !["ALL", "attention", "working", "ready", "funding", "completed", "overdue"].includes(bucket)) throw new SalesDocumentsError("Choose a valid dashboard filter.");
  const all = await prisma.$queryRaw<SourceRow[]>(Prisma.sql`SELECT r.*, COALESCE(d."customerId", j."customerId") AS "customerId",
    COALESCE(d."ownerUserId", j."createdByUserId") AS "ownerId", COALESCE(u."name", 'Unassigned') AS "ownerName",
    COALESCE(d."createdAt", j."createdAt") AS "createdAt", d."statusHistory"
    FROM (${source} SELECT * FROM records) r
    LEFT JOIN "DealDeskDraft" d ON d."id" = r."draftId"
    LEFT JOIN "SalesDocumentJacket" j ON j."id" = r."jacketId"
    LEFT JOIN "User" u ON u."id" = COALESCE(d."ownerUserId", j."createdByUserId")`);
  const jackets = await prisma.salesDocumentJacket.findMany({ where: { id: { in: all.flatMap(row => row.jacketId ? [row.jacketId] : []) } }, select: { id: true, requirements: true, versions: { select: { phase: true, disposition: true, finalizedAt: true }, orderBy: { finalizedAt: "desc" } }, packet: { select: { documents: { select: { document: { select: { id: true, documentType: true, status: true, classificationSnapshot: true, source: true, createdAt: true } } } } } } } });
  const jacketMap = new Map(jackets.map(jacket => [jacket.id, jacket]));
  const tasks = await prisma.task.findMany({ where: { assignedUserId: user.id, customerId: { in: all.flatMap(row => row.customerId ? [row.customerId] : []) }, status: { not: "COMPLETED" } }, select: { id: true, customerId: true, title: true, dueAt: true }, orderBy: { dueAt: "asc" } });
  const taskMap = new Map<string, typeof tasks[number]>();
  for (const task of tasks) if (task.customerId && !taskMap.has(task.customerId)) taskMap.set(task.customerId, task);
  const rows: DashboardDeal[] = all.map(row => {
    const jacket = jacketMap.get(row.jacketId || ""), task = taskMap.get(row.customerId || "");
    const phase = dealGroup(row.pathway) === "USE" ? jacket?.versions.some(version => version.phase === "CHECKOUT") ? "RETURN" : "CHECKOUT" : "CLOSING";
    const docs = (jacket?.packet.documents || []).map(link => link.document).sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime()).map(document => ({ id: document.id, type: document.documentType, reviewed: document.status === "ACCEPTED", signed: Boolean(document.classificationSnapshot && typeof document.classificationSnapshot === "object" && !Array.isArray(document.classificationSnapshot) && document.classificationSnapshot.signed === true), source: document.source, versionId: "", checksum: "", fileName: "", contentType: "" }));
    const checklist = closingChecklist((Array.isArray(jacket?.requirements) ? jacket.requirements : []) as unknown as SalesDocumentRequirement[], docs, phase);
    const finished = ["SOLD", "COMPLETED"].includes(row.status) || row.packetState === "CLOSED";
    const inactive = ["LOST", "CANCELLED", "ARCHIVED"].includes(row.status);
    const corrections = row.packetState === "WORKING" && jacket?.versions.some(version => version.disposition === "CLOSED" || version.disposition === "DELIVERED_FUNDING_PENDING");
    const stage = row.status === "ARCHIVED" ? "Archived" : inactive ? "Closed without completion" : row.packetState === "UNWIND_PENDING" ? "Unwind review pending" : corrections ? "Corrections in progress" : row.packetState === "DELIVERED_FUNDING_PENDING" ? "Awaiting funding" : finished ? "Completed" : checklist.length > 0 && checklist.every(item => !item.blocker) ? "Ready to finalize" : row.packetState === "CHECKED_OUT" ? "Checkout paperwork finalized" : "Working";
    const history = Array.isArray(row.statusHistory) ? row.statusHistory : [];
    const completion = history.find(event => event && typeof event === "object" && !Array.isArray(event) && ["SOLD", "COMPLETED"].includes(String(event.to)));
    const historyDate = completion && typeof completion === "object" && !Array.isArray(completion) ? String(completion.effectiveAt || completion.at || "") : null;
    const closedDate = chicagoDate(jacket?.versions.filter(version => version.disposition === "CLOSED").reverse()[0]?.finalizedAt);
    const completedDate = stage === "Completed" ? closedDate || chicagoDate(historyDate) : null;
    const soldDate = dealGroup(row.pathway) === "SALES" ? chicagoDate(historyDate) || closedDate : null;
    const missing = checklist.find(item => item.blocker);
    const overdue = Boolean(task && task.dueAt.getTime() < Date.now());
    const documentChecklist = (["CLOSING", "CHECKOUT", "RETURN"] as const).flatMap(packetPhase => closingChecklist((Array.isArray(jacket?.requirements) ? jacket.requirements : []) as unknown as SalesDocumentRequirement[], docs, packetPhase).map(item => {
      const latest = docs.find(document => document.type === item.id && document.source !== "GENERATED") || docs.find(document => document.type === item.id);
      return { id: item.id, label: item.label, phase: packetPhase, status: item.waiver ? "Approved exception" : item.ready ? item.signed ? "Signed and reviewed" : "Reviewed" : !item.required && !latest ? "Not required" : !latest ? "Missing" : item.signed && (!latest.signed || latest.source === "GENERATED") ? "Signed copy needed" : "Needs staff review" };
    }));
    return { id: row.id, draftId: row.draftId, draftRevision: row.draftRevision, jacketId: row.jacketId, dealNumber: row.dealNumber,
      customerId: row.customerId, customerName: row.customerName, vehicleReference: row.vehicleReference, pathway: row.pathway, status: row.status, packetState: row.packetState, updatedAt: row.updatedAt.toISOString(),
      ownerId: row.ownerId, ownerName: row.ownerName, stage, completedDate, soldDate, documentChecklist, createdDate: chicagoDate(row.createdAt), documentsReady: checklist.filter(item => item.ready).length, documentsTotal: checklist.length,
      nextAction: stage === "Unwind review pending" ? "Manager: reconcile payments, funding, vehicle, title and taxes" : task?.title || (stage === "Completed" ? "Review completed packet" : stage === "Awaiting funding" ? "Confirm funding" : stage === "Ready to finalize" ? "Finalize packet" : missing ? missing.label : row.pathway === "repairs" ? "Continue repair check-in" : row.jacketId ? "Review packet" : "Prepare packet"),
      dueAt: task?.dueAt.toISOString() || null, taskHref: task && stage !== "Unwind review pending" ? `/tasks/${encodeURIComponent(task.id)}` : null, needsAttention: !inactive && stage !== "Completed" && (stage === "Unwind review pending" || Boolean(corrections) || Boolean(missing) || overdue || !row.jacketId) };
  });
  const owners = [...new Map(rows.map(row => [row.ownerId, { id: row.ownerId, name: row.ownerName }])).values()];
  const search = (params.get("search") || "").trim().slice(0, 240).toLowerCase(), pathway = params.get("pathway") || "ALL";
  const filtered = rows.filter(row => (group === "ALL" || dealGroup(row.pathway) === group) && (pathway === "ALL" || row.pathway === pathway) && (owner === "ALL" || row.ownerId === (owner === "ME" ? user.id : owner)) && [row.customerName, row.vehicleReference, row.dealNumber || "", row.id].join(" ").toLowerCase().includes(search));
  const uniqueMap = new Map<string, DashboardDeal>();
  for (const row of [...filtered].sort((left, right) => Number(left.status === "ARCHIVED") - Number(right.status === "ARCHIVED") || right.updatedAt.localeCompare(left.updatedAt))) if (!uniqueMap.has(row.jacketId || row.id)) uniqueMap.set(row.jacketId || row.id, row);
  const unique = [...uniqueMap.values()];
  const summary = summarizeDeals(unique, range), counts: Record<string, number> = {};
  const countRows = [...unique.filter(row => row.status !== "ARCHIVED"), ...filtered.filter(row => row.status === "ARCHIVED")];
  for (const row of countRows) counts[row.status] = (counts[row.status] || 0) + 1;
  const status = params.get("status") || "CURRENT";
  const selected = countRows.filter(row => (status === "ALL" || (status === "CURRENT" ? row.status !== "ARCHIVED" : row.status === status)) && (bucket === "ALL" || (bucket === "attention" ? row.needsAttention : bucket === "overdue" ? row.dueAt && new Date(row.dueAt).getTime() < Date.now() : bucket === "completed" ? row.stage === "Completed" && row.completedDate && row.completedDate >= range.start && row.completedDate <= range.end : row.stage === ({ working: "Working", ready: "Ready to finalize", funding: "Awaiting funding" }[bucket]))));
  selected.sort((left, right) => Number(right.needsAttention) - Number(left.needsAttention) || right.updatedAt.localeCompare(left.updatedAt));
  const page = Math.max(1, Number(params.get("page") || 1)), pageSize = [25, 50, 100].includes(Number(params.get("pageSize"))) ? Number(params.get("pageSize")) : 25;
  let taxes: { available: boolean; message: string; summary?: ReturnType<typeof summarizeTax> } = { available: false, message: "Tax-ledger totals require manager access." };
  try {
    const access = await complianceAccess(user);
    const records = await prisma.complianceTaxRecord.findMany({ where: { organizationId: access.organizationId, status: "ACTIVE", month: { in: [...new Set([range.start.slice(0, 7), range.end.slice(0, 7)])] } }, select: { id: true, snapshot: true, status: true } });
    const ledger = records.map(record => ({ ...record, snapshot: record.snapshot as unknown as TaxCalculation })).filter(record => record.snapshot.input.date >= range.start && record.snapshot.input.date <= range.end);
    taxes = { available: true, message: "Tax ledger for the selected dates, across all sales and leases. Pathway and owner filters do not change these ledger totals.", summary: summarizeTax(ledger) };
  } catch (error) { if (!(error && typeof error === "object" && "status" in error && error.status === 403)) taxes = { available: false, message: "Tax ledger could not be loaded. Open Compliance to review it; no zero tax total has been assumed." }; }
  let canManage = false;
  try { requireSalesDocumentsUser(user, true); canManage = true; } catch {}
  return { items: selected.slice((page - 1) * pageSize, page * pageSize), total: selected.length, pages: Math.max(1, Math.ceil(selected.length / pageSize)), page, counts, dashboard: { range, summary, owners, taxes, canManage, scope: "Your drafts and packets you are permitted to access. Due dates show your customer follow-up tasks." } };
}
