import type { AuthenticatedUser } from "@/server/auth/store";
import {
  createUnifiedCrmCustomer360Repository,
  type UnifiedCrmCustomer360Record,
  type UnifiedCrmCustomer360Repository
} from "@/server/repositories/unified-crm-customer-360-repository";
import {
  createUnifiedCrmCustomerReadRepository,
  type UnifiedCrmCustomerReadRepository
} from "@/server/repositories/unified-crm-customer-read-repository";
import {
  requireUnifiedCrmCustomer360Access,
  type UnifiedCrmCustomer360AccessOptions
} from "@/server/unified-crm/customer-360-access";
import {
  UNIFIED_CRM_CUSTOMER_360_CONTRACT_VERSION,
  UnifiedCrmCustomer360Error,
  type UnifiedCrmCustomer360Appointment,
  type UnifiedCrmCustomer360Contact,
  type UnifiedCrmCustomer360ReadModel
} from "@/server/unified-crm/customer-360-contract";

type UnifiedCrmCustomer360Dependencies = UnifiedCrmCustomer360AccessOptions & {
  now?: () => Date;
  repository?: UnifiedCrmCustomer360Repository;
  scopeRepository?: Pick<UnifiedCrmCustomerReadRepository, "listActiveOrganizationIds">;
};

function normalizeCustomerId(value: unknown) {
  if (typeof value !== "string") {
    throw new UnifiedCrmCustomer360Error("INVALID_CUSTOMER_ID", "Customer identifier is invalid.");
  }
  const id = value.trim();
  if (!id || id.length > 200) {
    throw new UnifiedCrmCustomer360Error("INVALID_CUSTOMER_ID", "Customer identifier is invalid.");
  }
  return id;
}

function maskPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits ? `••••${digits.slice(-4)}` : "••••";
}

function maskEmail(value: string) {
  const [local = "", domain = ""] = value.trim().split("@", 2);
  if (!domain) return "••••";
  const parts = domain.split(".");
  const domainName = parts.shift() ?? "";
  const suffix = parts.length ? `.${parts.at(-1)}` : "";
  return `${local.slice(0, 1) || "•"}•••@${domainName.slice(0, 1) || "•"}•••${suffix}`;
}

function contacts(record: UnifiedCrmCustomer360Record): UnifiedCrmCustomer360Contact[] {
  const result: UnifiedCrmCustomer360Contact[] = [];
  for (const point of record.contactPoints) {
    const type = point.type.trim().toUpperCase();
    if (type !== "PHONE" && type !== "EMAIL") continue;
    result.push({
      type,
      maskedValue: type === "PHONE" ? maskPhone(point.value) : maskEmail(point.value),
      isPrimary: point.isPrimary,
      source: "CONTACT_POINT"
    });
  }
  const types = new Set(result.map((point) => point.type));
  if (!types.has("PHONE") && record.phoneNumber) {
    result.push({ type: "PHONE", maskedValue: maskPhone(record.phoneNumber), isPrimary: true, source: "CUSTOMER_LEGACY" });
  }
  if (!types.has("EMAIL") && record.email) {
    result.push({ type: "EMAIL", maskedValue: maskEmail(record.email), isPrimary: true, source: "CUSTOMER_LEGACY" });
  }
  return result;
}

function appointments(record: UnifiedCrmCustomer360Record): UnifiedCrmCustomer360Appointment[] {
  const seen = new Set<string>();
  return record.appointmentParticipants.flatMap(({ appointment }) => {
    if (seen.has(appointment.id)) return [];
    seen.add(appointment.id);
    return [{
      id: appointment.id,
      title: appointment.title,
      startsAt: appointment.startsAt?.toISOString() ?? null,
      bookingStatus: appointment.bookingStatus,
      confirmationStatus: appointment.confirmationStatus,
      attendanceStatus: appointment.attendanceStatus,
      sourceHref: "/appointments"
    }];
  });
}

export async function getUnifiedCrmCustomer360(
  actor: AuthenticatedUser | null,
  customerIdValue: unknown,
  dependencies: UnifiedCrmCustomer360Dependencies = {}
): Promise<UnifiedCrmCustomer360ReadModel> {
  const { recordScope } = requireUnifiedCrmCustomer360Access(actor, dependencies);
  const customerId = normalizeCustomerId(customerIdValue);
  const now = dependencies.now?.() ?? new Date();
  const scopeRepository = dependencies.scopeRepository ?? createUnifiedCrmCustomerReadRepository();
  const repository = dependencies.repository ?? createUnifiedCrmCustomer360Repository();
  let organizationIds: string[];
  let record: UnifiedCrmCustomer360Record | null;
  try {
    organizationIds = await scopeRepository.listActiveOrganizationIds(actor!.id, now);
    if (organizationIds.length === 0) {
      throw new UnifiedCrmCustomer360Error(
        "ORGANIZATION_SCOPE_UNAVAILABLE",
        "Customer details are not available for this viewer."
      );
    }
    if (organizationIds.length > 1) {
      throw new UnifiedCrmCustomer360Error(
        "ORGANIZATION_SCOPE_AMBIGUOUS",
        "Select one authorized organization before opening customer details."
      );
    }
    record = await repository.findCustomer({ customerId, organizationId: organizationIds[0], recordScope });
  } catch (error) {
    if (error instanceof UnifiedCrmCustomer360Error) throw error;
    throw new UnifiedCrmCustomer360Error(
      "CUSTOMER_SOURCE_UNAVAILABLE",
      "Customer details are temporarily unavailable.",
      { cause: error }
    );
  }
  if (!record) {
    throw new UnifiedCrmCustomer360Error("CUSTOMER_NOT_AVAILABLE", "Customer details are not available.");
  }

  const observedAt = now.toISOString();
  return {
    contractVersion: UNIFIED_CRM_CUSTOMER_360_CONTRACT_VERSION,
    state: "READY",
    visibility: recordScope.kind === "ORGANIZATION" ? "organization" : "owned",
    generatedAt: observedAt,
    source: {
      authority: "CUSTOMERS",
      label: "Customers",
      href: `/customers/${encodeURIComponent(record.id)}`,
      readMode: "LIVE_CANONICAL",
      observedAt
    },
    freshness: { status: "CURRENT", observedAt, sourceRecordUpdatedAt: record.updatedAt.toISOString() },
    identity: {
      id: record.id,
      customerNumber: record.customerNumber,
      displayName: record.displayName,
      status: record.status.toLowerCase() as UnifiedCrmCustomer360ReadModel["identity"]["status"],
      customerSince: record.createdAt.toISOString()
    },
    owner: record.ownerUser,
    contacts: contacts(record),
    preferences: {
      preferredContactMethod: record.preferredContactMethod,
      preferredContactTime: record.preferredContactTime,
      languageCode: record.languageCode
    },
    relationship: {
      lastInteractionAt: record.lastInteractionAt?.toISOString() ?? null,
      nextActionAt: record.nextActionAt?.toISOString() ?? null
    },
    vehicles: record.vehicleRelationships.map(({ vehicle, ...relationship }) => ({
      id: vehicle.id,
      label: [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ") || vehicle.vehicleNumber,
      status: vehicle.status,
      relationshipType: relationship.relationshipType,
      effectiveFrom: relationship.effectiveFrom.toISOString(),
      effectiveTo: relationship.effectiveTo?.toISOString() ?? null,
      sourceHref: `/vehicles/360/${encodeURIComponent(vehicle.id)}`
    })),
    appointments: appointments(record),
    sourceLenses: {
      leads: record.leads.filter((lead) =>
        recordScope.kind === "ORGANIZATION" || lead.ownerUser.id === recordScope.ownerUserId
      ).map((lead) => ({
        id: lead.id,
        leadNumber: lead.leadNumber,
        stage: lead.stage,
        sourceCode: lead.sourceCode,
        ownerName: lead.ownerUser.name,
        vehicleInterest: lead.vehicleInterest,
        nextActionCode: lead.nextActionCode,
        nextActionAt: lead.nextActionAt.toISOString(),
        sourceHref: "/sales"
      })),
      cases: record.concernCases.filter((customerCase) =>
        recordScope.kind === "ORGANIZATION" || customerCase.assignedOwner?.id === recordScope.ownerUserId
      ).map((customerCase) => ({
        id: customerCase.id,
        caseNumber: customerCase.concernNumber,
        title: customerCase.title,
        category: customerCase.category,
        priority: customerCase.priority,
        status: customerCase.status,
        ownerName: customerCase.assignedOwner?.name ?? "Unassigned",
        dueAt: customerCase.dueAt.toISOString(),
        resolutionDueAt: customerCase.resolutionDueAt?.toISOString() ?? null,
        slaStage: customerCase.slaStage,
        sourceHref: `/customers/resolutions?caseId=${encodeURIComponent(customerCase.concernNumber)}`
      }))
    }
  };
}
