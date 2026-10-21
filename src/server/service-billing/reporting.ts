import type { AuthenticatedUser } from "@/server/auth/store";
import { assertAuthenticatedUser } from "@/server/policies/access";
import { prisma } from "@/server/db/client";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { billingAccess } from "./service";
import { serviceInvoiceBalance } from "@/lib/service-billing";

export function reportPeriod(from: string, to: string) {
  if (![from, to].every(value => /^\d{4}-\d{2}-\d{2}$/.test(value))) throw new Error("Use YYYY-MM-DD report dates.");
  const start = new Date(`${from}T00:00:00Z`), end = new Date(`${to}T00:00:00Z`);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start.toISOString().slice(0, 10) !== from || end.toISOString().slice(0, 10) !== to || end < start || end.getTime() - start.getTime() > 366 * 86400000) throw new Error("Choose a valid report period of at most 367 calendar days.");
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}
export function serviceReportCsv(rows: Record<string, string | number>[]) {
  const keys = rows.length ? Object.keys(rows[0]) : ["No records"];
  const cell = (value: string | number) => `"${String(value).replace(/^[\s]*[=+@-]/, match => `'${match}`).replaceAll('"', '""')}"`;
  return [keys.map(cell).join(","), ...rows.map(row => keys.map(key => cell(row[key] ?? "")).join(","))].join("\r\n");
}
export async function getLaborBillingReport(actor: AuthenticatedUser | null, from: string, to: string, locationId?: string) {
  assertAuthenticatedUser(actor);
  const { start, end } = reportPeriod(from, to), organizationId = INITIAL_ORGANIZATION.id;
  const locations = await prisma.location.findMany({ where: { organizationId, ...(locationId ? { id: locationId } : {}) }, select: { id: true, name: true } });
  const allowed: typeof locations = [];
  for (const location of locations) {
    try { await billingAccess(actor, location.id); allowed.push(location); }
    catch (error) { if (locationId || !(error instanceof Error) || !error.message.startsWith("Vehicle capability required:")) throw error; }
  }
  if (!allowed.length) throw new Error("Vehicle capability required: SERVICE_BILLING_VIEW for the selected locations.");
  const scoped = { organizationId, locationId: { in: allowed.map(location => location.id) } };
  const scopedOrders = await prisma.repairOrder.findMany({ where: scoped, select: { id: true }, take: 10001 });
  if(scopedOrders.length>10000)throw new Error("Location scope exceeds 10,000 ROs. Select a narrower location.");
  const scopedInvoices = await prisma.serviceInvoice.findMany({where:{organizationId,repairOrderId:{in:scopedOrders.map(order=>order.id)}},select:{id:true,invoiceNumber:true},take:10001});
  if(scopedInvoices.length>10000)throw new Error("Location scope exceeds 10,000 invoices. Select a narrower location.");
  const activity = await prisma.serviceInvoiceEntry.findMany({where:{organizationId,invoiceId:{in:scopedInvoices.map(invoice=>invoice.id)},occurredAt:{gte:start,lt:end}},orderBy:[{occurredAt:"asc"},{id:"asc"}],take:1001});
  if(activity.length>1000)throw new Error("Receipt activity exceeds 1,000 records. Narrow the period or location.");
  const invoices = await prisma.serviceInvoice.findMany({ where: { organizationId, issuedAt: { gte: start, lt: end }, repairOrderId: { in: scopedOrders.map(order=>order.id) } }, orderBy: [{ issuedAt: "asc" }, { id: "asc" }], take: 1001 });
  const orders = await prisma.repairOrder.findMany({ where: { ...scoped, openedAt: { gte: start, lt: end } }, orderBy: [{ openedAt: "asc" }, { id: "asc" }], take: 1001, include: { estimateVersions: { orderBy: { version: "desc" }, take: 1 }, authorizations: { orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 1 }, repairJobs: { include: { laborClocks: true, qualityInspections: {orderBy:{version:"asc"}}, comebackCases:{select:{id:true,status:true}} } } } });
  if (invoices.length > 1000 || orders.length > 1000) throw new Error("Report exceeds 1,000 records. Narrow the dates or location; totals are not silently truncated.");
  const entries = await prisma.serviceInvoiceEntry.findMany({ where: { organizationId, invoiceId: { in: invoices.map(invoice => invoice.id) } },take:10001 });
  if(entries.length>10000)throw new Error("Receipt history exceeds 10,000 records. Narrow the period or location.");
  return {
    generatedAt: new Date().toISOString(), from, to, timezone: "UTC", locations: allowed,
    basis: "Financial rows are invoices issued in this UTC period with current all-time receipt balances, not period cash receipts; the separate activity rows are verified manual/external financial records occurring in this period (no processor settlement assertion). Operational rows are ROs opened in this UTC period, with current latest estimates/authorizations and measured clocks. Proposed minutes are not validated standards or measured time. Quoted component charges are gross before the separately recorded discount; stored accumulated clock minutes are not a vehicle-specific standard or an employee disciplinary measure. No accounting revenue-recognition or tax filing assertion is made.",
    activity: activity.map(entry=>({receiptId:entry.id,invoice:scopedInvoices.find(invoice=>invoice.id===entry.invoiceId)!.invoiceNumber,kind:entry.kind,amountCents:entry.amountCents,method:entry.method??"ADJUSTMENT",reference:entry.reference,occurredAt:entry.occurredAt.toISOString()})),
    financial: invoices.map(invoice => { const balance = serviceInvoiceBalance(invoice, entries.filter(entry => entry.invoiceId === invoice.id)); const ledger=invoice.ledger as Record<string,unknown>; const recorded=(key:string)=>{const value=ledger[key];if(typeof value!=="number"||!Number.isSafeInteger(value)||value<0)throw new Error("Native invoice report source is incomplete; repair its provenance before reporting.");return value;}; const measured=recorded("measuredTechnicianMinutes"),labor=recorded("laborSubtotalCents"); return { invoice: invoice.invoiceNumber, repairOrderId: invoice.repairOrderId, issuedAt: invoice.issuedAt.toISOString(), status: invoice.status, subtotalCents: invoice.subtotalCents, discountCents: invoice.discountCents, taxCents: invoice.taxCents, totalCents: invoice.totalCents, grossLaborChargeCents:labor,grossPartsChargeCents:recorded("partsSubtotalCents"),grossFeeChargeCents:recorded("feeSubtotalCents"),proposedMinutes:recorded("proposedMinutes"),measuredTechnicianMinutes:measured,grossLaborChargePerMeasuredHourCents:measured>0?Math.round(labor*60/measured):"UNKNOWN", ...balance }; }),
    operational: orders.map(order => { const estimate = order.estimateVersions[0], authorization = order.authorizations[0]; return { repairOrder: order.repairOrderNumber, repairOrderId: order.id, location: allowed.find(location => location.id === order.locationId)!.name, stage: order.stage, closed: order.closedAt ? "YES" : "NO", estimateVersion: estimate?.version ?? 0, estimateCents: estimate?.totalCents ?? 0, authorization: authorization?.disposition ?? "NOT_RECORDED", authorizationCurrent: authorization?.estimateVersionId === estimate?.id && Boolean(authorization) ? "YES" : "NO", approvedCents: authorization?.authorizedAmountCents ?? 0, proposedMinutes: order.repairJobs.filter(job => job.status !== "CANCELLED").reduce((sum, job) => sum + job.laborGuideMinutes, 0), measuredTechnicianMinutes: order.repairJobs.flatMap(job => job.laborClocks).reduce((sum, clock) => sum + clock.accumulatedMinutes, 0), openClockCount:order.repairJobs.flatMap(job=>job.laborClocks).filter(clock=>clock.state!=="FINISHED").length,firstPassQcJobs:order.repairJobs.filter(job=>job.qualityInspections[0]?.disposition==="PASSED").length,comebackCases:order.repairJobs.reduce((sum,job)=>sum+job.comebackCases.length,0),openAgeDays:order.closedAt?0:Math.max(0,Math.floor((Date.now()-order.openedAt.getTime())/86400000)),qcPassedJobs: order.repairJobs.filter(job => job.status === "QC_PASSED").length, totalJobs: order.repairJobs.filter(job => job.status !== "CANCELLED").length }; })
  };
}
