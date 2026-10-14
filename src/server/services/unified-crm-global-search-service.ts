import type { AuthenticatedUser } from "@/server/auth/store";
import { requireUnifiedCrmCustomerReadPolicy } from "@/server/policies/unified-crm-customer-read";
import {
  createUnifiedCrmGlobalSearchRepository,
  type UnifiedCrmGlobalSearchRepository,
  type UnifiedCrmGlobalSearchRepositoryRow
} from "@/server/repositories/unified-crm-global-search-repository";
import {
  normalizeUnifiedCrmGlobalSearchQuery,
  UNIFIED_CRM_GLOBAL_SEARCH_CONTRACT_VERSION,
  UnifiedCrmGlobalSearchError,
  type UnifiedCrmGlobalSearchEntity,
  type UnifiedCrmGlobalSearchGroup,
  type UnifiedCrmGlobalSearchQueryInput,
  type UnifiedCrmGlobalSearchReadModel,
  type UnifiedCrmGlobalSearchResult
} from "@/server/unified-crm/global-search-contract";

export type UnifiedCrmGlobalSearchMode = "OFF" | "REVIEW";

type UnifiedCrmGlobalSearchDependencies = {
  mode?: unknown;
  nodeEnv?: string;
  now?: () => Date;
  repository?: UnifiedCrmGlobalSearchRepository;
};

const GROUP_LABELS: Record<UnifiedCrmGlobalSearchEntity, string> = {
  appointment: "Appointments",
  contact: "Contacts",
  customer: "Customers",
  dispatch: "Dispatch handoffs",
  opportunity: "Opportunities",
  quote: "Quotes",
  task: "Tasks",
  vehicle: "Vehicles"
};

const ENTITY_ORDER: UnifiedCrmGlobalSearchEntity[] = [
  "customer",
  "contact",
  "opportunity",
  "quote",
  "task",
  "appointment",
  "vehicle",
  "dispatch"
];

export function resolveUnifiedCrmGlobalSearchMode(
  options: Pick<UnifiedCrmGlobalSearchDependencies, "mode" | "nodeEnv"> = {}
): UnifiedCrmGlobalSearchMode {
  const configured = options.mode ?? process.env.UNIFIED_CRM_GLOBAL_SEARCH_MODE;
  if (configured !== undefined && configured !== null) {
    return typeof configured === "string" && configured.trim().toUpperCase() === "REVIEW" ? "REVIEW" : "OFF";
  }
  return (options.nodeEnv ?? process.env.NODE_ENV) === "production" ? "OFF" : "REVIEW";
}

function toResult(row: UnifiedCrmGlobalSearchRepositoryRow, index: number): UnifiedCrmGlobalSearchResult {
  return {
    entity: row.entity,
    href: row.href,
    id: row.id,
    label: row.label,
    matchedOn: row.matchedOn,
    rank: index + 1,
    secondary: row.secondary ?? "No secondary identifier",
    updatedAt: row.updatedAt?.toISOString() ?? null
  };
}

function groupResults(results: UnifiedCrmGlobalSearchResult[]): UnifiedCrmGlobalSearchGroup[] {
  return ENTITY_ORDER
    .map((entity) => {
      const grouped = results.filter((result) => result.entity === entity);
      return {
        count: grouped.length,
        entity,
        label: GROUP_LABELS[entity],
        results: grouped
      };
    })
    .filter((group) => group.count > 0);
}

export async function searchUnifiedCrm(
  actor: AuthenticatedUser | null,
  input: UnifiedCrmGlobalSearchQueryInput | URLSearchParams = {},
  dependencies: UnifiedCrmGlobalSearchDependencies = {}
): Promise<UnifiedCrmGlobalSearchReadModel> {
  const recordScope = requireUnifiedCrmCustomerReadPolicy(actor);
  if (resolveUnifiedCrmGlobalSearchMode(dependencies) !== "REVIEW") {
    throw new UnifiedCrmGlobalSearchError("GLOBAL_SEARCH_OFF", "CRM search is temporarily unavailable.");
  }

  const query = normalizeUnifiedCrmGlobalSearchQuery(input);
  const repository = dependencies.repository ?? createUnifiedCrmGlobalSearchRepository();
  const now = dependencies.now?.() ?? new Date();
  let rows: UnifiedCrmGlobalSearchRepositoryRow[];
  let organizationIds: string[];
  try {
    organizationIds = await repository.listActiveOrganizationIds(actor!.id, now);
    if (organizationIds.length === 0) {
      throw new UnifiedCrmGlobalSearchError(
        "ORGANIZATION_SCOPE_UNAVAILABLE",
        "CRM search is not available for this viewer."
      );
    }
    if (organizationIds.length > 1) {
      throw new UnifiedCrmGlobalSearchError(
        "ORGANIZATION_SCOPE_AMBIGUOUS",
        "Select one authorized organization before searching CRM."
      );
    }
    rows = await repository.search({
      limit: query.limit,
      organizationId: organizationIds[0],
      q: query.q,
      recordScope,
      viewerUserId: actor!.id
    });
  } catch (error) {
    if (error instanceof UnifiedCrmGlobalSearchError) throw error;
    throw new UnifiedCrmGlobalSearchError(
      "GLOBAL_SEARCH_SOURCE_UNAVAILABLE",
      "CRM search is temporarily unavailable.",
      { cause: error }
    );
  }

  const observedAt = now.toISOString();
  const results = rows.map(toResult);
  const newestRecordUpdatedAt = results
    .map((result) => result.updatedAt)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1) ?? null;

  return {
    contractVersion: UNIFIED_CRM_GLOBAL_SEARCH_CONTRACT_VERSION,
    freshness: {
      newestRecordUpdatedAt,
      observedAt,
      status: "CURRENT"
    },
    generatedAt: observedAt,
    groups: groupResults(results),
    query,
    resultCount: results.length,
    source: {
      authority: "UNIFIED_CRM",
      label: "Unified CRM global search",
      observedAt,
      readMode: "LIVE_CANONICAL"
    },
    state: results.length ? "READY" : "EMPTY",
    visibility: recordScope.kind === "ORGANIZATION" ? "organization" : "owned"
  };
}
