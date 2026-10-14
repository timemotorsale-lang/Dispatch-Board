import type { AuthenticatedUser } from "@/server/auth/store";
import { requireUnifiedCrmCustomerReadPolicy } from "@/server/policies/unified-crm-customer-read";
import {
  createUnifiedCrmCustomerReadRepository,
  type UnifiedCrmCustomerListRecord,
  type UnifiedCrmCustomerReadRepository
} from "@/server/repositories/unified-crm-customer-read-repository";
import {
  UNIFIED_CRM_CUSTOMER_LIST_CONTRACT_VERSION,
  UnifiedCrmCustomerReadError,
  type UnifiedCrmCustomerListItem,
  type UnifiedCrmCustomerListQueryInput,
  type UnifiedCrmCustomerListReadModel,
  type UnifiedCrmCustomerReadMode
} from "@/server/unified-crm/customer-read-contract";
import {
  decodeUnifiedCrmCustomerCursor,
  encodeUnifiedCrmCustomerCursor,
  normalizeUnifiedCrmCustomerListQuery
} from "@/server/validation/unified-crm-customer-read";

type UnifiedCrmCustomerReadOptions = {
  nodeEnv?: string;
  readMode?: unknown;
};

type UnifiedCrmCustomerReadDependencies = UnifiedCrmCustomerReadOptions & {
  now?: () => Date;
  repository?: UnifiedCrmCustomerReadRepository;
};

export function resolveUnifiedCrmCustomerReadMode(
  options: UnifiedCrmCustomerReadOptions = {}
): UnifiedCrmCustomerReadMode {
  const configuredValue = options.readMode ?? process.env.UNIFIED_CRM_CUSTOMER_READ_MODE;
  if (configuredValue !== undefined && configuredValue !== null) {
    return typeof configuredValue === "string" && configuredValue.trim().toUpperCase() === "REVIEW"
      ? "REVIEW"
      : "OFF";
  }
  const nodeEnv = options.nodeEnv ?? process.env.NODE_ENV;
  return nodeEnv === "production" ? "OFF" : "REVIEW";
}

function maskedPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits ? `••••${digits.slice(-4)}` : "••••";
}

function maskedEmail(value: string) {
  const [local = "", domain = ""] = value.trim().split("@", 2);
  if (!domain) return "••••";
  const parts = domain.split(".");
  const domainName = parts.shift() ?? "";
  const suffix = parts.length ? `.${parts.at(-1)}` : "";
  return `${local.slice(0, 1) || "•"}•••@${domainName.slice(0, 1) || "•"}•••${suffix}`;
}

function primaryContact(record: UnifiedCrmCustomerListRecord, type: "PHONE" | "EMAIL") {
  return record.contactPoints.find((point) => point.type.trim().toUpperCase() === type)?.value ??
    (type === "PHONE" ? record.phoneNumber : record.email);
}

function contactCompleteness(phone: string | null | undefined, email: string | null | undefined): UnifiedCrmCustomerListItem["contactCompleteness"] {
  if (phone && email) return "complete";
  if (phone || email) return "partial";
  return "missing";
}

function toItem(record: UnifiedCrmCustomerListRecord): UnifiedCrmCustomerListItem {
  const phone = primaryContact(record, "PHONE");
  const email = primaryContact(record, "EMAIL");
  return {
    id: record.id,
    displayName: record.displayName,
    customerNumber: record.customerNumber,
    address: record.address,
    contactCompleteness: contactCompleteness(phone, email),
    dateOfBirth: record.dateOfBirth?.toISOString().slice(0, 10) ?? null,
    duplicateRisk: Boolean(record.duplicateKey),
    hasNextAction: Boolean(record.nextActionAt),
    idLast4: record.idLast4,
    idState: record.idState,
    idType: record.idType,
    identityGender: record.identityGender,
    maskedPhone: phone ? maskedPhone(phone) : "Not recorded",
    maskedEmail: email ? maskedEmail(email) : "Not recorded",
    ownerName: record.ownerUser?.name ?? "Unassigned",
    preferredContactMethod: record.preferredContactMethod,
    ssnLast4: record.ssnLast4,
    sourceCode: record.sourceCode,
    status: record.status.toLowerCase() as UnifiedCrmCustomerListItem["status"],
    lastInteractionAt: record.lastInteractionAt?.toISOString() ?? null,
    nextActionAt: record.nextActionAt?.toISOString() ?? null,
    updatedAt: record.updatedAt.toISOString(),
    sourceHref: `/customers/${encodeURIComponent(record.id)}`
  };
}

export async function getUnifiedCrmCustomerList(
  actor: AuthenticatedUser | null,
  input: UnifiedCrmCustomerListQueryInput | URLSearchParams = {},
  dependencies: UnifiedCrmCustomerReadDependencies = {}
): Promise<UnifiedCrmCustomerListReadModel> {
  const recordScope = requireUnifiedCrmCustomerReadPolicy(actor);
  if (resolveUnifiedCrmCustomerReadMode(dependencies) !== "REVIEW") {
    throw new UnifiedCrmCustomerReadError("CUSTOMER_READ_OFF", "Customer records are temporarily unavailable.");
  }

  const query = normalizeUnifiedCrmCustomerListQuery(input);
  const repository = dependencies.repository ?? createUnifiedCrmCustomerReadRepository();
  const now = dependencies.now?.() ?? new Date();
  let organizationIds: string[];
  let records: UnifiedCrmCustomerListRecord[];
  try {
    organizationIds = await repository.listActiveOrganizationIds(actor!.id, now);
    if (organizationIds.length === 0) {
      throw new UnifiedCrmCustomerReadError(
        "ORGANIZATION_SCOPE_UNAVAILABLE",
        "Customer records are not available for this viewer."
      );
    }
    if (organizationIds.length > 1) {
      throw new UnifiedCrmCustomerReadError(
        "ORGANIZATION_SCOPE_AMBIGUOUS",
        "Select one authorized organization before opening customer records."
      );
    }
    records = await repository.listCustomers({
      cursor: query.cursor ? decodeUnifiedCrmCustomerCursor(query.cursor) : null,
      limit: query.limit,
      organizationId: organizationIds[0],
      owner: query.owner,
      q: query.q,
      recordScope,
      status: query.status,
      viewerUserId: actor!.id
    });
  } catch (error) {
    if (error instanceof UnifiedCrmCustomerReadError) throw error;
    throw new UnifiedCrmCustomerReadError(
      "CUSTOMER_SOURCE_UNAVAILABLE",
      "Customer records are temporarily unavailable.",
      { cause: error }
    );
  }

  const hasMore = records.length > query.limit;
  const visibleRecords = records.slice(0, query.limit);
  const lastRecord = visibleRecords.at(-1);
  const observedAt = now.toISOString();
  const newestRecordUpdatedAt = visibleRecords[0]?.updatedAt.toISOString() ?? null;
  return {
    contractVersion: UNIFIED_CRM_CUSTOMER_LIST_CONTRACT_VERSION,
    state: visibleRecords.length ? "READY" : "EMPTY",
    visibility: recordScope.kind === "ORGANIZATION" ? "organization" : "owned",
    generatedAt: observedAt,
    source: {
      authority: "CUSTOMERS",
      label: "Customers",
      href: "/customers",
      readMode: "LIVE_CANONICAL",
      observedAt
    },
    freshness: {
      status: "CURRENT",
      observedAt,
      newestRecordUpdatedAt
    },
    query: { q: query.q, status: query.status, owner: query.owner },
    items: visibleRecords.map(toItem),
    page: {
      limit: query.limit,
      hasMore,
      nextCursor: hasMore && lastRecord
        ? encodeUnifiedCrmCustomerCursor({ id: lastRecord.id, updatedAt: lastRecord.updatedAt })
        : null
    }
  };
}
