import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/client";
import type { AuthenticatedUser } from "@/server/auth/store";
import { requireSalesDocumentsUser } from "@/server/sales-documents/service";
import { SalesDocumentsError } from "@/server/sales-documents/domain";
import { requireUnifiedCrmCustomerReadPolicy } from "@/server/policies/unified-crm-customer-read";
import { getUnifiedCrmCustomerList } from "@/server/services/unified-crm-customer-read-service";
import { createServiceIntakeCustomer } from "@/server/service-intake/customer-service";
import { createRegistryVehicle } from "@/server/vehicle-registry/service";
import { createVehicleRegistryRepository } from "@/server/vehicle-registry/repository";
import { resolveDocumentStorageRuntimeFromEnv } from "@/server/document-library/storage-config";
import type { DealCustomerChoice, DealVehicleChoice } from "@/lib/deal-continuity";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { createEnterpriseCommandRepository } from "@/server/enterprise-command/repository";
import { evaluateVehicleCapability } from "@/server/enterprise-command/vehicle-capabilities";

export const dealDocumentOrganization = () => resolveDocumentStorageRuntimeFromEnv().organizationId;
export function dealOrganization() {
  const configured = dealDocumentOrganization();
  return configured === "default-org" && !process.env.DOCUMENT_LIBRARY_ORGANIZATION_ID?.trim() ? INITIAL_ORGANIZATION.id : configured;
}
export async function dealIdentityOptions(actor: AuthenticatedUser | null, recordType: "customer" | "vehicle" = "customer") {
  const user = requireSalesDocumentsUser(actor); requireUnifiedCrmCustomerReadPolicy(actor);
  const organizationId = dealOrganization();
  const [locations, grants] = await Promise.all([
    prisma.location.findMany({ where: { organizationId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    createEnterpriseCommandRepository().listCapabilityGrants(user.id, organizationId)
  ]);
  const now = new Date();
  const allowed = locations.filter(location => evaluateVehicleCapability({ actor: user, capability: recordType === "vehicle" ? "VEHICLE_IDENTITY_CREATE" : "CUSTOMER_INTAKE_CREATE", grants, locationId: location.id, now }).allowed);
  if (!allowed.length) throw new SalesDocumentsError(locations.length ? "No locations are available for this action under your permissions. Ask a manager to review your location access; your entries have been retained." : "No company locations are configured for this workflow. Ask a manager to check company settings; your entries have been retained.", locations.length ? 403 : 409);
  return { locations: allowed };
}
export async function dealCustomer(actor: AuthenticatedUser | null, id: string, database: Prisma.TransactionClient = prisma): Promise<DealCustomerChoice> {
  requireSalesDocumentsUser(actor);
  const scope = requireUnifiedCrmCustomerReadPolicy(actor);
  const customer = await database.customer.findFirst({ where: { id, organizationId: dealOrganization(), status: "ACTIVE", mergedIntoCustomerId: null, ...(scope.kind === "OWNER" ? { ownerUserId: scope.ownerUserId } : {}) }, select: { id: true, displayName: true, customerNumber: true, phoneNumber: true, email: true, address: true, dateOfBirth: true, idLast4: true, idState: true, idType: true } });
  if (!customer) throw new SalesDocumentsError("Customer is unavailable or outside your authorized scope. Choose an accessible CRM customer.", 403);
  return { id: customer.id, name: customer.displayName, customerNumber: customer.customerNumber, phone: customer.phoneNumber ?? "", email: customer.email ?? "", dealPrefill: { address: customer.address ?? "", dateOfBirth: customer.dateOfBirth?.toISOString().slice(0, 10) ?? "", idLast4: customer.idLast4 ?? "", idState: customer.idState ?? "", idType: customer.idType ?? "" } };
}
export async function searchDealCustomers(actor: AuthenticatedUser | null, params: URLSearchParams) {
  requireSalesDocumentsUser(actor);
  const result = await getUnifiedCrmCustomerList(actor, { q: params.get("q") ?? "", cursor: params.get("cursor"), limit: "25", status: "active" });
  return { items: result.items.map(item => ({ id: item.id, name: item.displayName, customerNumber: item.customerNumber, phone: item.maskedPhone, email: item.maskedEmail })), nextCursor: result.page.nextCursor };
}
export async function dealVehicle(actor: AuthenticatedUser | null, id: string, database: Prisma.TransactionClient = prisma): Promise<DealVehicleChoice> {
  requireSalesDocumentsUser(actor);
  requireUnifiedCrmCustomerReadPolicy(actor);
  const vehicle = await database.vehicle.findFirst({ where: { id, organizationId: dealOrganization(), mergedIntoVehicleId: null, status: "ACTIVE" }, include: { inventoryUnits: { where: { organizationId: dealOrganization(), closedAt: null }, orderBy: { createdAt: "desc" }, take: 1 } } });
  if (!vehicle) throw new SalesDocumentsError("Choose an active canonical vehicle.", 404);
  const unit = vehicle.inventoryUnits[0];
  const active = await database.vehicleUseBooking.findFirst({ where: { organizationId: dealOrganization(), vehicleId: id, status: { in: ["RESERVED", "CHECKED_OUT"] } }, orderBy: { startsAt: "asc" }, select: { status: true, expectedReturnAt: true } });
  const eligible = Boolean(vehicle.vin && unit?.lifecycleStage === "FRONTLINE_READY" && unit.operatingState === "ACTIVE");
  return { id, label: [vehicle.year, vehicle.make, vehicle.model, unit?.inventoryNumber ?? vehicle.stockNumber ?? vehicle.vehicleNumber].filter(Boolean).join(" · "), vin: vehicle.vin ?? "", stockNumber: unit?.inventoryNumber ?? vehicle.stockNumber ?? "", inventoryUnitId: unit?.id ?? null, year: vehicle.year ? String(vehicle.year) : "", make: vehicle.make ?? "", model: vehicle.model ?? "", color: vehicle.color ?? "", licensePlate: vehicle.licensePlate ?? "", locationId: unit?.locationId ?? null, availability: active ? `${active.status === "CHECKED_OUT" ? "Out — actual return required" : "Reserved"} · expected ${active.expectedReturnAt.toISOString()}` : eligible ? "Ready for allocation; availability rechecked on reserve" : "Not frontline-ready for temporary use", eligibleForUse: eligible };
}
export async function searchDealVehicles(actor: AuthenticatedUser | null, params: URLSearchParams) {
  requireSalesDocumentsUser(actor); requireUnifiedCrmCustomerReadPolicy(actor);
  const pageNumber = Number(params.get("page") || "1");
  if (!Number.isSafeInteger(pageNumber) || pageNumber < 1 || pageNumber > 100000) throw new SalesDocumentsError("Choose a valid vehicle-search page.");
  const page = await createVehicleRegistryRepository().search(dealOrganization(), { query: (params.get("q") ?? "").slice(0, 100), page: pageNumber, pageSize: 15 });
  return { ...page, items: await Promise.all(page.items.filter(vehicle => vehicle.status === "ACTIVE").map(vehicle => dealVehicle(actor, vehicle.id))) };
}
export async function createDealCustomer(actor: AuthenticatedUser | null, raw: Record<string, unknown>) {
  requireSalesDocumentsUser(actor); requireUnifiedCrmCustomerReadPolicy(actor);
  const result = await createServiceIntakeCustomer(actor, raw, { organizationId: dealOrganization(), source: "DEAL_SHARED_CUSTOMER" });
  if (result.duplicate) throw new SalesDocumentsError("A possible customer match already exists. Search and select the existing customer; do not create a second record.", 409);
  return dealCustomer(actor, result.customer.id);
}
export async function createDealVehicle(actor: AuthenticatedUser | null, raw: Record<string, unknown>) {
  requireSalesDocumentsUser(actor);
  const vin = String(raw.vin ?? "").trim().toUpperCase();
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) throw new SalesDocumentsError("Enter the complete 17-character VIN before creating a vehicle.");
  const existing = await prisma.vehicle.findFirst({ where: { organizationId: dealOrganization(), vin }, select: { id: true } });
  if (existing) return { duplicate: true, vehicle: await dealVehicle(actor, existing.id) };
  const result = await createRegistryVehicle(actor, { ...raw, vin, vinState: "VERIFIED", reason: "Create one canonical vehicle from a shared deal selector." }, { organizationId: dealOrganization() }, { rejectDuplicateIdentity: true });
  const record = result.result as { id: string };
  return { duplicate: result.duplicate, vehicle: await dealVehicle(actor, record.id) };
}
