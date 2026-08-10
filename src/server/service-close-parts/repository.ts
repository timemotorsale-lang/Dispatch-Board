import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { executeAggregateMutation, toJson, type AggregateTx } from "@/server/enterprise-command/aggregate-mutation";
import type { EnterpriseCommandCommitInput } from "@/server/enterprise-command/repository";
import { assertPartStockLocationWritable } from "@/server/parts-ledger/count-freeze";
import { assertIndependentPartsApproval, type PurchaseLine, type ReceiptLine, type TransferLine } from "./domain";
import { assertPurchaseOrderDuplicateGate, type PurchaseOrderDuplicateGateFact } from "./purchase-order-control";

type StockMovement = {
  actorUserId: string;
  allocatedDelta?: number;
  movementType: "RECEIPT" | "ISSUE" | "INSTALL" | "RETURN" | "TRANSFER_OUT" | "TRANSFER_IN" | "CORE_RETURN" | "WARRANTY_RETURN" | "VENDOR_RETURN";
  occurredAt: Date;
  partId: string;
  quantityDelta: number;
  reason: string;
  sourceId: string;
  sourceType: string;
  stockLocationId: string;
  unitCostCents: number;
};

async function moveStock(tx: AggregateTx, command: EnterpriseCommandCommitInput, movement: StockMovement) {
  await assertPartStockLocationWritable(tx, command.organizationId, movement.stockLocationId, movement.sourceType);
  const stockLocation = await tx.partStockLocation.findFirst({ where: { id: movement.stockLocationId, organizationId: command.organizationId, isActive: true } });
  const part = await tx.part.findFirst({ where: { id: movement.partId, organizationId: command.organizationId, status: "ACTIVE" } });
  if (!stockLocation || !part) throw new Error("Active part and stock location are required.");
  const current = await tx.partStockBalance.findUnique({ where: { partId_stockLocationId: { partId: part.id, stockLocationId: stockLocation.id } } });
  const onHand = (current?.onHandQuantity ?? 0) + movement.quantityDelta;
  const allocated = (current?.allocatedQuantity ?? 0) + (movement.allocatedDelta ?? 0);
  if (onHand < 0 || allocated < 0 || allocated > onHand) throw new Error("Stock movement would create an invalid on-hand or allocated balance.");
  const receivedQuantity = Math.max(0, movement.quantityDelta);
  const averageCostCents = receivedQuantity > 0
    ? Math.round((((current?.onHandQuantity ?? 0) * (current?.averageCostCents ?? 0)) + (receivedQuantity * movement.unitCostCents)) / Math.max(1, onHand))
    : current?.averageCostCents ?? movement.unitCostCents;
  const balance = await tx.partStockBalance.upsert({
    where: { partId_stockLocationId: { partId: part.id, stockLocationId: stockLocation.id } },
    create: { allocatedQuantity: allocated, availableQuantity: onHand - allocated, averageCostCents, onHandQuantity: onHand, organizationId: command.organizationId, partId: part.id, stockLocationId: stockLocation.id, version: 1 },
    update: { allocatedQuantity: allocated, availableQuantity: onHand - allocated, averageCostCents, onHandQuantity: onHand, version: { increment: 1 } },
  });
  const entry = await tx.partStockLedgerEntry.create({ data: { actorUserId: movement.actorUserId, allocatedDelta: movement.allocatedDelta ?? 0, correlationId: command.correlationId, movementType: movement.movementType, occurredAt: movement.occurredAt, organizationId: command.organizationId, partId: part.id, quantityDelta: movement.quantityDelta, reason: movement.reason, sourceId: movement.sourceId, sourceType: movement.sourceType, stockLocationId: stockLocation.id, unitCostCents: movement.unitCostCents } });
  return { balance, entry };
}

function total(lines: PurchaseLine[]) {
  return lines.reduce((sum, line) => sum + line.quantity * line.unitCostCents, 0);
}

export function createServiceClosePartsRepository(database: PrismaClient = prisma) {
  return {
    async aggregateVersion(organizationId: string, domain: "SHOP_OPERATIONS" | "PARTS_OPERATIONS", subjectType: string, subjectId: string) {
      const row = await database.enterpriseAggregateVersion.findUnique({ where: { organizationId_domain_subjectType_subjectId: { domain, organizationId, subjectId, subjectType } }, select: { version: true } });
      return row?.version ?? 0;
    },

    async overview(organizationId: string) {
      const [repairOrders, vendors, offers, interchanges, requisitions, purchaseOrders, receipts, discrepancies, custodyEvents, transfers, recoveries, parts, stockLocations, locations, demands] = await Promise.all([
        database.repairOrder.findMany({
          where: { organizationId },
          orderBy: { updatedAt: "desc" },
          take: 100,
          include: {
            vehicle: { select: { color: true, make: true, model: true, stockNumber: true, vehicleNumber: true, vin: true, year: true } },
            customer: { select: { displayName: true } },
            inventoryUnit: {
              select: {
                id: true,
                inventoryNumber: true,
                acquisitionAppraisals: {
                  orderBy: { version: "desc" },
                  take: 1,
                  select: { estimatedReconCents: true, estimatedRetailCents: true }
                },
                acquisitionCase: {
                  select: { appraisalSnapshot: true }
                }
              }
            },
            invoicePackages: { orderBy: { version: "desc" }, take: 3 },
            closureEvents: { orderBy: { occurredAt: "desc" }, take: 3 },
            deliveryReadinessEvaluations: { orderBy: { version: "desc" }, take: 1 },
            releaseAuthorization: true
          }
        }),
        database.partVendor.findMany({ where: { organizationId }, orderBy: { name: "asc" } }),
        database.partVendorOffer.findMany({ where: { organizationId }, orderBy: { createdAt: "desc" }, take: 200, include: { vendor: { select: { code: true, name: true } }, part: { select: { partNumber: true, description: true } } } }),
        database.partInterchange.findMany({ where: { organizationId }, orderBy: { createdAt: "desc" }, take: 200, include: { primaryPart: { select: { partNumber: true } }, alternatePart: { select: { partNumber: true } } } }),
        database.partRequisition.findMany({
          where: { organizationId },
          orderBy: { requiredAt: "asc" },
          take: 200,
          include: {
            demand: {
              include: {
                part: { select: { partNumber: true, description: true } },
                repairOrder: { select: { repairOrderNumber: true } },
              },
            },
            selectedOffer: { include: { vendor: { select: { name: true } } } },
          },
        }),
        database.partPurchaseOrder.findMany({
          where: { organizationId },
          orderBy: { createdAt: "desc" },
          take: 200,
          include: {
            vendor: { select: { name: true } },
            location: { select: { name: true } },
            requisition: {
              select: {
                demand: {
                  select: {
                    repairOrder: { select: { id: true, repairOrderNumber: true } },
                  },
                },
              },
            },
          },
        }),
        database.partReceipt.findMany({
          where: { organizationId },
          orderBy: { receivedAt: "desc" },
          take: 200,
          include: {
            purchaseOrder: {
              select: {
                purchaseOrderNumber: true,
                requisition: {
                  select: {
                    demand: {
                      select: {
                        repairOrder: { select: { repairOrderNumber: true } },
                      },
                    },
                  },
                },
              },
            },
            stockLocation: { select: { code: true, name: true, type: true } },
          },
        }),
        database.partReceivingDiscrepancy.findMany({ where: { organizationId }, orderBy: { createdAt: "desc" }, take: 200, include: { receipt: { select: { purchaseOrder: { select: { locationId: true } } } } } }),
        database.partCustodyEvent.findMany({ where: { organizationId }, orderBy: { occurredAt: "desc" }, take: 250, include: { part: { select: { partNumber: true } }, repairJob: { select: { jobNumber: true } } } }),
        database.partTransfer.findMany({ where: { organizationId }, orderBy: { createdAt: "desc" }, take: 200 }),
        database.partRecoveryCase.findMany({ where: { organizationId }, orderBy: { deadlineAt: "asc" }, take: 200, include: { part: { select: { partNumber: true } }, vendor: { select: { name: true } } } }),
        database.part.findMany({ where: { organizationId, status: "ACTIVE" }, orderBy: { partNumber: "asc" }, select: { id: true, partNumber: true, description: true, standardCostCents: true } }),
        database.partStockLocation.findMany({ where: { organizationId, isActive: true }, orderBy: { name: "asc" }, select: { id: true, code: true, name: true, locationId: true } }),
        database.location.findMany({ where: { organizationId }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
        database.repairPartDemand.findMany({ where: { organizationId, status: { in: ["OPEN", "PARTIALLY_RESERVED"] } }, orderBy: { requiredAt: "asc" }, take: 200, include: { part: { select: { partNumber: true, description: true } }, repairOrder: { select: { locationId: true, repairOrderNumber: true } } } }),
      ]);
      return { custodyEvents, demands, discrepancies, interchanges, locations, offers, parts, purchaseOrders, receipts, recoveries, repairOrders, requisitions, stockLocations, transfers, vendors };
    },

    generateInvoice(command: EnterpriseCommandCommitInput, data: { createdByUserId: string; generatedAt: Date; reason: string }) {
      return executeAggregateMutation(database, command, "vehicle-operations.shop", async (tx, aggregateVersion) => {
        const order = await tx.repairOrder.findFirst({ where: { id: command.subjectId, organizationId: command.organizationId, closedAt: null }, include: { repairJobs: { where: { status: { not: "CANCELLED" } }, include: { laborEvents: true, partCustodyEvents: { where: { type: "INSTALL" } } } }, invoicePackages: { orderBy: { version: "desc" }, take: 1 } } });
        if (!order) throw new Error("Open repair order was not found.");
        if (!order.repairJobs.length) throw new Error("Invoice-ready package requires at least one active repair job.");
        const lineItems = order.repairJobs.map((job) => ({ authorizedAmountCents: job.authorizedAmountCents, authorizedLineKey: job.authorizedLineKey, description: job.description, jobId: job.id, jobNumber: job.jobNumber, laborGuideMinutes: job.laborGuideMinutes, status: job.status }));
        const authorizedTotalCents = order.repairJobs.reduce((sum, job) => sum + job.authorizedAmountCents, 0);
        const installedPartsCostCents = order.repairJobs.flatMap((job) => job.partCustodyEvents).reduce((sum, event) => sum + event.quantity * event.unitCostCents, 0);
        const clockedLaborMinutes = order.repairJobs.flatMap((job) => job.laborEvents).reduce((sum, event) => sum + (event.eventType === "CORRECTION" ? event.correctionMinutes ?? 0 : 0), 0) + order.repairJobs.reduce((sum, job) => sum + (job.status === "QC_PASSED" ? job.laborGuideMinutes : 0), 0);
        const mismatchCodes = [...(order.repairJobs.some((job) => job.status !== "QC_PASSED") ? ["INVOICE_JOB_QC_INCOMPLETE"] : []), ...(order.repairJobs.some((job) => job.partsRequired && !job.partCustodyEvents.length) ? ["INVOICE_INSTALL_EVIDENCE_MISSING"] : [])];
        const packageVersion = (order.invoicePackages[0]?.version ?? 0) + 1;
        const record = await tx.serviceInvoicePackage.create({ data: { authorizedTotalCents, clockedLaborMinutes: Math.max(0, clockedLaborMinutes), createdByUserId: data.createdByUserId, generatedAt: data.generatedAt, installedPartsCostCents, lineItems: toJson(lineItems), mismatchCodes: toJson(mismatchCodes), organizationId: command.organizationId, reason: data.reason, repairOrderId: order.id, sourceSnapshot: toJson({ aggregateVersion, jobIds: order.repairJobs.map((job) => job.id), generatedAt: data.generatedAt }), status: "READY", version: packageVersion } });
        await tx.repairOrder.update({
          where: { id: order.id },
          data: {
            nextAction: mismatchCodes.length ? "Resolve invoice-ready mismatches" : "Submit invoice-ready package or complete handoff",
            operatingState: mismatchCodes.length ? "BLOCKED" : "ACTIVE",
            stateReason: mismatchCodes.length ? mismatchCodes.join(", ") : null,
            version: aggregateVersion,
          },
        });
        return { previous: order, result: { authorizedTotalCents, id: record.id, mismatchCodes, repairOrderId: order.id, status: record.status, version: aggregateVersion } };
      });
    },

    transitionInvoice(command: EnterpriseCommandCommitInput, packageId: string, data: { externalReference: string | null; externalSystemCode: string | null; occurredAt: Date; status: "SUBMITTED" | "ACCEPTED" | "REJECTED" }) {
      return executeAggregateMutation(database, command, "vehicle-operations.shop", async (tx, version) => {
        const record = await tx.serviceInvoicePackage.findFirst({ where: { id: packageId, organizationId: command.organizationId } });
        if (!record) throw new Error("Invoice-ready package was not found.");
        const allowed: Record<string, string[]> = { READY: ["SUBMITTED"], SUBMITTED: ["ACCEPTED", "REJECTED"], REJECTED: ["SUBMITTED"], ACCEPTED: [] };
        if (!allowed[record.status]?.includes(data.status)) throw new Error(`Invoice package cannot transition from ${record.status} to ${data.status}.`);
        const next = await tx.serviceInvoicePackage.update({ where: { id: record.id }, data: { externalReference: data.externalReference ?? record.externalReference, externalSystemCode: data.externalSystemCode ?? record.externalSystemCode, reconciledAt: ["ACCEPTED", "REJECTED"].includes(data.status) ? data.occurredAt : null, status: data.status, submittedAt: data.status === "SUBMITTED" ? data.occurredAt : record.submittedAt } });
        return { previous: record, result: { id: next.id, repairOrderId: next.repairOrderId, status: next.status, version } };
      });
    },

    closeOrder(command: EnterpriseCommandCommitInput, data: { finalOdometer: number; handoffEvidence: string[]; keysVerified: boolean; occurredAt: Date; recipientName: string }) {
      return executeAggregateMutation(database, command, "vehicle-operations.shop", async (tx, version) => {
        const order = await tx.repairOrder.findFirst({ where: { id: command.subjectId, organizationId: command.organizationId, closedAt: null }, include: { deliveryReadinessEvaluations: { orderBy: { version: "desc" }, take: 1 }, invoicePackages: { orderBy: { version: "desc" }, take: 1 }, releaseAuthorization: true } });
        if (!order) throw new Error("Open repair order was not found.");
        const readiness = order.deliveryReadinessEvaluations[0], invoice = order.invoicePackages[0];
        if (!readiness || readiness.disposition !== "READY") throw new Error("Repair order close requires current delivery readiness.");
        if (!order.releaseAuthorization) throw new Error("Repair order close requires release authorization.");
        if (!invoice || !["READY", "ACCEPTED"].includes(invoice.status) || (invoice.mismatchCodes as string[]).length) throw new Error("Repair order close requires a reconciled invoice-ready package without mismatches.");
        if (!data.keysVerified) throw new Error("Repair order close requires verified keys.");
        await tx.repairOrder.update({ where: { id: order.id }, data: { closedAt: data.occurredAt, nextAction: "Service visit closed", operatingState: "CLOSED", stage: "CLOSED", stageStartedAt: data.occurredAt, stateReason: null, version } });
        await tx.repairOrderStateEvent.create({ data: { actorUserId: command.actorUserId, correlationId: command.correlationId, fromOperatingState: order.operatingState, fromStage: order.stage, locationId: order.locationId, nextAction: "Service visit closed", organizationId: command.organizationId, ownerUserId: order.ownerUserId, reason: command.reason, repairOrderId: order.id, targetAt: order.targetAt, toOperatingState: "CLOSED", toStage: "CLOSED", version } });
        await tx.repairOrderClosureEvent.create({ data: { actorUserId: command.actorUserId, correlationId: command.correlationId, finalOdometer: data.finalOdometer, handoffEvidence: toJson(data.handoffEvidence), invoicePackageId: invoice.id, keysVerified: true, occurredAt: data.occurredAt, organizationId: command.organizationId, priorStage: order.stage, reason: command.reason, recipientName: data.recipientName, repairOrderId: order.id, resultingStage: "CLOSED", type: "CLOSED", version } });
        return { previous: order, result: { closedAt: data.occurredAt, invoicePackageId: invoice.id, repairOrderId: order.id, stage: "CLOSED", version } };
      });
    },

    reopenOrder(command: EnterpriseCommandCommitInput, data: { occurredAt: Date }) {
      return executeAggregateMutation(database, command, "vehicle-operations.shop", async (tx, version) => {
        const order = await tx.repairOrder.findFirst({ where: { id: command.subjectId, organizationId: command.organizationId, stage: "CLOSED" } });
        if (!order) throw new Error("Closed repair order was not found.");
        await tx.repairOrder.update({ where: { id: order.id }, data: { closedAt: null, nextAction: "Review reopened service close", operatingState: "ACTIVE", stage: "HANDOFF", stageStartedAt: data.occurredAt, stateReason: null, version } });
        await tx.repairOrderStateEvent.create({ data: { actorUserId: command.actorUserId, correlationId: command.correlationId, fromOperatingState: "CLOSED", fromStage: "CLOSED", locationId: order.locationId, nextAction: "Review reopened service close", organizationId: command.organizationId, ownerUserId: order.ownerUserId, reason: command.reason, repairOrderId: order.id, targetAt: order.targetAt, toOperatingState: "ACTIVE", toStage: "HANDOFF", version } });
        await tx.repairOrderClosureEvent.create({ data: { actorUserId: command.actorUserId, correlationId: command.correlationId, handoffEvidence: toJson([]), keysVerified: false, occurredAt: data.occurredAt, organizationId: command.organizationId, priorStage: "CLOSED", reason: command.reason, repairOrderId: order.id, resultingStage: "HANDOFF", type: "REOPENED", version } });
        return { previous: order, result: { repairOrderId: order.id, stage: "HANDOFF", version } };
      });
    },

    createVendor(command: EnterpriseCommandCommitInput, data: { code: string; createdByUserId: string; defaultReturnTerms: string; defaultWarranty: string; name: string; paymentTerms: string; reliabilityBasisPoints: number }) {
      return executeAggregateMutation(database, command, "vehicle-operations.parts", async (tx) => {
        if (data.reliabilityBasisPoints > 10000) throw new Error("Reliability cannot exceed 10000 basis points.");
        const existing = await tx.partVendor.findFirst({ where: { organizationId: command.organizationId, OR: [{ code: data.code }, { name: { equals: data.name, mode: "insensitive" } }] } });
        if (existing) return { result: { code: existing.code, id: existing.id, name: existing.name, reused: true, status: existing.status } };
        const record = await tx.partVendor.create({ data: { code: data.code, createdByUserId: data.createdByUserId, defaultReturnTerms: data.defaultReturnTerms, defaultWarranty: data.defaultWarranty, id: command.subjectId, name: data.name, organizationId: command.organizationId, paymentTerms: data.paymentTerms, reliabilityBasisPoints: data.reliabilityBasisPoints } });
        return { result: { code: record.code, id: record.id, name: record.name, status: record.status } };
      });
    },

    createOffer(command: EnterpriseCommandCommitInput, data: { availableQuantity: number; effectiveFrom: Date; effectiveTo: Date | null; estimatedArrivalAt: Date | null; partId: string; returnTerms: string; unitCostCents: number; vendorId: string; vendorPartNumber: string; warrantyTerms: string }) {
      return executeAggregateMutation(database, command, "vehicle-operations.parts", async (tx) => {
        const [vendor, part] = await Promise.all([tx.partVendor.findFirst({ where: { id: data.vendorId, organizationId: command.organizationId, status: "ACTIVE" } }), tx.part.findFirst({ where: { id: data.partId, organizationId: command.organizationId, status: "ACTIVE" } })]);
        if (!vendor || !part) throw new Error("Active vendor and part are required.");
        const record = await tx.partVendorOffer.create({ data: { availableQuantity: data.availableQuantity, effectiveFrom: data.effectiveFrom, effectiveTo: data.effectiveTo, estimatedArrivalAt: data.estimatedArrivalAt, id: command.subjectId, organizationId: command.organizationId, partId: data.partId, returnTerms: data.returnTerms, unitCostCents: data.unitCostCents, vendorId: data.vendorId, vendorPartNumber: data.vendorPartNumber, warrantyTerms: data.warrantyTerms } });
        return { result: { id: record.id, partId: record.partId, unitCostCents: record.unitCostCents, vendorId: record.vendorId } };
      });
    },

    createInterchange(command: EnterpriseCommandCommitInput, data: { alternatePartId: string; approved: boolean; approvedByUserId: string; fitmentEvidence: string[]; primaryPartId: string; reason: string; type: "SUBSTITUTE" | "SUPERSESSION" }) {
      return executeAggregateMutation(database, command, "vehicle-operations.parts", async (tx) => {
        if (data.primaryPartId === data.alternatePartId) throw new Error("Interchange parts must differ.");
        const parts = await tx.part.count({ where: { id: { in: [data.primaryPartId, data.alternatePartId] }, organizationId: command.organizationId, status: "ACTIVE" } });
        if (parts !== 2) throw new Error("Both interchange parts must be active.");
        const record = await tx.partInterchange.create({ data: { alternatePartId: data.alternatePartId, approved: data.approved, approvedAt: data.approved ? new Date() : null, approvedByUserId: data.approved ? data.approvedByUserId : null, fitmentEvidence: toJson(data.fitmentEvidence), id: command.subjectId, organizationId: command.organizationId, primaryPartId: data.primaryPartId, reason: data.reason, type: data.type } });
        return { result: { approved: record.approved, id: record.id, type: record.type } };
      });
    },

    createRequisition(command: EnterpriseCommandCommitInput, data: { createdByUserId: string; demandId: string; quantity: number; reason: string; requiredAt: Date }) {
      return executeAggregateMutation(database, command, "vehicle-operations.parts", async (tx) => {
        const demand = await tx.repairPartDemand.findFirst({ where: { id: data.demandId, organizationId: command.organizationId, status: { in: ["OPEN", "PARTIALLY_RESERVED"] } }, include: { part: { include: { vendorOffers: { where: { vendor: { status: "ACTIVE" }, effectiveFrom: { lte: new Date() }, OR: [{ effectiveTo: null }, { effectiveTo: { gt: new Date() } }] }, include: { vendor: true }, orderBy: [{ unitCostCents: "asc" }, { estimatedArrivalAt: "asc" }] } } } } });
        if (!demand) throw new Error("Open part demand was not found.");
        const comparison = demand.part.vendorOffers.map((offer) => ({ availableQuantity: offer.availableQuantity, estimatedArrivalAt: offer.estimatedArrivalAt, offerId: offer.id, reliabilityBasisPoints: offer.vendor.reliabilityBasisPoints, returnTerms: offer.returnTerms, unitCostCents: offer.unitCostCents, vendorCode: offer.vendor.code, warrantyTerms: offer.warrantyTerms }));
        const record = await tx.partRequisition.create({ data: { comparisonSnapshot: toJson(comparison), createdByUserId: data.createdByUserId, demandId: demand.id, id: command.subjectId, organizationId: command.organizationId, quantity: data.quantity, reason: data.reason, requiredAt: data.requiredAt } });
        return { result: { candidateCount: comparison.length, id: record.id, status: record.status } };
      });
    },

    selectOffer(command: EnterpriseCommandCommitInput, requisitionId: string, data: { offerId: string }) {
      return executeAggregateMutation(database, command, "vehicle-operations.parts", async (tx, version) => {
        const requisition = await tx.partRequisition.findFirst({ where: { id: requisitionId, organizationId: command.organizationId, status: "SOURCING" }, include: { demand: true } });
        if (!requisition) throw new Error("Sourcing requisition was not found.");
        const offer = await tx.partVendorOffer.findFirst({ where: { id: data.offerId, organizationId: command.organizationId, partId: requisition.demand.partId, vendor: { status: "ACTIVE" } } });
        if (!offer) throw new Error("Eligible vendor offer was not found.");
        const next = await tx.partRequisition.update({ where: { id: requisition.id }, data: { selectedOfferId: offer.id, status: "SELECTED", version } });
        return { previous: requisition, result: { id: next.id, selectedOfferId: offer.id, status: next.status, version } };
      });
    },

    createPurchaseOrder(command: EnterpriseCommandCommitInput, data: { createdByUserId: string; duplicateOverrideReason: string | null; lines: PurchaseLine[]; locationId: string; purchaseOrderNumber: string; reason: string; requisitionId: string | null; vendorId: string }) {
      return executeAggregateMutation(database, command, "vehicle-operations.parts", async (tx) => {
        const [vendor, location] = await Promise.all([tx.partVendor.findFirst({ where: { id: data.vendorId, organizationId: command.organizationId, status: "ACTIVE" } }), tx.location.findFirst({ where: { id: data.locationId, organizationId: command.organizationId } })]);
        if (!vendor || !location) throw new Error("Active vendor and operating location are required.");
        const linePartIds = [...new Set(data.lines.map((line) => line.partId))];
        let allowedDemandIds: string[] = [];
        if (data.requisitionId) {
          const requisition = await tx.partRequisition.findFirst({ where: { id: data.requisitionId, organizationId: command.organizationId, status: "SELECTED", selectedOffer: { vendorId: data.vendorId } } });
          if (!requisition) throw new Error("Selected requisition does not match this vendor.");
          allowedDemandIds = [requisition.demandId];
        }
        const [activeDemands, openPurchaseOrders, receipts, custodyEvents, recoveries] = await Promise.all([
          tx.repairPartDemand.findMany({ where: { organizationId: command.organizationId, partId: { in: linePartIds }, status: { in: ["OPEN", "PARTIALLY_RESERVED"] } }, select: { id: true, partId: true, repairOrder: { select: { repairOrderNumber: true } } } }),
          tx.partPurchaseOrder.findMany({ where: { organizationId: command.organizationId, status: { in: ["DRAFT", "APPROVED", "ISSUED", "ACKNOWLEDGED", "PARTIALLY_RECEIVED"] } }, select: { id: true, lines: true, purchaseOrderNumber: true, status: true } }),
          tx.partReceipt.findMany({ where: { organizationId: command.organizationId }, orderBy: { receivedAt: "desc" }, take: 250, select: { id: true, lines: true, purchaseOrder: { select: { purchaseOrderNumber: true } } } }),
          tx.partCustodyEvent.findMany({ where: { organizationId: command.organizationId, sourceType: "PART_RECEIPT_LINE", type: { in: ["ISSUE", "INSTALL"] } }, select: { sourceId: true, sourceType: true } }),
          tx.partRecoveryCase.findMany({ where: { organizationId: command.organizationId, partId: { in: linePartIds }, status: { notIn: ["CREDITED", "WRITTEN_OFF"] } }, select: { id: true, partId: true, sourceReference: true, status: true, type: true } }),
        ]);
        const issuedReceiptLines = new Set(custodyEvents.map((event) => `${event.sourceType}:${event.sourceId}`));
        const facts: PurchaseOrderDuplicateGateFact[] = [
          ...activeDemands.map((demand) => ({ id: demand.id, label: `${demand.repairOrder.repairOrderNumber}`, partId: demand.partId, type: "ACTIVE_DEMAND" as const })),
          ...openPurchaseOrders.flatMap((order) => (Array.isArray(order.lines) ? order.lines : []).flatMap((line) => {
            const partId = line && typeof line === "object" && "partId" in line && typeof line.partId === "string" ? line.partId : "";
            return linePartIds.includes(partId) ? [{ id: order.id, label: `${order.purchaseOrderNumber} (${order.status})`, partId, type: "OPEN_PURCHASE_ORDER" as const }] : [];
          })),
          ...receipts.flatMap((receipt) => (Array.isArray(receipt.lines) ? receipt.lines : []).flatMap((line, index) => {
            const partId = line && typeof line === "object" && "partId" in line && typeof line.partId === "string" ? line.partId : "";
            const sourceId = `${receipt.id}:${index}`;
            return linePartIds.includes(partId) && !issuedReceiptLines.has(`PART_RECEIPT_LINE:${sourceId}`) ? [{ id: sourceId, label: `${receipt.purchaseOrder.purchaseOrderNumber} receipt line ${index + 1}`, partId, type: "RECEIVED_UNISSUED" as const }] : [];
          })),
          ...recoveries.map((recovery) => ({ id: recovery.id, label: `${recovery.type} ${recovery.sourceReference} (${recovery.status})`, partId: recovery.partId, type: "RECOVERY_OPEN" as const })),
        ];
        assertPurchaseOrderDuplicateGate({ allowedDemandIds, duplicateOverrideReason: data.duplicateOverrideReason, facts, lines: data.lines });
        if (data.requisitionId) {
          const requisition = await tx.partRequisition.findFirst({ where: { id: data.requisitionId, organizationId: command.organizationId, status: "SELECTED", selectedOffer: { vendorId: data.vendorId } } });
          if (!requisition) throw new Error("Selected requisition does not match this vendor.");
          await tx.partRequisition.update({ where: { id: requisition.id }, data: { status: "ORDERED", version: { increment: 1 } } });
        }
        const reason = data.duplicateOverrideReason ? `${data.reason} Duplicate-control override: ${data.duplicateOverrideReason}` : data.reason;
        const record = await tx.partPurchaseOrder.create({ data: { createdByUserId: data.createdByUserId, id: command.subjectId, lines: toJson(data.lines), locationId: data.locationId, orderedTotalCents: total(data.lines), organizationId: command.organizationId, purchaseOrderNumber: data.purchaseOrderNumber, reason, requisitionId: data.requisitionId, vendorId: data.vendorId } });
        return { result: { id: record.id, orderedTotalCents: record.orderedTotalCents, purchaseOrderNumber: record.purchaseOrderNumber, status: record.status } };
      });
    },

    transitionPurchaseOrder(command: EnterpriseCommandCommitInput, purchaseOrderId: string, data: { allowFinalAuthoritySelfApproval?: boolean; occurredAt: Date; toStatus: string }) {
      return executeAggregateMutation(database, command, "vehicle-operations.parts", async (tx, version) => {
        const record = await tx.partPurchaseOrder.findFirst({ where: { id: purchaseOrderId, organizationId: command.organizationId } });
        if (!record) throw new Error("Purchase order was not found.");
        if (data.toStatus === "APPROVED") assertIndependentPartsApproval("PURCHASE_APPROVAL", record.createdByUserId, command.actorUserId, { allowFinalAuthoritySelfApproval: data.allowFinalAuthoritySelfApproval === true });
        const next = await tx.partPurchaseOrder.update({ where: { id: record.id }, data: { acknowledgedAt: data.toStatus === "ACKNOWLEDGED" ? data.occurredAt : record.acknowledgedAt, closedAt: ["CLOSED", "CANCELLED"].includes(data.toStatus) ? data.occurredAt : record.closedAt, issuedAt: data.toStatus === "ISSUED" ? data.occurredAt : record.issuedAt, status: data.toStatus as never, version } });
        return { previous: record, result: { id: next.id, status: next.status, version } };
      });
    },

    revisePurchaseOrder(command: EnterpriseCommandCommitInput, purchaseOrderId: string, data: { lines: PurchaseLine[]; reason: string }) {
      return executeAggregateMutation(database, command, "vehicle-operations.parts", async (tx, version) => {
        const record = await tx.partPurchaseOrder.findFirst({ where: { id: purchaseOrderId, organizationId: command.organizationId, status: { in: ["DRAFT", "APPROVED"] } } });
        if (!record) throw new Error("Only a draft or approved purchase order may be revised.");
        const next = await tx.partPurchaseOrder.update({ where: { id: record.id }, data: { lines: toJson(data.lines), orderedTotalCents: total(data.lines), status: "DRAFT", version } });
        return { previous: record, result: { approvalInvalidated: record.status === "APPROVED", id: next.id, orderedTotalCents: next.orderedTotalCents, status: next.status, version } };
      });
    },

    receivePurchaseOrder(command: EnterpriseCommandCommitInput, purchaseOrderId: string, data: { invoiceReference: string | null; lines: ReceiptLine[]; packingSource: string; reason: string; receivedAt: Date; receivedByUserId: string; stockLocationId: string }) {
      return executeAggregateMutation(database, command, "vehicle-operations.parts", async (tx, version) => {
        const order = await tx.partPurchaseOrder.findFirst({ where: { id: purchaseOrderId, organizationId: command.organizationId, status: { in: ["ACKNOWLEDGED", "PARTIALLY_RECEIVED"] } }, include: { receipts: true } });
        if (!order) throw new Error("Acknowledged purchase order was not found.");
        const stockLocation = await tx.partStockLocation.findFirst({ where: { id: data.stockLocationId, organizationId: command.organizationId, locationId: order.locationId, isActive: true } });
        if (!stockLocation) throw new Error("Receipt stock location must be active at the purchase-order location.");
        const ordered = order.lines as PurchaseLine[], priorLines = order.receipts.flatMap((item) => item.lines as ReceiptLine[]);
        const receipt = await tx.partReceipt.create({ data: { id: command.subjectId, invoiceReference: data.invoiceReference, lines: toJson(data.lines), organizationId: command.organizationId, packingSource: data.packingSource, purchaseOrderId: order.id, reason: data.reason, receivedAt: data.receivedAt, receivedByUserId: data.receivedByUserId, stockLocationId: data.stockLocationId } });
        for (const [index, line] of data.lines.entries()) {
          await moveStock(tx, command, { actorUserId: data.receivedByUserId, movementType: "RECEIPT", occurredAt: data.receivedAt, partId: line.partId, quantityDelta: line.quantity - line.damagedQuantity, reason: data.reason, sourceId: `${receipt.id}:${index}`, sourceType: "PART_RECEIPT_LINE", stockLocationId: data.stockLocationId, unitCostCents: line.unitCostCents });
          const expected = ordered.find((item) => item.partId === line.partId), previouslyReceived = priorLines.filter((item) => item.partId === line.partId).reduce((sum, item) => sum + item.quantity, 0), expectedRemaining = Math.max(0, (expected?.quantity ?? 0) - previouslyReceived);
          const discrepancyType = line.damagedQuantity ? "DAMAGED" : !expected ? "WRONG_PART" : line.quantity < expectedRemaining ? "SHORT" : line.quantity > expectedRemaining ? "OVER" : line.unitCostCents !== expected.unitCostCents ? "COST_VARIANCE" : null;
          if (discrepancyType) await tx.partReceivingDiscrepancy.create({ data: { expectedCostCents: expected?.unitCostCents ?? 0, expectedQuantity: expectedRemaining, notes: `System-detected ${discrepancyType.toLowerCase().replaceAll("_", " ")}.`, organizationId: command.organizationId, partId: line.partId, receiptId: receipt.id, receivedCostCents: line.unitCostCents, receivedQuantity: line.quantity, type: discrepancyType } });
        }
        const receivedTotal = total(data.lines), cumulative = order.receivedTotalCents + receivedTotal, allReceiptLines = [...priorLines, ...data.lines];
        const fullyReceived = ordered.every((expected) => allReceiptLines.filter((item) => item.partId === expected.partId).reduce((sum, item) => sum + item.quantity, 0) >= expected.quantity);
        const status = fullyReceived ? "RECEIVED" : "PARTIALLY_RECEIVED";
        await tx.partPurchaseOrder.update({ where: { id: order.id }, data: { receivedTotalCents: cumulative, status, version } });
        return { previous: order, result: { discrepancyReviewRequired: await tx.partReceivingDiscrepancy.count({ where: { receiptId: receipt.id } }) > 0, id: receipt.id, purchaseOrderId: order.id, status, version } };
      });
    },

    resolveDiscrepancy(command: EnterpriseCommandCommitInput, discrepancyId: string, data: { occurredAt: Date; resolution: string; resolvedByUserId: string }) {
      return executeAggregateMutation(database, command, "vehicle-operations.parts", async (tx, version) => {
        const record = await tx.partReceivingDiscrepancy.findFirst({ where: { id: discrepancyId, organizationId: command.organizationId, status: "OPEN" } });
        if (!record) throw new Error("Open receiving discrepancy was not found.");
        const next = await tx.partReceivingDiscrepancy.update({ where: { id: record.id }, data: { resolution: data.resolution, resolvedAt: data.occurredAt, resolvedByUserId: data.resolvedByUserId, status: "RESOLVED", version } });
        return { previous: record, result: { id: next.id, status: next.status, version } };
      });
    },

    recordCustody(command: EnterpriseCommandCommitInput, data: { actorUserId: string; evidence: string[]; occurredAt: Date; partId: string; quantity: number; reason: string; repairJobId: string | null; reservationId: string | null; sourceId: string; stockLocationId: string; type: "ISSUE" | "INSTALL" | "UNUSED_RETURN" | "VENDOR_SHIP"; unitCostCents: number }) {
      return executeAggregateMutation(database, command, "vehicle-operations.parts", async (tx) => {
        const [costBalance, costPart] = await Promise.all([tx.partStockBalance.findUnique({ where: { partId_stockLocationId: { partId: data.partId, stockLocationId: data.stockLocationId } } }), tx.part.findFirst({ where: { id: data.partId, organizationId: command.organizationId }, select: { standardCostCents: true } })]);
        if (!costPart) throw new Error("Canonical part was not found.");
        const unitCostCents = costBalance?.averageCostCents || costPart.standardCostCents;
        if (data.type === "INSTALL" && data.repairJobId) {
          const job = await tx.repairJob.findFirst({ where: { id: data.repairJobId, organizationId: command.organizationId, status: { not: "CANCELLED" } } });
          if (!job) throw new Error("Active repair job was not found.");
        } else if (data.type === "ISSUE") {
          if (!data.reservationId) throw new Error("Part issue requires an active reservation.");
          const reservation = await tx.partReservation.findFirst({ where: { id: data.reservationId, organizationId: command.organizationId, partId: data.partId, stockLocationId: data.stockLocationId, status: "ACTIVE" }, include: { demand: true } });
          if (!reservation || reservation.quantity !== data.quantity) throw new Error("Issue quantity must match the active reservation.");
          await moveStock(tx, command, { actorUserId: data.actorUserId, allocatedDelta: -data.quantity, movementType: "ISSUE", occurredAt: data.occurredAt, partId: data.partId, quantityDelta: -data.quantity, reason: data.reason, sourceId: data.sourceId, sourceType: "PART_CUSTODY", stockLocationId: data.stockLocationId, unitCostCents });
          await tx.partReservation.update({ where: { id: reservation.id }, data: { releasedAt: data.occurredAt, status: "CONSUMED" } });
          await tx.repairPartDemand.update({ where: { id: reservation.demandId }, data: { quantityReserved: Math.max(0, reservation.demand.quantityReserved - data.quantity), status: "RELEASED", version: { increment: 1 } } });
        } else {
          await moveStock(tx, command, { actorUserId: data.actorUserId, movementType: "RETURN", occurredAt: data.occurredAt, partId: data.partId, quantityDelta: data.quantity, reason: data.reason, sourceId: data.sourceId, sourceType: "PART_CUSTODY", stockLocationId: data.stockLocationId, unitCostCents });
        }
        const record = await tx.partCustodyEvent.create({ data: { actorUserId: data.actorUserId, correlationId: command.correlationId, evidence: toJson(data.evidence), fromStockLocationId: data.type === "UNUSED_RETURN" ? null : data.stockLocationId, id: command.subjectId, occurredAt: data.occurredAt, organizationId: command.organizationId, partId: data.partId, quantity: data.quantity, reason: data.reason, repairJobId: data.repairJobId, sourceId: data.sourceId, sourceType: "PART_CUSTODY", toStockLocationId: data.type === "UNUSED_RETURN" ? data.stockLocationId : null, type: data.type, unitCostCents } });
        return { result: { id: record.id, partId: record.partId, quantity: record.quantity, type: record.type } };
      });
    },

    createTransfer(command: EnterpriseCommandCommitInput, data: { createdByUserId: string; fromStockLocationId: string; lines: TransferLine[]; locationId: string; reason: string; toStockLocationId: string; transferNumber: string }) {
      return executeAggregateMutation(database, command, "vehicle-operations.parts", async (tx) => {
        const locations = await tx.partStockLocation.count({ where: { id: { in: [data.fromStockLocationId, data.toStockLocationId] }, organizationId: command.organizationId, isActive: true } });
        if (locations !== 2) throw new Error("Both transfer stock locations must be active.");
        const record = await tx.partTransfer.create({ data: { createdByUserId: data.createdByUserId, fromStockLocationId: data.fromStockLocationId, id: command.subjectId, lines: toJson(data.lines), locationId: data.locationId, organizationId: command.organizationId, reason: data.reason, toStockLocationId: data.toStockLocationId, transferNumber: data.transferNumber } });
        return { result: { id: record.id, status: record.status, transferNumber: record.transferNumber } };
      });
    },

    transitionTransfer(command: EnterpriseCommandCommitInput, transferId: string, data: { actorUserId: string; discrepancyNotes: string | null; occurredAt: Date; reason: string; toStatus: string }) {
      return executeAggregateMutation(database, command, "vehicle-operations.parts", async (tx, version) => {
        const record = await tx.partTransfer.findFirst({ where: { id: transferId, organizationId: command.organizationId } });
        if (!record) throw new Error("Part transfer was not found.");
        if (data.toStatus === "SHIPPED") assertIndependentPartsApproval("TRANSFER_RELEASE", record.createdByUserId, data.actorUserId);
        const lines = record.lines as TransferLine[];
        if (data.toStatus === "SHIPPED" || data.toStatus === "RECEIVED") {
          for (const [index, line] of lines.entries()) {
            const shipping = data.toStatus === "SHIPPED";
            await moveStock(tx, command, { actorUserId: data.actorUserId, movementType: shipping ? "TRANSFER_OUT" : "TRANSFER_IN", occurredAt: data.occurredAt, partId: line.partId, quantityDelta: shipping ? -line.quantity : line.quantity, reason: data.reason, sourceId: `${record.id}:${index}`, sourceType: shipping ? "PART_TRANSFER_SHIP" : "PART_TRANSFER_RECEIVE", stockLocationId: shipping ? record.fromStockLocationId : record.toStockLocationId, unitCostCents: line.unitCostCents });
            await tx.partCustodyEvent.create({ data: { actorUserId: data.actorUserId, correlationId: command.correlationId, evidence: toJson([]), fromStockLocationId: record.fromStockLocationId, occurredAt: data.occurredAt, organizationId: command.organizationId, partId: line.partId, quantity: line.quantity, reason: data.reason, sourceId: `${record.id}:${index}`, sourceType: shipping ? "PART_TRANSFER_SHIP" : "PART_TRANSFER_RECEIVE", toStockLocationId: record.toStockLocationId, type: shipping ? "TRANSFER_SHIP" : "TRANSFER_RECEIVE", unitCostCents: line.unitCostCents } });
          }
        }
        const next = await tx.partTransfer.update({ where: { id: record.id }, data: { discrepancyNotes: data.discrepancyNotes, receivedAt: data.toStatus === "RECEIVED" ? data.occurredAt : record.receivedAt, shippedAt: data.toStatus === "SHIPPED" ? data.occurredAt : record.shippedAt, status: data.toStatus as never, version } });
        return { previous: record, result: { id: next.id, status: next.status, version } };
      });
    },

    createRecovery(command: EnterpriseCommandCommitInput, data: { createdByUserId: string; deadlineAt: Date; expectedCreditCents: number; partId: string; quantity: number; reason: string; sourceReference: string; type: "CORE" | "WARRANTY" | "VENDOR_RETURN"; vendorId: string | null }) {
      return executeAggregateMutation(database, command, "vehicle-operations.parts", async (tx) => {
        const part = await tx.part.findFirst({ where: { id: data.partId, organizationId: command.organizationId } });
        if (!part) throw new Error("Recovery part was not found.");
        if (data.vendorId && !await tx.partVendor.findFirst({ where: { id: data.vendorId, organizationId: command.organizationId } })) throw new Error("Recovery vendor was not found.");
        const record = await tx.partRecoveryCase.create({ data: { createdByUserId: data.createdByUserId, deadlineAt: data.deadlineAt, expectedCreditCents: data.expectedCreditCents, id: command.subjectId, organizationId: command.organizationId, partId: data.partId, quantity: data.quantity, reason: data.reason, sourceReference: data.sourceReference, type: data.type, vendorId: data.vendorId } });
        return { result: { id: record.id, status: record.status, type: record.type } };
      });
    },

    transitionRecovery(command: EnterpriseCommandCommitInput, recoveryId: string, data: { actorUserId: string; actualCreditCents: number | null; disputeReason: string | null; occurredAt: Date; reason: string; stockLocationId: string | null; toStatus: string }) {
      return executeAggregateMutation(database, command, "vehicle-operations.parts", async (tx, version) => {
        const record = await tx.partRecoveryCase.findFirst({ where: { id: recoveryId, organizationId: command.organizationId }, include: { part: true } });
        if (!record) throw new Error("Part recovery case was not found.");
        if (data.toStatus === "WRITTEN_OFF") assertIndependentPartsApproval("RECOVERY_WRITE_OFF", record.createdByUserId, data.actorUserId);
        if (data.toStatus === "SHIPPED") {
          if (!data.stockLocationId) throw new Error("Recovery shipment requires a stock location.");
          const movementType = record.type === "CORE" ? "CORE_RETURN" : record.type === "WARRANTY" ? "WARRANTY_RETURN" : "VENDOR_RETURN";
          await moveStock(tx, command, { actorUserId: data.actorUserId, movementType, occurredAt: data.occurredAt, partId: record.partId, quantityDelta: -record.quantity, reason: data.reason, sourceId: record.id, sourceType: "PART_RECOVERY_SHIP", stockLocationId: data.stockLocationId, unitCostCents: record.part.standardCostCents });
          await tx.partCustodyEvent.create({ data: { actorUserId: data.actorUserId, correlationId: command.correlationId, evidence: toJson([record.sourceReference]), fromStockLocationId: data.stockLocationId, occurredAt: data.occurredAt, organizationId: command.organizationId, partId: record.partId, quantity: record.quantity, reason: data.reason, sourceId: record.id, sourceType: "PART_RECOVERY_SHIP", type: record.type === "CORE" ? "CORE_SHIP" : record.type === "WARRANTY" ? "WARRANTY_SHIP" : "VENDOR_SHIP", unitCostCents: record.part.standardCostCents } });
        }
        if (data.toStatus === "CREDITED") await tx.partCustodyEvent.create({ data: { actorUserId: data.actorUserId, correlationId: command.correlationId, evidence: toJson([record.sourceReference]), occurredAt: data.occurredAt, organizationId: command.organizationId, partId: record.partId, quantity: record.quantity, reason: data.reason, sourceId: record.id, sourceType: "PART_RECOVERY_CREDIT", type: "CREDIT_ACKNOWLEDGED", unitCostCents: record.part.standardCostCents } });
        const terminal = ["CREDITED", "WRITTEN_OFF"].includes(data.toStatus);
        const next = await tx.partRecoveryCase.update({ where: { id: record.id }, data: { acknowledgedAt: data.toStatus === "ACKNOWLEDGED" ? data.occurredAt : record.acknowledgedAt, actualCreditCents: data.actualCreditCents ?? record.actualCreditCents, disputeReason: data.disputeReason, resolvedAt: terminal ? data.occurredAt : record.resolvedAt, shippedAt: data.toStatus === "SHIPPED" ? data.occurredAt : record.shippedAt, status: data.toStatus as never, version } });
        return { previous: record, result: { actualCreditCents: next.actualCreditCents, id: next.id, status: next.status, version } };
      });
    },
  };
}

export type ServiceClosePartsRepository = ReturnType<typeof createServiceClosePartsRepository>;
