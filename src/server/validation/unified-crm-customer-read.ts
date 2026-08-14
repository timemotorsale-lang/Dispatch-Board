import {
  UNIFIED_CRM_CUSTOMER_LIST_OWNERS,
  UNIFIED_CRM_CUSTOMER_LIST_STATUSES,
  UnifiedCrmCustomerReadError,
  type UnifiedCrmCustomerCursor,
  type UnifiedCrmCustomerListOwner,
  type UnifiedCrmCustomerListQuery,
  type UnifiedCrmCustomerListQueryInput,
  type UnifiedCrmCustomerListStatus
} from "@/server/unified-crm/customer-read-contract";

const ALLOWED_QUERY_KEYS = new Set(["cursor", "limit", "owner", "q", "status"]);

function invalid(message: string): never {
  throw new UnifiedCrmCustomerReadError("INVALID_CUSTOMER_QUERY", message);
}

function scalar(value: unknown, label: string) {
  if (value === undefined || value === null) return null;
  if (Array.isArray(value)) invalid(`${label} must be supplied once.`);
  if (typeof value !== "string" && typeof value !== "number") {
    invalid(`${label} is invalid.`);
  }
  return String(value).trim();
}

export function normalizeUnifiedCrmCustomerListQuery(
  input: UnifiedCrmCustomerListQueryInput | URLSearchParams = {}
): UnifiedCrmCustomerListQuery {
  const raw = input instanceof URLSearchParams
    ? Object.fromEntries([...input.keys()].map((key) => [key, input.getAll(key)]))
    : input as Record<string, unknown>;

  for (const key of Object.keys(raw)) {
    if (!ALLOWED_QUERY_KEYS.has(key)) invalid(`Customer query parameter "${key}" is not supported.`);
  }

  if (input instanceof URLSearchParams) {
    for (const [key, values] of Object.entries(raw)) {
      if ((values as string[]).length > 1) invalid(`Customer query parameter "${key}" must be supplied once.`);
      raw[key] = (values as string[])[0];
    }
  }

  const q = scalar(raw.q, "Customer query") ?? "";
  if (q.length > 100) invalid("Customer query must be 100 characters or fewer.");

  const statusValue = (scalar(raw.status, "Customer status") || "active").toLowerCase();
  if (!UNIFIED_CRM_CUSTOMER_LIST_STATUSES.includes(statusValue as UnifiedCrmCustomerListStatus)) {
    invalid("Customer status must be active, inactive, or all.");
  }

  const ownerValue = (scalar(raw.owner, "Customer owner") || "all").toLowerCase();
  if (!UNIFIED_CRM_CUSTOMER_LIST_OWNERS.includes(ownerValue as UnifiedCrmCustomerListOwner)) {
    invalid("Customer owner must be all, mine, or unassigned.");
  }

  const limitValue = scalar(raw.limit, "Customer page size");
  const limit = limitValue === null || limitValue === "" ? 25 : Number(limitValue);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    invalid("Customer page size must be a whole number from 1 through 100.");
  }

  const cursor = scalar(raw.cursor, "Customer cursor");
  if (cursor && cursor.length > 1024) invalid("Customer cursor is invalid.");
  if (cursor) decodeUnifiedCrmCustomerCursor(cursor);

  return {
    cursor: cursor || null,
    limit,
    owner: ownerValue as UnifiedCrmCustomerListOwner,
    q,
    status: statusValue as UnifiedCrmCustomerListStatus
  };
}

export function encodeUnifiedCrmCustomerCursor(cursor: UnifiedCrmCustomerCursor) {
  return Buffer.from(JSON.stringify({ v: 1, id: cursor.id, updatedAt: cursor.updatedAt.toISOString() }))
    .toString("base64url");
}

export function decodeUnifiedCrmCustomerCursor(value: string): UnifiedCrmCustomerCursor {
  try {
    const decoded = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Record<string, unknown>;
    const id = typeof decoded.id === "string" ? decoded.id.trim() : "";
    const updatedAt = typeof decoded.updatedAt === "string" ? new Date(decoded.updatedAt) : new Date(NaN);
    if (decoded.v !== 1 || !id || id.length > 200 || Number.isNaN(updatedAt.getTime())) {
      return invalid("Customer cursor is invalid.");
    }
    return { id, updatedAt };
  } catch {
    return invalid("Customer cursor is invalid.");
  }
}
