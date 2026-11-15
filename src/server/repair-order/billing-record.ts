import { assertRepairReadCandidate } from "./read-access";
import type { AuthenticatedUser } from "@/server/auth/store";
import { assertAuthenticatedUser } from "@/server/policies/access";
import { prisma } from "@/server/db/client";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { createEnterpriseCommandRepository } from "@/server/enterprise-command/repository";
import { assertVehicleCapability } from "@/server/enterprise-command/vehicle-capabilities";
import { billingAccess } from "@/server/service-billing/service";

export class BillingRecordNotFoundError extends Error {
  constructor() { super("Billing record was not found."); }
}
export type BillingRecordParams = Record<string, string | string[] | undefined>;
export function parseBillingRecordSelection(params: BillingRecordParams) {
  const keys = ["packageId", "invoiceId", "entryId"] as const;
  const selected = keys.filter(key => params[key] !== undefined);
  const valid = (value: unknown): value is string => typeof value === "string" && value.length > 0 && value.length <= 200 && value.trim() === value;
  if (!valid(params.repairOrderId) || selected.length !== 1 || !valid(params[selected[0]])) throw new BillingRecordNotFoundError();
  return { repairOrderId: params.repairOrderId, key: selected[0], id: params[selected[0]] as string };
}
export async function getRepairBillingRecord(actor: AuthenticatedUser | null, params: BillingRecordParams) {
  const user = assertAuthenticatedUser(actor);
  const { repairOrderId, key, id } = parseBillingRecordSelection(params);
  const organizationId = INITIAL_ORGANIZATION.id;
  const grants = await createEnterpriseCommandRepository().listCapabilityGrants(user.id, organizationId);
  assertRepairReadCandidate(user, grants);
  const order = await prisma.repairOrder.findFirst({ where: { id: repairOrderId, organizationId }, select: { id: true, locationId: true, repairOrderNumber: true } });
  if (!order) throw new BillingRecordNotFoundError();
  assertVehicleCapability({ actor: user, grants, locationId: order.locationId, capability: "REPAIR_ORDER_VIEW" });
  await billingAccess(user, order.locationId, false, organizationId);
  if (key === "packageId") {
    const record = await prisma.serviceInvoicePackage.findFirst({ where: { id, organizationId, repairOrderId } });
    if (!record) throw new BillingRecordNotFoundError();
    const reconciliations = await prisma.serviceInvoiceReconciliation.findMany({ where: { organizationId, invoicePackageId: record.id }, orderBy: [{ reconciledAt: "asc" }, { id: "asc" }] });
    return { kind: "package" as const, order, record, reconciliations };
  }
  // Entries have no ORM relation to an RO: verify their invoice before returning any data.
  if (key === "entryId") {
    const record = await prisma.serviceInvoiceEntry.findFirst({ where: { id, organizationId } });
    if (!record) throw new BillingRecordNotFoundError();
    const invoice = await prisma.serviceInvoice.findFirst({ where: { id: record.invoiceId, organizationId, repairOrderId } });
    if (!invoice) throw new BillingRecordNotFoundError();
    return { kind: "entry" as const, order, record, invoice };
  }
  const record = await prisma.serviceInvoice.findFirst({ where: { id, organizationId, repairOrderId } });
  if (!record) throw new BillingRecordNotFoundError();
  const entries = await prisma.serviceInvoiceEntry.findMany({ where: { organizationId, invoiceId: record.id }, orderBy: [{ occurredAt: "asc" }, { id: "asc" }] });
  return { kind: "invoice" as const, order, record, entries };
}
