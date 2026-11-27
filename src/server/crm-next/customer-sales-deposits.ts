import { Prisma } from "@prisma/client";
import { depositAmount, depositTerms, safeDepositReference, depositMethods, type DepositMethod } from "@/lib/customer-sales-deposits";
import type { AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";
import { canManageDeals } from "@/server/sales-documents/dashboard-operations";
import { evaluateUnifiedCrmCustomerReadPolicy } from "@/server/policies/unified-crm-customer-read";
import { vehicleCustodyBlocker } from "@/server/deal-continuity/custody-error";
import { resolveCrmNextAccess } from "./access";
import { resolveCustomerToolsOrganization } from "./customer-wishlist";

export class DepositError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export async function depositScope(actor: AuthenticatedUser | null, customerId: string, write = false) {
  if (!actor?.isActive) throw new DepositError("Sign in to view customer deposits.", 401);
  const scope = evaluateUnifiedCrmCustomerReadPolicy(actor).recordScope;
  if (!scope || !resolveCrmNextAccess(actor).allowed) throw new DepositError("You do not have access to customer deposits.", 403);
  const manage = canManageDeals(actor);
  if (write && !manage) throw new DepositError("A manager must record received deposits and refunds.", 403);
  const organizationId = await resolveCustomerToolsOrganization(actor, customerId);
  if (!organizationId) throw new DepositError("This customer record is not available.", 404);
  return { actor, manage, customerId, organizationId, customerWhere: { id: customerId, organizationId, archivedAt: null, mergedIntoCustomerId: null,
    ...(scope.kind === "OWNER" ? { ownerUserId: scope.ownerUserId } : {}) } };
}
type Scope = Awaited<ReturnType<typeof depositScope>>;
const depositSelect = {
  id: true, amountCents: true, method: true, nonRefundable: true, vehicleId: true, vehicleLabel: true, vin: true,
  receivedAt: true, refundedAt: true
} as const;
const scopeWhere = (scope: Scope) => ({ organizationId: scope.organizationId, customerId: scope.customerId, customer: scope.customerWhere });
const saleStages = ["RESERVED_DEAL_PENDING", "SOLD", "DELIVERED", "WHOLESALED_OR_OTHER_DISPOSITION"] as const;
const vehicleWhere = (organizationId: string) => ({
  organizationId, mergedIntoVehicleId: null, status: "ACTIVE" as const,
  inventoryUnits: { some: { organizationId, closedAt: null, lifecycleStage: "FRONTLINE_READY" as const } }
});
const vehicleSelect = { id: true, stockNumber: true, vin: true, vehicleNumber: true, year: true, make: true, model: true } as const;
const label = (v: { year: number | null; make: string | null; model: string | null; stockNumber: string | null; vehicleNumber: string }) =>
  [[v.year, v.make, v.model].filter(Boolean).join(" "), v.stockNumber || v.vehicleNumber].filter(Boolean).join(" / ");

export async function listCustomerDeposits(scope: Scope) {
  const deposits = await prisma.customerSalesDeposit.findMany({ where: scopeWhere(scope), select: depositSelect, orderBy: [{ receivedAt: "desc" }, { id: "desc" }] });
  return { deposits, canRecord: scope.manage };
}
export async function findDepositVehicles(scope: Scope, query: string) {
  if (!scope.manage) throw new DepositError("A manager must select the deposit vehicle.", 403);
  if (query.trim().length < 2) return [];
  const value = query.trim().slice(0, 60);
  const vehicles = await prisma.vehicle.findMany({
    where: { ...vehicleWhere(scope.organizationId), salesDeposits: { none: { refundedAt: null } }, OR: [
      { vin: { contains: value, mode: "insensitive" } }, { stockNumber: { contains: value, mode: "insensitive" } },
      { vehicleNumber: { contains: value, mode: "insensitive" } }, { make: { contains: value, mode: "insensitive" } },
      { model: { contains: value, mode: "insensitive" } },
      { inventoryUnits: { some: { organizationId: scope.organizationId, closedAt: null, inventoryNumber: { contains: value, mode: "insensitive" } } } }
    ] }, select: vehicleSelect, orderBy: [{ stockNumber: "asc" }, { id: "asc" }], take: 20
  });
  return vehicles.map(vehicle => ({ id: vehicle.id, label: label(vehicle), vin: vehicle.vin }));
}
export async function getDepositReceipt(scope: Scope, id: string) {
  const deposit = await prisma.customerSalesDeposit.findFirst({ where: { ...scopeWhere(scope), id } });
  if (!deposit) throw new DepositError("This receipt is not available.", 404);
  return deposit;
}
export type DepositReceipt = Awaited<ReturnType<typeof getDepositReceipt>>;

async function lockVehicle(tx: Prisma.TransactionClient, organizationId: string, vehicleId: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${organizationId + ":" + vehicleId}, 0))`;
}
async function requireUncommittedVehicle(tx: Prisma.TransactionClient, organizationId: string, vehicleId: string) {
  await lockVehicle(tx, organizationId, vehicleId);
  const vehicle = await tx.vehicle.findFirst({ where: { ...vehicleWhere(organizationId), id: vehicleId }, select: vehicleSelect });
  if (!vehicle) throw new DepositError("Choose an active, frontline-ready inventory vehicle. No deposit was saved.", 409);
  await tx.$executeRaw`SELECT assert_vehicle_use_clear(${organizationId}, ${vehicleId})`;
  const conflictingStage = await tx.inventoryUnit.findFirst({ where: { organizationId, vehicleId, lifecycleStage: { in: [...saleStages] }, closedAt: null }, select: { id: true } });
  const [conflict] = await tx.$queryRaw<{ claimed: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM "DealDeskDraft" d
      LEFT JOIN "DealWorkflowContext" ctx ON ctx."draftId" = d."id"
      JOIN "Vehicle" v ON v."id" = ${vehicleId} AND v."organizationId" = ${organizationId}
      WHERE deal_document_organization_matches(d."organizationId", v."organizationId") AND vehicle_commercial_pathway(d."pathway")
        AND (d."status" = 'SOLD' OR (d."status" = 'PENDING' AND d."snapshot" ? 'desk:soldVehicleId'))
        AND (v."id" = COALESCE(d."snapshot" ->> 'desk:soldVehicleId',ctx."vehicleId",d."snapshot" #>> '{desk:identity,vehicleId}')
          OR vehicle_commercial_reference_matches(v, d."vehicleReference")
          OR vehicle_commercial_reference_matches(v, d."snapshot" -> (d."pathway" || ':vehicleFacts') ->> 'vin')
          OR vehicle_commercial_reference_matches(v, d."snapshot" -> (d."pathway" || ':vehicleFacts') ->> 'stockNumber'))
    ) OR EXISTS (
      SELECT 1 FROM "SalesDocumentJacket" j JOIN "Vehicle" v ON v."id" = ${vehicleId} AND v."organizationId" = ${organizationId}
      WHERE deal_document_organization_matches(j."organizationId", v."organizationId") AND vehicle_commercial_pathway(j."pathway")
        AND j."state" IN ('CLOSED','DELIVERED_FUNDING_PENDING','UNWIND_PENDING')
        AND (vehicle_commercial_reference_matches(v,j."vin") OR vehicle_commercial_reference_matches(v,j."stockNumber") OR vehicle_commercial_reference_matches(v,j."vehicleReference"))
    ) OR EXISTS (
      SELECT 1 FROM "VehicleCommercialHandoff" h WHERE h."organizationId" = ${organizationId} AND h."vehicleId" = ${vehicleId}
        AND h."handoffType" = 'DELIVERY' AND h."status" IN ('COMPLETED','RECONCILED')
    ) AS claimed`;
  const activeRetail = await tx.inventoryRetailCompletion.findFirst({ where: {
    organizationId, inventoryUnit: { organizationId, vehicleId, closedAt: null },
    stage: { notIn: ["AVAILABLE_FOR_SALE", "CANCELLED"] }
  }, select: { id: true } });
  if (conflictingStage || activeRetail || conflict.claimed) throw new DepositError("This vehicle is already reserved or committed in another sales workflow. No deposit was saved.", 409);
  const active = await tx.customerSalesDeposit.findFirst({ where: { organizationId, vehicleId, refundedAt: null }, select: { id: true } });
  if (active) throw new DepositError("This vehicle already has an active deposit hold. No deposit was saved.", 409);
  return vehicle;
}

export async function changeCustomerDeposit(scope: Scope, body: Record<string, unknown>) {
  if (!scope.manage) throw new DepositError("A manager must record received deposits and refunds.", 403);
  const id = typeof body.id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.id) ? body.id.toLowerCase() : "";
  if (!id || !["receive", "refund"].includes(String(body.action))) throw new DepositError("Choose a valid deposit action.");
  const { actor, organizationId, customerId } = scope;
  const reference = safeDepositReference(body.reference);
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${organizationId + ":customer-deposit:" + id}, 0))`;
    const customer = await tx.customer.findFirst({ where: scope.customerWhere, select: { displayName: true, organization: { select: { name: true } } } });
    if (!customer) throw new DepositError("This customer record is not available.", 404);
    const existing = await tx.customerSalesDeposit.findFirst({ where: { ...scopeWhere(scope), id } });
    const audit = async (eventType: string) => tx.enterpriseAuditEvent.create({ data: {
      organizationId, actorUserId: actor.id, domain: "UNIFIED_CRM", subjectType: "CUSTOMER", subjectId: customerId,
      eventType, reason: eventType === "CUSTOMER_DEPOSIT_RECEIVED" ? "Confirmed receipt of payment." : "Confirmed full refund through the original payment channel.",
      metadata: { depositId: id }, correlationId: id
    } });

    if (body.action === "refund") {
      const reason = typeof body.reason === "string" ? body.reason.trim() : "";
      if (body.confirmed !== true || !reference || !reason || reason.length > 200) throw new DepositError("Confirm the full refund was issued and enter its reference and reason.");
      if (!existing) throw new DepositError("This deposit is not available.", 404);
      if (depositAmount(body.amount) !== existing.amountCents) throw new DepositError("The amount actually refunded must match the full original deposit. The hold remains in place.", 409);
      if (existing.paymentReference === reference) throw new DepositError("Enter the refund transaction reference, not the original payment reference.");
      if (existing.refundedAt) {
        if (existing.refundReference === reference && existing.refundReason === reason) return { id, duplicate: true };
        throw new DepositError("A full refund is already recorded. Reopen the receipt to review it.", 409);
      }
      if (existing.vehicleId) await lockVehicle(tx, organizationId, existing.vehicleId);
      await tx.customerSalesDeposit.update({ where: { id }, data: { refundedAt: new Date(), refundedById: actor.id, refundReference: reference, refundReason: reason } });
      await audit("CUSTOMER_DEPOSIT_REFUNDED");
      return { id, duplicate: false };
    }

    const amountCents = depositAmount(body.amount);
    const method = typeof body.method === "string" && Object.hasOwn(depositMethods, body.method) ? body.method as DepositMethod : null;
    const nonRefundable = body.nonRefundable === true;
    const vehicleId = typeof body.vehicleId === "string" && body.vehicleId.trim() ? body.vehicleId.trim() : null;
    if (vehicleId && vehicleId.length > 150) throw new DepositError("Choose an inventory vehicle from the list.");
    if (!amountCents || !method || body.confirmed !== true || body.termsPresented !== true) throw new DepositError("Enter the amount and payment method, present the terms, and confirm that payment was received.");
    if ((method !== "CASH" || body.reference) && !reference) throw new DepositError("Enter a valid transaction reference, not a card number.");
    if (existing) {
      if (existing.amountCents === amountCents && existing.method === method && existing.paymentReference === (reference || null)
        && existing.nonRefundable === nonRefundable && existing.vehicleId === vehicleId) return { id, duplicate: true };
      throw new DepositError("This receipt was already issued with different details. Review the saved deposit before starting another.", 409);
    }
    const vehicle = vehicleId ? await requireUncommittedVehicle(tx, organizationId, vehicleId) : null;
    await tx.customerSalesDeposit.create({ data: {
      id, organizationId, customerId, vehicleId, amountCents, method, paymentReference: reference || null, nonRefundable,
      terms: depositTerms(Boolean(vehicle), nonRefundable), companyName: customer.organization.name, customerName: customer.displayName,
      vehicleLabel: vehicle ? label(vehicle) : null, vin: vehicle?.vin ?? null, receivedById: actor.id, receivedByName: actor.name
    } });
    await audit("CUSTOMER_DEPOSIT_RECEIVED");
    return { id, duplicate: false };
  }).catch((error: unknown) => {
    const blocker = vehicleCustodyBlocker(error);
    if (blocker) throw new DepositError(blocker, 409);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new DepositError("This payment reference or vehicle hold is already recorded. Review the saved deposit before retrying.", 409);
    throw error;
  });
}
