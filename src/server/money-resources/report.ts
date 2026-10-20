import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/client";
import type { AuthenticatedUser } from "@/server/auth/store";
import { moneyAccess } from "./service";
import { businessDate, csvCell, moneyFlags, moneyToday, MoneyError, signedExpense, text } from "@/lib/money-resources";
import { savedPurchasingFlags } from "@/lib/money-purchasing";

export async function moneyExpenseReport(actor: AuthenticatedUser | null, query: URLSearchParams, allRows = false) {
  const access = await moneyAccess(actor);
  const from = businessDate(query.get("from") || moneyToday()), to = businessDate(query.get("to") || from);
  if (from > to || (Date.parse(to) - Date.parse(from)) / 86400000 > 366) throw new MoneyError("Choose a date range of up to one year.");
  const employeeId = text(query.get("employeeId")), status = text(query.get("status")), evidence = text(query.get("evidence"));
  if (!access.manager && employeeId && employeeId !== access.actor.id) throw new MoneyError("Staff reports are limited to your own spending.", 403);
  if (status && !["PENDING", "APPROVED", "REJECTED", "SETTLED", "SUPERSEDED"].includes(status)) throw new MoneyError("Choose a valid approval status.");
  if (evidence && !["MISSING", "ATTACHED", "EXCEPTION"].includes(evidence)) throw new MoneyError("Choose a valid receipt filter.");
  const where: Prisma.MoneyEntryWhereInput = { organizationId: access.organizationId, employeeId: access.manager ? employeeId || undefined : access.actor.id, kind: { in: ["EXPENSE", "REFUND"] }, businessDate: { gte: from, lte: to }, approvalStatus: status || { not: "SUPERSEDED" } };
  for (const field of ["vendorId", "accountId", "vehicleId", "repairOrderId"] as const) if (query.get(field)) where[field] = text(query.get(field));
  if (evidence) { where.kind = "EXPENSE"; if (evidence === "ATTACHED") where.receiptDocumentId = { not: null }; else { where.receiptDocumentId = null; where.receiptExplanation = evidence === "EXCEPTION" ? { not: null } : null; } }
  const entries = await prisma.moneyEntry.findMany({ where, include: { employee: { select: { name: true } }, vendor: { select: { name: true } }, account: { select: { label: true, lastFour: true, limitCents: true } }, vehicle: { select: { year: true, make: true, model: true, stockNumber: true, vehicleNumber: true } }, repairOrder: { select: { repairOrderNumber: true } } }, orderBy: [{ businessDate: "desc" }, { id: "desc" }], take: 10001 });
  if (entries.length > 10000) throw new MoneyError("More than 10,000 records match. Narrow the date range or filters; totals have not been truncated.", 413);
  const actors = entries.length ? await prisma.$queryRaw<Array<{ id: string; name: string }>>(Prisma.sql`SELECT audit.result->>'id' AS id, person.name FROM "MoneyAudit" audit JOIN "User" person ON person.id=audit."actorUserId" WHERE audit."organizationId"=${access.organizationId} AND audit.action IN ('RECORD','CORRECT') AND audit.result->>'id' IN (${Prisma.join(entries.map(row => row.id))})`) : [];
  const recorder = new Map(actors.map(item => [item.id, item.name]));
  let rows = entries.map(row => ({ id: row.id, date: row.businessDate, employeeId: row.employeeId, employee: row.employee.name, recordedBy: recorder.get(row.id) || "See history", kind: row.kind, amountCents: row.amountCents, expenseEffectCents: signedExpense(row), merchant: row.merchant, purpose: row.purpose, category: row.category, vendor: row.vendor?.name || row.merchant || "Not specified", account: row.account ? `${row.account.label}${row.account.lastFour ? ` · •••• ${row.account.lastFour}` : ""}` : row.paymentMethod, vehicle: row.vehicle ? [row.vehicle.year, row.vehicle.make, row.vehicle.model, row.vehicle.stockNumber || row.vehicle.vehicleNumber].filter(Boolean).join(" · ") : "", vehicleId: row.vehicleId, repairOrder: row.repairOrder?.repairOrderNumber || "", approvalStatus: row.approvalStatus, receipt: row.receiptDocumentId ? "Attached" : row.receiptExplanation ? "Exception explained" : row.kind === "EXPENSE" ? "Missing" : "Not applicable", receiptUrl: row.receiptDocumentId ? `/api/money-resources/${row.id}/receipt` : null, priorApproval: row.purchaseApprovalId ? "Linked" : "Not linked", flags: [...moneyFlags(row, entries, row.account?.limitCents), ...savedPurchasingFlags(row.purchasingSnapshot)], reference: row.reference }));
  if (query.get("exceptions") === "1") rows = rows.filter(row => row.flags.length || row.approvalStatus === "REJECTED");
  const groupBy = query.get("groupBy") || "employee";
  if (!["employee", "vendor", "account", "category"].includes(groupBy)) throw new MoneyError("Choose employee, vendor, card or category grouping.");
  const grouped = new Map<string, { label: string; count: number; netCents: number }>();
  for (const row of rows) { const label = row[groupBy as "employee" | "vendor" | "account" | "category"]; const group = grouped.get(label) || { label, count: 0, netCents: 0 }; group.count++; group.netCents += row.expenseEffectCents; grouped.set(label, group); }
  const page = Number(query.get("page") || "1");
  if (!Number.isSafeInteger(page) || page < 1) throw new MoneyError("Choose a valid report page.");
  const totals = { count: rows.length, netCents: rows.reduce((sum, row) => sum + row.expenseEffectCents, 0), purchasesCents: rows.filter(row => row.kind === "EXPENSE").reduce((sum, row) => sum + row.expenseEffectCents, 0), refundsCents: Math.abs(rows.filter(row => row.kind === "REFUND").reduce((sum, row) => sum + row.expenseEffectCents, 0)), exceptions: rows.filter(row => row.flags.length || row.approvalStatus === "REJECTED").length };
  const first = rows[0];
  const filterSummary = [!access.manager ? "Your spending" : employeeId ? `Employee: ${first?.employee || "Selected employee"}` : "All staff", query.get("vendorId") ? `Vendor: ${first?.vendor || "Selected vendor"}` : "All vendors", query.get("accountId") ? `Funding: ${first?.account || "Selected funding source"}` : "All funding sources", query.get("vehicleId") ? `Vehicle: ${first?.vehicle || "Selected vehicle"}` : "All vehicles", query.get("repairOrderId") ? `RO: ${first?.repairOrder || "Selected repair order"}` : "All repair orders", `Approval: ${status || "All current statuses"}`, `Receipt: ${evidence || "All evidence"}`, `Grouped by ${groupBy}`, ...(query.get("exceptions") === "1" ? ["Exceptions only"] : [])];
  const unmatchedCardCharges = access.manager ? await prisma.moneyCardCharge.count({ where: { organizationId: access.organizationId, matchedEntryId: null, businessDate: { gte: from, lte: to }, ...(query.get("accountId") ? { accountId: text(query.get("accountId")) } : {}) } }) : null;
  return { from, to, page, pageSize: 50, totals, filterSummary, groups: [...grouped.values()].sort((first, second) => first.label.localeCompare(second.label)), unmatchedCardCharges, rows: allRows ? rows : rows.slice((page - 1) * 50, page * 50) };
}
export type MoneyExpenseReport = Awaited<ReturnType<typeof moneyExpenseReport>>;
export function expenseReportCsv(report: MoneyExpenseReport) {
  const headers = ["record_id", "date", "employee", "recorded_by", "kind", "vendor", "card_or_source", "purpose", "category", "amount_usd", "expense_effect_usd", "approval", "receipt", "vehicle", "repair_order", "prior_approval", "exceptions", "reference"];
  const rows = report.rows.map(row => [row.id, row.date, row.employee, row.recordedBy, row.kind, row.vendor, row.account, row.purpose, row.category, (row.amountCents / 100).toFixed(2), (row.expenseEffectCents / 100).toFixed(2), row.approvalStatus, row.receipt, row.vehicle, row.repairOrder, row.priorApproval, row.flags.join("; "), row.reference]);
  return [headers, ...rows].map(row => row.map(csvCell).join(",")).join("\r\n");
}
