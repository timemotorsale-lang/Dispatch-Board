import { randomUUID } from "node:crypto";
import { partsProcurementType, recordedReconBudget } from "@/lib/parts-procurement";
import type { AuthenticatedUser } from "@/server/auth/store";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { normalizeEnterpriseCommand } from "@/server/enterprise-command/domain";
import { createEnterpriseCommandRepository, type EnterpriseCommandRepository } from "@/server/enterprise-command/repository";
import { describeVehicleOperationsBlock, evaluateVehicleOperationsFeature } from "@/server/enterprise-command/service";
import { assertVehicleCapability } from "@/server/enterprise-command/vehicle-capabilities";
import { recordAcquisitionAppraisal } from "@/server/inventory-lifecycle/acquisition";
import { assertAuthenticatedUser, isManager } from "@/server/policies/access";
import {
  normalizeClose,
  normalizeCustody,
  normalizeDiscrepancyResolution,
  normalizeInterchange,
  normalizeInvoiceHandoff,
  normalizeInvoicePackage,
  normalizeOffer,
  normalizeOfferSelection,
  normalizePurchaseOrder,
  normalizePurchaseRevision,
  normalizePurchaseTransition,
  normalizeReceipt,
  normalizeRecovery,
  normalizeRecoveryTransition,
  normalizeReopen,
  normalizeRequisition,
  normalizeTransfer,
  normalizeTransferTransition,
  normalizeVendor,
  object,
  required,
} from "./domain";
import { createServiceClosePartsRepository, type ServiceClosePartsRepository } from "./repository";

type Dependencies = { enforceRollout?: boolean; foundationRepository?: EnterpriseCommandRepository; now?: () => Date; organizationId?: string; repository?: ServiceClosePartsRepository };
type Domain = "SHOP_OPERATIONS" | "PARTS_OPERATIONS";

function dependencies(input: Dependencies) {
  return { enforceRollout: input.enforceRollout ?? true, foundationRepository: input.foundationRepository ?? createEnterpriseCommandRepository(), now: input.now ?? (() => new Date()), organizationId: input.organizationId ?? INITIAL_ORGANIZATION.id, repository: input.repository ?? createServiceClosePartsRepository() };
}

function isOperationsCoordinatorReceivingUser(user: AuthenticatedUser) {
  return user.roles.includes("Operations Coordinator") ||
    user.roles.includes("Front Desk Operations Coordinator") ||
    (user.roles.includes("Office Manager") && user.roles.includes("Marketing/Advertisement Manager"));
}

async function authorize(actor: AuthenticatedUser | null, domain: Domain, manage: boolean, locationId: string | null, context: ReturnType<typeof dependencies>, options: { allowCoordinatorReceiving?: boolean } = {}) {
  const user = assertAuthenticatedUser(actor), capability = domain === "SHOP_OPERATIONS" ? (manage ? "REPAIR_ORDER_MANAGE" : "REPAIR_ORDER_VIEW") : (manage ? "PARTS_MANAGE" : "PARTS_VIEW");
  const grants = await context.foundationRepository.listCapabilityGrants(user.id, context.organizationId);
  try {
    assertVehicleCapability({ actor: user, capability, grants, locationId, now: context.now() });
  } catch (error) {
    if (!options.allowCoordinatorReceiving || domain !== "PARTS_OPERATIONS" || !manage || !isOperationsCoordinatorReceivingUser(user)) throw error;
    assertVehicleCapability({ actor: user, capability: "PARTS_VIEW", grants, locationId, now: context.now() });
  }
  if (manage && context.enforceRollout) {
    const flags = await context.foundationRepository.listFeatureFlags(context.organizationId), decision = evaluateVehicleOperationsFeature(flags, domain, user.id, locationId);
    if (!decision.executable) throw new Error(`${domain === "SHOP_OPERATIONS" ? "Shop" : "Parts"} Operations mutations are not enabled. ${describeVehicleOperationsBlock(decision.reason)}`);
  }
  return user;
}

function command(input: { actorUserId: string; commandType: string; domain: Domain; expectedVersion?: number; idempotencyKey: string; locationId?: string | null; organizationId: string; payload: Record<string, unknown>; reason: string; subjectId: string; subjectType: string }) {
  return normalizeEnterpriseCommand({ ...input, expectedVersion: input.expectedVersion ?? 0, locationId: input.locationId ?? null });
}

function payload(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

function integer(value: unknown, label: string) {
  const amount = Number(value);
  if (!Number.isInteger(amount) || amount < 0) throw new Error(`${label} must be a non-negative whole number.`);
  return amount;
}

function snapshot(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function centsFrom(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export async function getServiceClosePartsWorkspace(actor: AuthenticatedUser | null, input: Dependencies = {}) {
  const context = dependencies(input);
  await authorize(actor, "SHOP_OPERATIONS", false, null, context);
  await authorize(actor, "PARTS_OPERATIONS", false, null, context);
  return context.repository.overview(context.organizationId);
}

export async function getPartsOperationsSource(actor: AuthenticatedUser | null, input: Dependencies = {}) {
  const context = dependencies(input);
  await authorize(actor, "PARTS_OPERATIONS", false, null, context);
  const overview = await context.repository.overview(context.organizationId);
  return {
    custodyEvents: overview.custodyEvents,
    demands: overview.demands,
    discrepancies: overview.discrepancies,
    locations: overview.locations,
    offers: overview.offers,
    purchaseOrders: overview.purchaseOrders,
    receipts: overview.receipts,
    recoveries: overview.recoveries,
    requisitions: overview.requisitions,
    transfers: overview.transfers,
  };
}

export async function executeServiceClosePartsCommand(actor: AuthenticatedUser | null, value: unknown, input: Dependencies = {}) {
  const raw = object(value), action = required(raw.action, "Action", 80).toUpperCase(), context = dependencies(input);
  const view = await context.repository.overview(context.organizationId);
  const shop = ["GENERATE_INVOICE_PACKAGE", "TRANSITION_INVOICE_HANDOFF", "CLOSE_REPAIR_ORDER", "REOPEN_REPAIR_ORDER"].includes(action);
  const subjectId = typeof raw.subjectId === "string" ? raw.subjectId.trim() : "";
  const order = shop ? view.repairOrders.find((item) => item.id === (action === "TRANSITION_INVOICE_HANDOFF" ? itemInvoiceOrder(view.repairOrders, subjectId) : subjectId)) : null;
  const receivePurchaseOrder = action === "RECEIVE_PURCHASE_ORDER" ? view.purchaseOrders.find((item) => item.id === subjectId) ?? null : null;
  const user = await authorize(actor, shop ? "SHOP_OPERATIONS" : "PARTS_OPERATIONS", true, receivePurchaseOrder?.locationId ?? order?.locationId ?? null, context, { allowCoordinatorReceiving: action === "RECEIVE_PURCHASE_ORDER" });

  const receipt = shop ? await context.repository.commandReceipt?.(context.organizationId, action, String(raw.idempotencyKey ?? "")) : null;
  if (action === "GENERATE_INVOICE_PACKAGE") {
    const data = normalizeInvoicePackage(raw);
    if (!order) throw new Error("Repair order was not found.");
    const version = receipt?.expectedVersion ?? await context.repository.aggregateVersion(context.organizationId, "SHOP_OPERATIONS", "REPAIR_ORDER", order.id);
    return context.repository.generateInvoice(command({ actorUserId: user.id, commandType: action, domain: "SHOP_OPERATIONS", expectedVersion: version, idempotencyKey: data.idempotencyKey, locationId: order.locationId, organizationId: context.organizationId, payload: payload(data), reason: data.reason, subjectId: order.id, subjectType: "REPAIR_ORDER" }), { ...data, createdByUserId: user.id });
  }
  if (action === "TRANSITION_INVOICE_HANDOFF") {
    const data = normalizeInvoiceHandoff(raw), invoice = view.repairOrders.flatMap((item) => item.invoicePackages).find((item) => item.id === subjectId);
    if (!invoice) throw new Error("Invoice-ready package was not found.");
    const owningOrder = view.repairOrders.find((item) => item.id === invoice.repairOrderId), version = receipt?.expectedVersion ?? await context.repository.aggregateVersion(context.organizationId, "SHOP_OPERATIONS", "SERVICE_INVOICE_PACKAGE", invoice.id);
    return context.repository.transitionInvoice(command({ actorUserId: user.id, commandType: action, domain: "SHOP_OPERATIONS", expectedVersion: version, idempotencyKey: data.idempotencyKey, locationId: owningOrder?.locationId, organizationId: context.organizationId, payload: payload(data), reason: data.reason, subjectId: invoice.id, subjectType: "SERVICE_INVOICE_PACKAGE" }), invoice.id, data);
  }
  if (action === "CLOSE_REPAIR_ORDER" || action === "REOPEN_REPAIR_ORDER") {
    if (!order) throw new Error("Repair order was not found.");
    const data = action === "CLOSE_REPAIR_ORDER" ? normalizeClose(raw) : normalizeReopen(raw), version = receipt?.expectedVersion ?? await context.repository.aggregateVersion(context.organizationId, "SHOP_OPERATIONS", "REPAIR_ORDER", order.id);
    const enterprise = command({ actorUserId: user.id, commandType: action, domain: "SHOP_OPERATIONS", expectedVersion: version, idempotencyKey: data.idempotencyKey, locationId: order.locationId, organizationId: context.organizationId, payload: payload(data), reason: data.reason, subjectId: order.id, subjectType: "REPAIR_ORDER" });
    return action === "CLOSE_REPAIR_ORDER" ? context.repository.closeOrder(enterprise, data as ReturnType<typeof normalizeClose>) : context.repository.reopenOrder(enterprise, data);
  }

  const id = randomUUID();
  if (action === "CREATE_VENDOR") {
    const data = normalizeVendor(raw); return context.repository.createVendor(command({ actorUserId: user.id, commandType: action, domain: "PARTS_OPERATIONS", idempotencyKey: data.idempotencyKey, organizationId: context.organizationId, payload: payload(data), reason: data.reason, subjectId: id, subjectType: "PART_VENDOR" }), { ...data, createdByUserId: user.id });
  }
  if (action === "CREATE_VENDOR_OFFER") {
    const data = normalizeOffer(raw); return context.repository.createOffer(command({ actorUserId: user.id, commandType: action, domain: "PARTS_OPERATIONS", idempotencyKey: data.idempotencyKey, organizationId: context.organizationId, payload: payload(data), reason: data.reason, subjectId: id, subjectType: "PART_VENDOR_OFFER" }), data);
  }
  if (action === "CREATE_INTERCHANGE") {
    const data = normalizeInterchange(raw); return context.repository.createInterchange(command({ actorUserId: user.id, commandType: action, domain: "PARTS_OPERATIONS", idempotencyKey: data.idempotencyKey, organizationId: context.organizationId, payload: payload(data), reason: data.reason, subjectId: id, subjectType: "PART_INTERCHANGE" }), { ...data, approvedByUserId: user.id });
  }
  if (action === "CREATE_REQUISITION") {
    const data = normalizeRequisition(raw); return context.repository.createRequisition(command({ actorUserId: user.id, commandType: action, domain: "PARTS_OPERATIONS", idempotencyKey: data.idempotencyKey, organizationId: context.organizationId, payload: payload(data), reason: data.reason, subjectId: id, subjectType: "PART_REQUISITION" }), { ...data, createdByUserId: user.id });
  }
  if (action === "SELECT_REQUISITION_OFFER") {
    const data = normalizeOfferSelection(raw), record = view.requisitions.find((item) => item.id === subjectId); if (!record) throw new Error("Requisition was not found.");
    const version = await context.repository.aggregateVersion(context.organizationId, "PARTS_OPERATIONS", "PART_REQUISITION", record.id);
    return context.repository.selectOffer(command({ actorUserId: user.id, commandType: action, domain: "PARTS_OPERATIONS", expectedVersion: version, idempotencyKey: data.idempotencyKey, organizationId: context.organizationId, payload: payload(data), reason: data.reason, subjectId: record.id, subjectType: "PART_REQUISITION" }), record.id, data);
  }
  if (action === "CREATE_PURCHASE_ORDER") {
    const data = normalizePurchaseOrder(raw); return context.repository.createPurchaseOrder(command({ actorUserId: user.id, commandType: action, domain: "PARTS_OPERATIONS", idempotencyKey: data.idempotencyKey, locationId: data.locationId, organizationId: context.organizationId, payload: payload(data), reason: data.reason, subjectId: id, subjectType: "PART_PURCHASE_ORDER" }), { ...data, createdByUserId: user.id });
  }
  if (action === "TRANSITION_PURCHASE_ORDER") {
    const record = view.purchaseOrders.find((item) => item.id === subjectId); if (!record) throw new Error("Purchase order was not found."); const data = normalizePurchaseTransition(raw, record.status), version = await context.repository.aggregateVersion(context.organizationId, "PARTS_OPERATIONS", "PART_PURCHASE_ORDER", record.id);
    return context.repository.transitionPurchaseOrder(command({ actorUserId: user.id, commandType: action, domain: "PARTS_OPERATIONS", expectedVersion: version, idempotencyKey: data.idempotencyKey, locationId: record.locationId, organizationId: context.organizationId, payload: payload(data), reason: data.reason, subjectId: record.id, subjectType: "PART_PURCHASE_ORDER" }), record.id, { ...data, allowFinalAuthoritySelfApproval: data.toStatus === "APPROVED" && isManager(user) });
  }
  if (action === "REVISE_PURCHASE_ORDER") {
    const record = view.purchaseOrders.find((item) => item.id === subjectId); if (!record) throw new Error("Purchase order was not found."); const data = normalizePurchaseRevision(raw, record.status), version = await context.repository.aggregateVersion(context.organizationId, "PARTS_OPERATIONS", "PART_PURCHASE_ORDER", record.id);
    return context.repository.revisePurchaseOrder(command({ actorUserId: user.id, commandType: action, domain: "PARTS_OPERATIONS", expectedVersion: version, idempotencyKey: data.idempotencyKey, locationId: record.locationId, organizationId: context.organizationId, payload: payload(data), reason: data.reason, subjectId: record.id, subjectType: "PART_PURCHASE_ORDER" }), record.id, data);
  }
  if (action === "REQUEST_RECON_BUDGET_EXCEPTION" || action === "DENY_RECON_BUDGET_EXCEPTION" || action === "APPROVE_RECON_BUDGET_EXCEPTION") {
    const repairOrder = view.repairOrders.find((item) => item.id === subjectId);
    if (!repairOrder) throw new Error("Repair order was not found.");
    if (partsProcurementType(repairOrder) !== "INVENTORY_RECON") throw new Error("Recon budget approvals apply only to internal inventory repairs. Customer purchases use the customer repair order.");
    if (!repairOrder.inventoryUnit?.id) throw new Error("This repair order is not linked to an inventory unit, so a recon budget exception cannot be recorded here.");
    if (action !== "REQUEST_RECON_BUDGET_EXCEPTION" && !isManager(user)) throw new Error("A manager or authorized approver is required to decide a recon budget exception.");

    const increaseByCents = integer(raw.increaseByCents, "Increase amount");
    const currentMaxReconBudgetCents = recordedReconBudget(repairOrder)?.estimatedReconBudgetCents ?? 0;
    const exceptionReason = required(raw.reason, "Reason", 500);
    const nextBudgetCents = currentMaxReconBudgetCents + increaseByCents;
    const appraisalSnapshot = snapshot(repairOrder.inventoryUnit.acquisitionCase?.appraisalSnapshot);
    const latestAppraisal = repairOrder.inventoryUnit.acquisitionAppraisals?.[0] ?? null;
    const expectedRetailCents = centsFrom(appraisalSnapshot.expectedRetailCents) ?? centsFrom(latestAppraisal?.estimatedRetailCents) ?? null;
    const estimatedFeesCents = centsFrom(appraisalSnapshot.estimatedFeesCents);
    const decisionStatus = action === "APPROVE_RECON_BUDGET_EXCEPTION" ? "APPROVED" : action === "DENY_RECON_BUDGET_EXCEPTION" ? "DECLINED" : "RECOMMENDED";
    const requestType = action === "APPROVE_RECON_BUDGET_EXCEPTION" ? "RECON_BUDGET_EXCEPTION_APPROVED" : action === "DENY_RECON_BUDGET_EXCEPTION" ? "RECON_BUDGET_EXCEPTION_DENIED" : "RECON_BUDGET_EXCEPTION_REQUESTED";

    const record = await recordAcquisitionAppraisal(user, repairOrder.inventoryUnit.id, {
      comparableSnapshot: { ...snapshot(appraisalSnapshot.comparableSnapshot), approvedFrom: "service-close-parts", repairOrderId: repairOrder.id },
      conditionSummary: {
        decidedAt: context.now().toISOString(),
        decidedByUserId: user.id,
        decidedByUserName: user.name,
        increaseByCents,
        previousEstimatedReconCents: currentMaxReconBudgetCents,
        reason: exceptionReason,
        repairOrderId: repairOrder.id,
        repairOrderNumber: repairOrder.repairOrderNumber,
        requestType,
      },
      confidence: "UNKNOWN",
      decisionStatus,
      estimatedFeesCents: estimatedFeesCents ?? undefined,
      estimatedReconCents: action === "APPROVE_RECON_BUDGET_EXCEPTION" ? nextBudgetCents : currentMaxReconBudgetCents,
      estimatedRetailCents: expectedRetailCents ?? undefined,
      evidenceObjectIds: [`recon-budget-exception:${repairOrder.repairOrderNumber}`, `${decisionStatus.toLowerCase()}-by:${user.id}`],
    });

    return {
      duplicate: false,
      result: {
        decisionStatus,
        id: record.id,
        increaseByCents,
        inventoryUnitId: repairOrder.inventoryUnit.id,
        nextBudgetCents: action === "APPROVE_RECON_BUDGET_EXCEPTION" ? nextBudgetCents : currentMaxReconBudgetCents,
        repairOrderId: repairOrder.id,
        repairOrderNumber: repairOrder.repairOrderNumber,
      },
      version: record.version,
    };
  }
  if (action === "RECEIVE_PURCHASE_ORDER") {
    const record = receivePurchaseOrder; if (!record) throw new Error("Purchase order was not found."); const data = normalizeReceipt(raw), version = await context.repository.aggregateVersion(context.organizationId, "PARTS_OPERATIONS", "PART_PURCHASE_ORDER", record.id);
    return context.repository.receivePurchaseOrder(command({ actorUserId: user.id, commandType: action, domain: "PARTS_OPERATIONS", expectedVersion: version, idempotencyKey: data.idempotencyKey, locationId: record.locationId, organizationId: context.organizationId, payload: payload(data), reason: data.reason, subjectId: record.id, subjectType: "PART_PURCHASE_ORDER" }), record.id, { ...data, receiptId: id, receivedByUserId: user.id });
  }
  if (action === "RESOLVE_RECEIVING_DISCREPANCY") {
    const record = view.discrepancies.find((item) => item.id === subjectId); if (!record) throw new Error("Receiving discrepancy was not found."); const data = normalizeDiscrepancyResolution(raw), version = await context.repository.aggregateVersion(context.organizationId, "PARTS_OPERATIONS", "PART_RECEIVING_DISCREPANCY", record.id);
    return context.repository.resolveDiscrepancy(command({ actorUserId: user.id, commandType: action, domain: "PARTS_OPERATIONS", expectedVersion: version, idempotencyKey: data.idempotencyKey, organizationId: context.organizationId, payload: payload(data), reason: data.reason, subjectId: record.id, subjectType: "PART_RECEIVING_DISCREPANCY" }), record.id, { ...data, resolvedByUserId: user.id });
  }
  if (action === "RECORD_PART_CUSTODY") {
    const data = normalizeCustody(raw); return context.repository.recordCustody(command({ actorUserId: user.id, commandType: `${action}_${data.type}`, domain: "PARTS_OPERATIONS", idempotencyKey: data.idempotencyKey, organizationId: context.organizationId, payload: payload(data), reason: data.reason, subjectId: id, subjectType: "PART_CUSTODY_EVENT" }), { ...data, actorUserId: user.id });
  }
  if (action === "CREATE_PART_TRANSFER") {
    const data = normalizeTransfer(raw); return context.repository.createTransfer(command({ actorUserId: user.id, commandType: action, domain: "PARTS_OPERATIONS", idempotencyKey: data.idempotencyKey, locationId: data.locationId, organizationId: context.organizationId, payload: payload(data), reason: data.reason, subjectId: id, subjectType: "PART_TRANSFER" }), { ...data, createdByUserId: user.id });
  }
  if (action === "TRANSITION_PART_TRANSFER") {
    const record = view.transfers.find((item) => item.id === subjectId); if (!record) throw new Error("Part transfer was not found."); const data = normalizeTransferTransition(raw, record.status), version = await context.repository.aggregateVersion(context.organizationId, "PARTS_OPERATIONS", "PART_TRANSFER", record.id);
    return context.repository.transitionTransfer(command({ actorUserId: user.id, commandType: action, domain: "PARTS_OPERATIONS", expectedVersion: version, idempotencyKey: data.idempotencyKey, locationId: record.locationId, organizationId: context.organizationId, payload: payload(data), reason: data.reason, subjectId: record.id, subjectType: "PART_TRANSFER" }), record.id, { ...data, actorUserId: user.id });
  }
  if (action === "CREATE_PART_RECOVERY") {
    const data = normalizeRecovery(raw); return context.repository.createRecovery(command({ actorUserId: user.id, commandType: action, domain: "PARTS_OPERATIONS", idempotencyKey: data.idempotencyKey, organizationId: context.organizationId, payload: payload(data), reason: data.reason, subjectId: id, subjectType: "PART_RECOVERY" }), { ...data, createdByUserId: user.id });
  }
  if (action === "TRANSITION_PART_RECOVERY") {
    const record = view.recoveries.find((item) => item.id === subjectId); if (!record) throw new Error("Part recovery was not found."); const data = normalizeRecoveryTransition(raw, record.status), version = await context.repository.aggregateVersion(context.organizationId, "PARTS_OPERATIONS", "PART_RECOVERY", record.id);
    return context.repository.transitionRecovery(command({ actorUserId: user.id, commandType: action, domain: "PARTS_OPERATIONS", expectedVersion: version, idempotencyKey: data.idempotencyKey, organizationId: context.organizationId, payload: payload(data), reason: data.reason, subjectId: record.id, subjectType: "PART_RECOVERY" }), record.id, { ...data, actorUserId: user.id });
  }
  throw new Error("Service-close and parts action is not supported.");
}

function itemInvoiceOrder(repairOrders: Array<{ id: string; invoicePackages: Array<{ id: string }> }>, invoiceId: string) {
  return repairOrders.find((item) => item.invoicePackages.some((invoice) => invoice.id === invoiceId))?.id ?? "";
}
