import { Prisma } from "@prisma/client";
import { depositAgreementIssue, depositAmount, depositKinds, depositTerms, normalizeDepositVin, readDepositAgreement, safeDepositReference, depositMethods, vehicleDepositTerms, type DepositKind, type DepositMethod } from "@/lib/customer-sales-deposits";
import type { AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";
import { canManageDeals } from "@/server/sales-documents/dashboard-operations";
import { evaluateUnifiedCrmCustomerReadPolicy } from "@/server/policies/unified-crm-customer-read";
import { vehicleCustodyBlocker } from "@/server/deal-continuity/custody-error";
import { isValidVin } from "@/lib/vin";
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
  id: true, kind: true, amountCents: true, method: true, nonRefundable: true, vehicleId: true, vehicleLabel: true, vin: true,
  receivedAt: true, refundedAt: true
} as const;
const scopeWhere = (scope: Scope) => ({ organizationId: scope.organizationId, customerId: scope.customerId, customer: scope.customerWhere });
const saleStages = ["RESERVED_DEAL_PENDING", "SOLD", "DELIVERED", "WHOLESALED_OR_OTHER_DISPOSITION"] as const;
const vehicleWhere = (organizationId: string) => ({
  organizationId, mergedIntoVehicleId: null, status: "ACTIVE" as const,
  inventoryUnits: { some: { organizationId, closedAt: null, lifecycleStage: "FRONTLINE_READY" as const } }
});
const vehicleSelect = { id: true, stockNumber: true, vin: true, vehicleNumber: true, year: true, make: true, model: true, color: true } as const;
const label = (v: { year: number | null; make: string | null; model: string | null; stockNumber: string | null; vehicleNumber: string }) =>
  [[v.year, v.make, v.model].filter(Boolean).join(" "), v.stockNumber || v.vehicleNumber].filter(Boolean).join(" / ");

export async function listCustomerDeposits(scope: Scope) {
  const deposits = await prisma.customerSalesDeposit.findMany({ where: scopeWhere(scope), select: depositSelect, orderBy: [{ receivedAt: "desc" }, { id: "desc" }] });
  const pendingVins = [...new Set(deposits.flatMap(row => row.kind === "RESERVATION" && !row.refundedAt && row.vin ? [row.vin] : []))];
  const tracked = pendingVins.length ? await prisma.vehicle.findMany({ where: {
    organizationId: scope.organizationId, mergedIntoVehicleId: null, vin: { in: pendingVins, mode: "insensitive" },
    inventoryUnits: { some: { organizationId: scope.organizationId, closedAt: null } }
  }, select: { vin: true } }) : [];
  const trackedVins = new Set(tracked.map(row => normalizeDepositVin(row.vin)));
  return { deposits: deposits.map(row => ({
    ...row, needsInventoryIntake: row.kind === "RESERVATION" && !row.refundedAt && !trackedVins.has(row.vin ?? "")
  })), canRecord: scope.manage };
}
export async function findDepositVehicles(scope: Scope, query: string) {
  if (!scope.manage) throw new DepositError("A manager must select the deposit vehicle.", 403);
  if (query.trim().length < 2) return [];
  const tokens = query.trim().slice(0, 60).split(/\s+/).filter(token => /[a-z0-9]/i.test(token)).slice(0, 12);
  if (!tokens.length) return [];
  const vehicles = await prisma.vehicle.findMany({
    where: { ...vehicleWhere(scope.organizationId), salesDeposits: { none: { refundedAt: null } }, AND: tokens.map(token => {
      const match = { contains: token, mode: "insensitive" } as const;
      return { OR: [
        { vin: match }, { stockNumber: match }, { vehicleNumber: match }, { make: match }, { model: match }, { color: match },
        ...(/^\d{4}$/.test(token) ? [{ year: Number(token) }] : []),
        { inventoryUnits: { some: { organizationId: scope.organizationId, closedAt: null, inventoryNumber: match } } }
      ] };
    }) }, select: vehicleSelect, orderBy: [{ stockNumber: "asc" }, { id: "asc" }], take: 20
  });
  const vinOptions = vehicles.flatMap(vehicle => normalizeDepositVin(vehicle.vin) || []);
  const holds = vinOptions.length ? await prisma.customerSalesDeposit.findMany({ where: {
    organizationId: scope.organizationId, kind: "RESERVATION", refundedAt: null, vin: { in: vinOptions, mode: "insensitive" }
  }, select: { vin: true } }) : [];
  const heldVins = new Set(holds.map(hold => normalizeDepositVin(hold.vin)));
  return vehicles.filter(vehicle => !heldVins.has(normalizeDepositVin(vehicle.vin)))
    .map(vehicle => ({ id: vehicle.id, label: label(vehicle), vin: vehicle.vin, color: vehicle.color }));
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
async function lockVin(tx: Prisma.TransactionClient, organizationId: string, vin: string) {
  await tx.$executeRaw`SELECT lock_customer_deposit_vin(${organizationId}, ${vin})`;
}
async function requireUncommittedVehicle(tx: Prisma.TransactionClient, organizationId: string, vehicleId: string, showroom = false) {
  await lockVehicle(tx, organizationId, vehicleId);
  const vehicle = await tx.vehicle.findFirst({ where: showroom
    ? { organizationId, id: vehicleId, status: "ACTIVE", mergedIntoVehicleId: null, inventoryUnits: { none: {} } }
    : { ...vehicleWhere(organizationId), id: vehicleId }, select: vehicleSelect });
  if (!vehicle) throw new DepositError(showroom
    ? "That VIN already has an inventory or inactive record. Find it in ready inventory or ask inventory staff to review it. No deposit was saved."
    : "Choose an active, frontline-ready inventory vehicle. No deposit was saved.", 409);
  const vin = normalizeDepositVin(vehicle.vin);
  if (vin) await lockVin(tx, organizationId, vin);
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
  const active = await tx.customerSalesDeposit.findFirst({ where: { organizationId, refundedAt: null, OR: [
    { vehicleId }, ...(vin ? [{ kind: "RESERVATION", vin: { equals: vin, mode: "insensitive" as const } }] : [])
  ] }, select: { id: true } });
  if (active) throw new DepositError("This vehicle already has an active deposit hold. No deposit was saved.", 409);
  return vehicle;
}

async function verifyShowroomVin(tx: Prisma.TransactionClient, organizationId: string, vin: string) {
  const canonical = () => tx.vehicle.findMany({ where: { organizationId, vin: { equals: vin, mode: "insensitive" } }, select: { id: true }, take: 2 });
  const known = await canonical();
  if (known.length > 1) throw new DepositError("Inventory staff must reconcile duplicate vehicle records for that VIN.", 409);
  if (known.length) return requireUncommittedVehicle(tx, organizationId, known[0].id, true);
  await lockVin(tx, organizationId, vin);
  if ((await canonical()).length) throw new DepositError("A vehicle record was just added. Retry to verify the new record.", 409);
  const [result] = await tx.$queryRaw<{ blocked: boolean }[]>`
    SELECT EXISTS (SELECT 1 FROM "CustomerSalesDeposit" d WHERE d."organizationId" = ${organizationId}
      AND d."kind" = 'RESERVATION' AND upper(btrim(d."vin")) = ${vin} AND d."refundedAt" IS NULL)
      OR EXISTS (SELECT 1 FROM "DealDeskDraft" d WHERE deal_document_organization_matches(d."organizationId", ${organizationId})
        AND vehicle_commercial_pathway(d."pathway") AND (d."status" = 'SOLD' OR (d."status" = 'PENDING' AND d."snapshot" ? 'desk:soldVehicleId'))
        AND ${vin} IN (upper(btrim(d."vehicleReference")), upper(btrim(d."snapshot" -> (d."pathway" || ':vehicleFacts') ->> 'vin'))))
      OR EXISTS (SELECT 1 FROM "SalesDocumentJacket" j WHERE deal_document_organization_matches(j."organizationId", ${organizationId})
        AND vehicle_commercial_pathway(j."pathway") AND j."state" IN ('CLOSED','DELIVERED_FUNDING_PENDING','UNWIND_PENDING')
        AND ${vin} IN (upper(btrim(j."vin")), upper(btrim(j."vehicleReference")))) AS blocked`;
  if (result.blocked) throw new DepositError("That VIN already has a hold or sales commitment. No deposit was saved.", 409);
  return null;
}

export async function changeCustomerDeposit(scope: Scope, body: Record<string, unknown>) {
  if (!scope.manage) throw new DepositError("A manager must record received deposits and refunds.", 403);
  const id = typeof body.id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.id) ? body.id.toLowerCase() : "";
  if (!id || !["receive", "refund"].includes(String(body.action))) throw new DepositError("Choose a valid deposit action.");
  const { actor, organizationId, customerId } = scope;
  const reference = safeDepositReference(body.reference);
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${organizationId + ":customer-deposit:" + id}, 0))`;
    const customer = await tx.customer.findFirst({
      where: scope.customerWhere,
      select: {
        displayName: true, customerNumber: true, phoneNumber: true, email: true, address: true,
        organization: { select: { name: true } },
        contactPoints: {
          where: { type: { in: ["PHONE", "EMAIL"] } }, select: { type: true, value: true },
          orderBy: [{ isPrimary: "desc" }, { updatedAt: "desc" }, { id: "asc" }]
        }
      }
    });
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
      if (existing.kind === "RESERVATION" && existing.vin) await lockVin(tx, organizationId, existing.vin);
      await tx.customerSalesDeposit.update({ where: { id }, data: { refundedAt: new Date(), refundedById: actor.id, refundReference: reference, refundReason: reason } });
      if (existing.kind !== "GENERAL") {
        await tx.task.updateMany({ where: { id: `deposit-follow-up-${id}`, status: { not: "COMPLETED" } }, data: {
          status: "COMPLETED", completedAt: new Date(), completionOverrideAt: new Date(), completionOverrideByUserId: actor.id,
          completionOverrideReason: "Follow-up closed because the deposit was fully refunded."
        } });
      }
      await audit("CUSTOMER_DEPOSIT_REFUNDED");
      return { id, duplicate: false };
    }

    const amountCents = depositAmount(body.amount);
    const method = typeof body.method === "string" && Object.hasOwn(depositMethods, body.method) ? body.method as DepositMethod : null;
    const nonRefundable = body.nonRefundable === true;
    const vehicleId = typeof body.vehicleId === "string" && body.vehicleId.trim() ? body.vehicleId.trim() : null;
    const kind = body.kind === undefined ? "GENERAL" : typeof body.kind === "string" && Object.hasOwn(depositKinds, body.kind) ? body.kind as DepositKind : null;
    const agreement = readDepositAgreement(body);
    const enteredVin = normalizeDepositVin(body.agreementVin);
    if (!kind || (kind !== "RESERVATION" && vehicleId)) throw new DepositError("Choose Reserve a vehicle to place a vehicle hold.");
    if (!amountCents) throw new DepositError("Enter a positive dollar amount for the deposit.");
    if (!method) throw new DepositError("Choose a payment method.");
    if (body.termsPresented !== true) throw new DepositError(kind === "GENERAL" ? "Confirm that the customer agreed to the deposit terms." : "Confirm that the customer signed the agreement.");
    if (body.confirmed !== true) throw new DepositError("Confirm that the payment was received.");
    if (kind !== "GENERAL") {
      const issue = depositAgreementIssue(kind, agreement, amountCents);
      if (issue) throw new DepositError(issue.message);
      if ((kind === "ORDER" || !vehicleId) && (!agreement.year || !agreement.make || !agreement.model)) {
        throw new DepositError("Enter the vehicle year, make and model.");
      }
      if ((body.agreementVin || (kind === "RESERVATION" && !vehicleId)) && (!enteredVin || !isValidVin(enteredVin))) {
        throw new DepositError("Enter the exact 17-character VIN shown on the vehicle or paperwork. Check the VIN for typos.");
      }
      if ((body.agreementCriteria && !agreement.criteria) || (vehicleId && body.agreementVin)) throw new DepositError("Check the entered agreement details.");
    }
    const agreementLabel = [agreement.year, agreement.make, agreement.model].join(" ");
    const terms = kind === "GENERAL" ? depositTerms(Boolean(vehicleId), nonRefundable) : vehicleDepositTerms(kind, agreement, nonRefundable);
    if (vehicleId && vehicleId.length > 150) throw new DepositError("Choose an inventory vehicle from the list.");
    if ((method !== "CASH" || body.reference) && !reference) throw new DepositError("Enter a valid transaction reference, not a card number.");
    if (existing) {
      if (existing.amountCents === amountCents && existing.method === method && existing.paymentReference === (reference || null)
        && existing.nonRefundable === nonRefundable && existing.kind === kind && existing.terms === terms
        && (vehicleId ? existing.vehicleId === vehicleId : kind === "GENERAL" ? !existing.vehicleId
          : existing.vin === (enteredVin || null) && existing.vehicleLabel === agreementLabel)) return { id, duplicate: true };
      throw new DepositError("This receipt was already issued with different details. Review the saved deposit before starting another.", 409);
    }
    const vehicle = vehicleId ? await requireUncommittedVehicle(tx, organizationId, vehicleId)
      : kind === "RESERVATION" ? await verifyShowroomVin(tx, organizationId, enteredVin) : null;
    const vin = vehicleId ? (kind === "RESERVATION" ? normalizeDepositVin(vehicle?.vin) : vehicle?.vin) : enteredVin;
    if (kind === "RESERVATION" && !vin) throw new DepositError("This inventory vehicle needs a valid VIN before it can be reserved.", 409);
    await tx.customerSalesDeposit.create({ data: {
      id, organizationId, customerId, kind, vehicleId: vehicle?.id ?? null, amountCents, method, paymentReference: reference || null, nonRefundable,
      terms, companyName: customer.organization.name, customerName: customer.displayName,
      customerNumber: customer.customerNumber,
      customerPhone: customer.contactPoints.find(point => point.type === "PHONE" && point.value.trim())?.value.trim() || customer.phoneNumber?.trim() || null,
      customerEmail: customer.contactPoints.find(point => point.type === "EMAIL" && point.value.trim())?.value.trim() || customer.email?.trim() || null,
      customerAddress: customer.address?.trim() || null,
      vehicleLabel: vehicleId && vehicle ? label(vehicle) : kind !== "GENERAL" ? agreementLabel : null,
      vin: vin || null, receivedById: actor.id, receivedByName: actor.name
    } });
    if (kind === "ORDER" || (kind === "RESERVATION" && !vehicleId)) {
      const area = kind === "ORDER" ? "SALES" : "INVENTORY";
      // The receiving manager owns follow-through and can route it using the normal task workflow.
      const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z");
      const board = await tx.boardDay.upsert({ where: { date: today }, update: {}, create: { date: today } });
      await tx.task.create({ data: {
        id: `deposit-follow-up-${id}`, boardDayId: board.id, workflowArea: area, sourceType: "MANAGER",
        title: kind === "ORDER" ? "Source ordered vehicle" : "Complete inventory intake for reserved showroom vehicle",
        description: kind === "ORDER" ? "Open the customer's Deals & deposits and review the signed vehicle order before sourcing."
          : "Open the customer's Deals & deposits to verify the reserved VIN and complete the normal inventory intake. The VIN hold is already active.",
        customerReference: customerId, customerId, createdByUserId: actor.id, assignedUserId: actor.id, ownerUserId: actor.id,
        status: "NOT_STARTED", priority: "HIGH", dueAt: kind === "ORDER" ? new Date(agreement.deadline + "T23:59:59Z") : new Date(),
        requiresManagerApproval: true, templateSnapshot: { depositId: id, organizationId }
      } });
    }
    await audit("CUSTOMER_DEPOSIT_RECEIVED");
    return { id, duplicate: false };
  }).catch((error: unknown) => {
    const blocker = vehicleCustodyBlocker(error);
    if (blocker) throw new DepositError(blocker, 409);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new DepositError("This payment reference or vehicle hold is already recorded. Review the saved deposit before retrying.", 409);
    throw error;
  });
}
