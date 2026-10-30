import { acceptedVendorReturns } from "@/server/quality-control/vendor-acceptance";
import type { Prisma } from "@prisma/client";
import { authorizedCommercialLedger, commercialLines } from "@/lib/service-commercial-ledger";
import { hashEnterpriseCommand } from "@/server/enterprise-command/domain";
import type { ServiceDocumentContent } from "@/server/repair-order/service-documents";

export async function serviceInvoiceCandidate(database: Prisma.TransactionClient, organizationId: string, repairOrderId: string) {
  const order = await database.repairOrder.findFirst({ where: { id: repairOrderId, organizationId }, include: { repairJobs: { where: { status: { not: "CANCELLED" } }, orderBy: { id: "asc" }, include: { qualityInspections: { orderBy: { version: "desc" }, take: 1 }, laborClocks: { orderBy: { id: "asc" } }, partCustodyEvents: { orderBy: { id: "asc" }, include: { part: { select: { partNumber: true } } } } } }, estimateVersions: { orderBy: { version: "desc" }, take: 1 }, authorizations: { orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 1 } } });
  if (!order) throw new Error("Repair order was not found.");
  const estimate = order.estimateVersions[0], authorization = order.authorizations[0];
  if (!estimate || !authorization || !["ACCEPTED", "PARTIAL"].includes(authorization.disposition) || authorization.estimateVersionId !== estimate.id || authorization.decidedAt > estimate.expiresAt) throw new Error("Invoice requires current exact-version authorization recorded before estimate expiry.");
  const ledger = authorizedCommercialLedger(estimate, authorization.authorizedLineKeys as string[]);
  const mismatchCodes: string[] = [];
  if (ledger.totalCents !== authorization.authorizedAmountCents) mismatchCodes.push("INVOICE_AUTHORIZED_AMOUNT_NEEDS_REVIEW");
  for (const line of ledger.lines.filter(line => line.type === "LABOR")) {
    const matches = order.repairJobs.filter(job => job.authorizedLineKey === line.key && job.authorizationId === authorization.id && job.estimateVersionId === estimate.id);
    if (matches.length !== 1 || matches[0].status !== "QC_PASSED" || matches[0].qualityInspections[0]?.disposition !== "PASSED" || !matches[0].qualityInspections[0]?.safetyChecksPassed) mismatchCodes.push("INVOICE_JOB_QC_INCOMPLETE");
  }
  const groups = estimate.optionGroups as unknown as { type?: string }[] | null;
  const collision = Array.isArray(groups) && groups.some(group => group?.type === "AUTOBODY_PROVENANCE");
  const vendorKeys = (collision ? ledger.lines : []).filter(line => line.type === "FEE" && /^bf-.+-vendor$/.test(line.key)).map(line => line.key);
  const vendorReturns = await acceptedVendorReturns(database, organizationId, repairOrderId, estimate.id, authorization.id, vendorKeys);
  if (vendorKeys.some(key => vendorReturns.filter(item => item.lineKeys.includes(key)).length !== 1)) mismatchCodes.push("INVOICE_VENDOR_RETURN_REVIEW_REQUIRED");
  if (!ledger.lines.some(line => line.type === "LABOR") && (!vendorKeys.length || ledger.lines.some(line => !vendorKeys.includes(line.key)))) mismatchCodes.push("INVOICE_EXECUTABLE_SCOPE_MISSING");
  const jobs = order.repairJobs.filter(job => job.authorizationId === authorization.id && ledger.lines.some(line => line.key === job.authorizedLineKey));
  if (jobs.some(job => job.qualityInspections[0] && ((job.qualityInspections[0].peerVerificationRequired && !job.qualityInspections[0].peerVerificationPassed) || (job.qualityInspections[0].roadTestRequired && job.qualityInspections[0].roadTestOutcome !== "PASSED") || job.laborClocks.some(clock => clock.finishedAt && clock.finishedAt > job.qualityInspections[0].inspectedAt)))) mismatchCodes.push("INVOICE_QC_EVIDENCE_INCOMPLETE");
  if (jobs.some(job => job.laborClocks.length === 0 || job.laborClocks.some(clock => clock.state !== "FINISHED" || !clock.finishedAt))) mismatchCodes.push("INVOICE_MEASURED_CLOCK_INCOMPLETE");
  for (const line of ledger.lines.filter(line => line.type === "PART")) {
    const linked = line.laborLineKey ? jobs.filter(job => job.authorizedLineKey === line.laborLineKey) : jobs.length === 1 ? jobs : [];
    const partNumber = (line as typeof line & { partNumber?: string }).partNumber;
    if (!partNumber) { mismatchCodes.push("INVOICE_PART_IDENTITY_MISSING"); continue; }
    const quantity = linked.flatMap(job => job.partCustodyEvents).filter(event => event.type === "INSTALL" && event.part.partNumber.trim().toUpperCase() === partNumber.trim().toUpperCase()).reduce((total, event) => total + event.quantity, 0);
    const events = linked.flatMap(job => job.partCustodyEvents).filter(event => event.part.partNumber.trim().toUpperCase() === partNumber.trim().toUpperCase());
    if (events.some(event => ["UNUSED_RETURN","WARRANTY_SHIP","VENDOR_SHIP"].includes(event.type) && events.some(installation => installation.type === "INSTALL" && installation.occurredAt <= event.occurredAt))) mismatchCodes.push("INVOICE_PART_RETURN_NEEDS_REVIEW");
    if (quantity !== line.quantity) mismatchCodes.push("INVOICE_INSTALL_QUANTITY_MISMATCH");
  }
  for (const job of jobs) if (job.partsRequired && !job.partCustodyEvents.some(event => event.type === "INSTALL")) mismatchCodes.push("INVOICE_INSTALL_EVIDENCE_MISSING");
  const sourceDocument = await database.serviceDocument.findFirst({ where: { organizationId, kind: "ESTIMATE", sourceId: estimate.id }, orderBy: { sourceVersion: "desc" } });
  if (!sourceDocument) mismatchCodes.push("INVOICE_FROZEN_ESTIMATE_DOCUMENT_MISSING");
  const identity = sourceDocument ? (sourceDocument.content as unknown as ServiceDocumentContent).identity : null;
  const clockedLaborMinutes = jobs.flatMap(job => job.laborClocks).reduce((total, clock) => total + clock.accumulatedMinutes, 0);
  const installedPartsCostCents = jobs.flatMap(job => job.partCustodyEvents).filter(event => event.type === "INSTALL").reduce((total, event) => total + event.quantity * event.unitCostCents, 0);
  const fingerprint = hashEnterpriseCommand(JSON.parse(JSON.stringify({ estimateId: estimate.id, authorizationId: authorization.id, ledger, ...(vendorKeys.length ? { vendorReturns } : {}), documentHash: sourceDocument?.sha256, jobs: jobs.map(job => ({ id: job.id, status: job.status, quality: job.qualityInspections.map(inspection => [inspection.id, inspection.version, inspection.disposition, inspection.safetyChecksPassed, inspection.peerVerificationPassed, inspection.roadTestOutcome, inspection.inspectedAt]), clocks: job.laborClocks.map(clock => [clock.id, clock.state, clock.accumulatedMinutes, clock.finishedAt]), installations: job.partCustodyEvents.map(event => [event.id, event.type, event.quantity, event.unitCostCents]) })) })));
  return { order, estimate, authorization, ledger, identity, vendorReturns, clockedLaborMinutes, installedPartsCostCents, mismatchCodes: [...new Set(mismatchCodes)], fingerprint, allLineKeys: commercialLines(estimate.lineItems).map(line => line.key) };
}
export async function assertCurrentInvoicePackage(database: Prisma.TransactionClient, organizationId: string, invoicePackage: { repairOrderId: string; mismatchCodes: unknown; sourceSnapshot: unknown }) {
  if (!Array.isArray(invoicePackage.mismatchCodes) || invoicePackage.mismatchCodes.length) throw new Error("Resolve all operational and financial invoice mismatches before finalization.");
  const snapshot = invoicePackage.sourceSnapshot as { fingerprint?: string };
  const current = await serviceInvoiceCandidate(database, organizationId, invoicePackage.repairOrderId);
  if (current.mismatchCodes.length || snapshot?.fingerprint !== current.fingerprint) throw new Error("Invoice source changed or is incomplete. Resolve readiness and generate a new package.");
  return current;
}
