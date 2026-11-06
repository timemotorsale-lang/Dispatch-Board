import { Prisma } from "@prisma/client";
import { customerContactValue } from "@/lib/customer-contact-prefill";
import { prisma } from "@/server/db/client";
import type { AuthenticatedUser } from "@/server/auth/store";

import { SalesDocumentsError } from "@/server/sales-documents/domain";
import { requireUnifiedCrmCustomerReadPolicy } from "@/server/policies/unified-crm-customer-read";
import { getPermittedWorkspaces } from "@/server/auth/navigation";
import { createUnifiedCrmCustomerReadRepository } from "@/server/repositories/unified-crm-customer-read-repository";
import { normalizeUnifiedCrmCustomerListQuery, decodeUnifiedCrmCustomerCursor, encodeUnifiedCrmCustomerCursor } from "@/server/validation/unified-crm-customer-read";
import { getUnifiedCrmCustomerList, resolveUnifiedCrmCustomerReadMode } from "@/server/services/unified-crm-customer-read-service";
import { createServiceIntakeCustomer } from "@/server/service-intake/customer-service";
import { createRegistryVehicle } from "@/server/vehicle-registry/service";
import { createVehicleRegistryRepository } from "@/server/vehicle-registry/repository";
import { resolveDocumentStorageRuntimeFromEnv } from "@/server/document-library/storage-config";
import type { DealCustomerChoice, DealVehicleChoice } from "@/lib/deal-continuity";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { createEnterpriseCommandRepository } from "@/server/enterprise-command/repository";
import { evaluateVehicleCapability } from "@/server/enterprise-command/vehicle-capabilities";
import { DealCustomerMatchError } from "./customer-match-error";
import { resolveCrmNextAccess } from "@/server/crm-next/access";

function requireDealIdentityUser(actor: AuthenticatedUser | null) {
  if (!actor?.isActive) throw new SalesDocumentsError("Sign in to access shared customer and vehicle records.", 401);
  requireUnifiedCrmCustomerReadPolicy(actor);
  return actor;
}

export const dealDocumentOrganization = () => resolveDocumentStorageRuntimeFromEnv().organizationId;
export function dealOrganization() {
  const configured = dealDocumentOrganization();
  return configured === "default-org" && !process.env.DOCUMENT_LIBRARY_ORGANIZATION_ID?.trim() ? INITIAL_ORGANIZATION.id : configured;
}
export async function dealIdentityOptions(actor: AuthenticatedUser | null, recordType: "customer" | "vehicle" = "customer") {
  const user = requireDealIdentityUser(actor); requireUnifiedCrmCustomerReadPolicy(actor);
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
// Shared intake identities are distinct from permission to edit another owner's CRM record.
async function dealCustomerReadScope(actor: AuthenticatedUser | null, database: Prisma.TransactionClient = prisma) {
  const user = requireDealIdentityUser(actor);
  const scope = requireUnifiedCrmCustomerReadPolicy(user);
  if (scope.kind === "ORGANIZATION" || !getPermittedWorkspaces(user).some(workspace => workspace.key === "OPERATIONS_COORDINATOR")) return scope;
  const organizationId = dealOrganization(), now = new Date();
  const locations = await database.userLocationAccess.findMany({ where: {
    userId: user.id, validFrom: { lte: now }, OR: [{ validTo: null }, { validTo: { gte: now } }], location: { organizationId }
  }, select: { locationId: true } });
  const grants = await createEnterpriseCommandRepository().listCapabilityGrants(user.id, organizationId);
  if (!locations.some(location => evaluateVehicleCapability({ actor: user, capability: "CUSTOMER_LIFECYCLE_VIEW", grants, locationId: location.locationId, now }).allowed)) {
    throw new SalesDocumentsError("Customer selection is unavailable for your company access. Ask a manager to review location permissions.", 403);
  }
  return { kind: "ORGANIZATION" } as const;
}

export async function dealCustomer(actor: AuthenticatedUser | null, id: string, database: Prisma.TransactionClient = prisma): Promise<DealCustomerChoice> {
  requireDealIdentityUser(actor);
  const scope = await dealCustomerReadScope(actor, database);
const customer = await database.customer.findFirst({ where: { id, organizationId: dealOrganization(), status: "ACTIVE", mergedIntoCustomerId: null, ...(scope.kind === "OWNER" ? { ownerUserId: scope.ownerUserId } : {}) }, select: { id: true, displayName: true, customerNumber: true, phoneNumber: true, email: true, address: true, dateOfBirth: true, idLast4: true, idState: true, idType: true, contactPoints: { where: { type: { in: ["PHONE", "EMAIL"] } }, select: { type: true, value: true }, orderBy: [{ isPrimary: "desc" }, { updatedAt: "desc" }, { id: "asc" }] } } });
  if (!customer) throw new SalesDocumentsError("Customer is unavailable or outside your authorized scope. Choose an accessible CRM customer.", 403);
  return { id: customer.id, name: customer.displayName, customerNumber: customer.customerNumber, phone: customerContactValue({ contacts: customer.contactPoints, customer: { phone: customer.phoneNumber ?? "" } }, "PHONE"), email: customerContactValue({ contacts: customer.contactPoints, customer: { email: customer.email ?? "" } }, "EMAIL"), dealPrefill: { address: customer.address ?? "", dateOfBirth: customer.dateOfBirth?.toISOString().slice(0, 10) ?? "", idLast4: customer.idLast4 ?? "", idState: customer.idState ?? "", idType: customer.idType ?? "" } };
}
export async function authorizeDealOpportunityCustomer(actor: AuthenticatedUser | null, customerId: string, organizationId: string, database: Prisma.TransactionClient) {
  if (organizationId !== dealOrganization()) throw new Error("Customer not available.");
  try {
    await dealCustomer(actor, customerId, database);
  } catch (error) {
    if (error instanceof SalesDocumentsError && [401, 403, 404].includes(error.status)) throw new Error("Customer not available.");
    throw error;
  }
}

export async function searchDealCustomers(actor: AuthenticatedUser | null, params: URLSearchParams) {
  requireDealIdentityUser(actor);
  const scope = await dealCustomerReadScope(actor);
  const query = normalizeUnifiedCrmCustomerListQuery({ q: params.get("q") ?? "", cursor: params.get("cursor"), limit: "25", status: "active" });
  const workspaces = getPermittedWorkspaces(actor!);
  const coordinator = !workspaces.some(workspace => workspace.key === "MANAGEMENT") && workspaces.some(workspace => workspace.key === "OPERATIONS_COORDINATOR");
  const readOptions = resolveCrmNextAccess(actor).allowed ? { readMode: "REVIEW" as const } : {};
  if (!coordinator) {
    const result = await getUnifiedCrmCustomerList(actor, query, readOptions);
    return { items: result.items.map(item => ({ id: item.id, name: item.displayName, customerNumber: item.customerNumber, phone: item.maskedPhone, email: item.maskedEmail })), nextCursor: result.page.nextCursor };
  }
  if (resolveUnifiedCrmCustomerReadMode(readOptions) !== "REVIEW") throw new SalesDocumentsError("Customer records are temporarily unavailable.", 403);
  const records = await createUnifiedCrmCustomerReadRepository().listCustomers({
    ...query, cursor: query.cursor ? decodeUnifiedCrmCustomerCursor(query.cursor) : null,
    organizationId: dealOrganization(), recordScope: scope, viewerUserId: actor!.id
  });
  const visible = records.slice(0, query.limit), last = visible.at(-1);
  return {
    items: visible.map(item => ({ id: item.id, name: item.displayName, customerNumber: item.customerNumber,
      phone: item.phoneNumber ? `••••${item.phoneNumber.replace(/\D/g, "").slice(-4)}` : "",
      email: item.email ? `${item.email.slice(0, 1)}•••@•••` : "" })),
    nextCursor: records.length > query.limit && last ? encodeUnifiedCrmCustomerCursor(last) : null
  };
}
export async function dealVehicle(actor: AuthenticatedUser | null, id: string, database: Prisma.TransactionClient = prisma): Promise<DealVehicleChoice> {
  requireDealIdentityUser(actor);
  requireUnifiedCrmCustomerReadPolicy(actor);
  const vehicle = await database.vehicle.findFirst({ where: { id, organizationId: dealOrganization(), mergedIntoVehicleId: null, status: "ACTIVE" }, include: { inventoryUnits: { where: { organizationId: dealOrganization(), closedAt: null }, orderBy: { createdAt: "desc" }, take: 1 }, odometerObservations: { where: { organizationId: dealOrganization(), status: "ACCEPTED", unit: "MILES" }, orderBy: { observedAt: "desc" }, take: 1 } } });
  if (!vehicle) throw new SalesDocumentsError("Choose an active canonical vehicle.", 404);
  const unit = vehicle.inventoryUnits[0];
  const snapshot = vehicle.specificationSnapshot as { specifications?: { trim?: unknown } } | null;
  const recorded = vehicle.odometerObservations?.[0];
  const supplemental = { trim: typeof snapshot?.specifications?.trim === "string" ? snapshot.specifications.trim : "", recordedMileage: recorded ? String(recorded.reading) : "", mileageRecordedAt: recorded?.observedAt.toISOString() ?? "" };
  const active = await database.vehicleUseBooking.findFirst({ where: { organizationId: dealOrganization(), vehicleId: id, status: { in: ["RESERVED", "CHECKED_OUT", "RETURNED_REVIEW"] } }, orderBy: { startsAt: "asc" }, select: { status: true, expectedReturnAt: true, context: { select: { draft: { select: { pathway: true } } } } } });
  const eligible = Boolean(vehicle.vin && unit?.lifecycleStage === "FRONTLINE_READY" && unit.operatingState === "ACTIVE" && active?.status !== "RETURNED_REVIEW");
  return { ...supplemental, id, label: [vehicle.year, vehicle.make, vehicle.model, unit?.inventoryNumber ?? vehicle.stockNumber ?? vehicle.vehicleNumber].filter(Boolean).join(" · "), vin: vehicle.vin ?? "", stockNumber: unit?.inventoryNumber ?? vehicle.stockNumber ?? "", inventoryUnitId: unit?.id ?? null, year: vehicle.year ? String(vehicle.year) : "", make: vehicle.make ?? "", model: vehicle.model ?? "", color: vehicle.color ?? "", licensePlate: vehicle.licensePlate ?? "", locationId: unit?.locationId ?? null, availability: active?.status === "RETURNED_REVIEW" ? "Returned — unavailable pending exception review" : active ? `${active.status === "CHECKED_OUT" ? active.context.draft.pathway === "daily-rental" ? "Out on Rental — actual return required" : "Out — actual return required" : "Reserved"} · expected ${active.expectedReturnAt.toISOString()}` : eligible ? "Ready for allocation; availability rechecked on reserve" : "Not frontline-ready for temporary use", eligibleForUse: eligible };
}
export async function searchDealVehicles(actor: AuthenticatedUser | null, params: URLSearchParams) {
  requireDealIdentityUser(actor); requireUnifiedCrmCustomerReadPolicy(actor);
  const pageNumber = Number(params.get("page") || "1");
  if (!Number.isSafeInteger(pageNumber) || pageNumber < 1 || pageNumber > 100000) throw new SalesDocumentsError("Choose a valid vehicle-search page.");
  const page = await createVehicleRegistryRepository().search(dealOrganization(), { query: (params.get("q") ?? "").slice(0, 100), page: pageNumber, pageSize: 15 });
  return { ...page, items: await Promise.all(page.items.filter(vehicle => vehicle.status === "ACTIVE").map(vehicle => dealVehicle(actor, vehicle.id))) };
}
export async function createDealCustomer(actor: AuthenticatedUser | null, raw: Record<string, unknown>) {
  requireDealIdentityUser(actor); requireUnifiedCrmCustomerReadPolicy(actor);
  await dealCustomerReadScope(actor);
  const result = await createServiceIntakeCustomer(actor, raw, { organizationId: dealOrganization(), source: "DEAL_SHARED_CUSTOMER" });
  if (result.duplicate) {
    let match: DealCustomerChoice;
    try { match = await dealCustomer(actor, result.customer.id); }
    catch (error) {
      if (error instanceof SalesDocumentsError && [403, 404].includes(error.status)) throw new SalesDocumentsError("An existing customer needs an access review before selection. Ask a manager to review the existing record and your access. Your entries are retained; no duplicate was created.", 409);
      throw error;
    }
    throw new DealCustomerMatchError([{ id: match.id, name: match.name, customerNumber: match.customerNumber, phone: match.phone ? `••••${match.phone.replace(/\D/g, "").slice(-4)}` : "", email: match.email ? `${match.email[0]}•••@•••` : "" }]);
  }
  return dealCustomer(actor, result.customer.id);
}
export async function createDealVehicle(actor: AuthenticatedUser | null, raw: Record<string, unknown>) {
  requireDealIdentityUser(actor);
  const vin = String(raw.vin ?? "").trim().toUpperCase();
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) throw new SalesDocumentsError("Enter the complete 17-character VIN before creating a vehicle.");
  const existing = await prisma.vehicle.findFirst({ where: { organizationId: dealOrganization(), vin }, select: { id: true } });
  if (existing) return { duplicate: true, vehicle: await dealVehicle(actor, existing.id) };
  const result = await createRegistryVehicle(actor, { ...raw, vin, vinState: "VERIFIED", reason: "Create one canonical vehicle from a shared deal selector." }, { organizationId: dealOrganization() }, { rejectDuplicateIdentity: true });
  const record = result.result as { id: string };
  return { duplicate: result.duplicate, vehicle: await dealVehicle(actor, record.id) };
}
