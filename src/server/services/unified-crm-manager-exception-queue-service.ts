import type { AuthenticatedUser } from "@/server/auth/store";
import { resolveUnifiedCrmWorkspace } from "@/server/policies/unified-crm-access";
import {
  createUnifiedCrmManagerExceptionQueueRepository,
  type UnifiedCrmManagerExceptionQueueRepository,
  type UnifiedCrmManagerExceptionQueueRow
} from "@/server/repositories/unified-crm-manager-exception-queue-repository";
import {
  normalizeUnifiedCrmManagerExceptionQueueQuery,
  UNIFIED_CRM_MANAGER_EXCEPTION_QUEUE_CONTRACT_VERSION,
  UnifiedCrmManagerExceptionQueueError,
  type UnifiedCrmManagerExceptionQueueInput,
  type UnifiedCrmManagerExceptionQueueItem,
  type UnifiedCrmManagerExceptionQueueReadModel
} from "@/server/unified-crm/manager-exception-queue-contract";

type UnifiedCrmManagerExceptionQueueDependencies = {
  now?: () => Date;
  repository?: UnifiedCrmManagerExceptionQueueRepository;
};

function ageLabel(updatedAt: Date, now: Date) {
  const hours = Math.max(0, Math.floor((now.getTime() - updatedAt.getTime()) / 3_600_000));
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function toItem(row: UnifiedCrmManagerExceptionQueueRow, now: Date): UnifiedCrmManagerExceptionQueueItem {
  return {
    ageLabel: ageLabel(row.updatedAt, now),
    detail: row.detail,
    href: row.href,
    id: row.id,
    kind: row.kind,
    label: row.label,
    ownerName: row.ownerName ?? "Unassigned",
    recommendedAction: row.recommendedAction,
    updatedAt: row.updatedAt.toISOString()
  };
}

export async function getUnifiedCrmManagerExceptionQueue(
  actor: AuthenticatedUser | null,
  input: UnifiedCrmManagerExceptionQueueInput | URLSearchParams = {},
  dependencies: UnifiedCrmManagerExceptionQueueDependencies = {}
): Promise<UnifiedCrmManagerExceptionQueueReadModel> {
  if (!actor) {
    throw new UnifiedCrmManagerExceptionQueueError(
      "AUTHENTICATION_REQUIRED",
      "Sign in before opening manager CRM exceptions."
    );
  }
  if (resolveUnifiedCrmWorkspace(actor) !== "MANAGEMENT") {
    throw new UnifiedCrmManagerExceptionQueueError(
      "MANAGER_EXCEPTION_NOT_AUTHORIZED",
      "Manager CRM exceptions are not available for this workspace."
    );
  }

  const query = normalizeUnifiedCrmManagerExceptionQueueQuery(input);
  const now = dependencies.now?.() ?? new Date();
  const stalledBefore = new Date(now.getTime() - 7 * 24 * 3_600_000);
  const repository = dependencies.repository ?? createUnifiedCrmManagerExceptionQueueRepository();

  try {
    const organizationIds = await repository.listActiveOrganizationIds(actor.id, now);
    if (organizationIds.length === 0) {
      throw new UnifiedCrmManagerExceptionQueueError(
        "ORGANIZATION_SCOPE_UNAVAILABLE",
        "Manager CRM exceptions are not available for this viewer."
      );
    }
    if (organizationIds.length > 1) {
      throw new UnifiedCrmManagerExceptionQueueError(
        "ORGANIZATION_SCOPE_AMBIGUOUS",
        "Select one authorized organization before opening manager CRM exceptions."
      );
    }
    const [summary, rows] = await Promise.all([
      repository.summarize({ now, organizationId: organizationIds[0], stalledBefore }),
      repository.listExceptions({
        limit: query.limit + 1,
        now,
        offset: query.offset,
        organizationId: organizationIds[0],
        stalledBefore
      })
    ]);
    const visibleRows = rows.slice(0, query.limit);
    const observedAt = now.toISOString();
    return {
      contractVersion: UNIFIED_CRM_MANAGER_EXCEPTION_QUEUE_CONTRACT_VERSION,
      generatedAt: observedAt,
      items: visibleRows.map((row) => toItem(row, now)),
      page: {
        hasMore: rows.length > query.limit,
        nextOffset: rows.length > query.limit ? query.offset + query.limit : null
      },
      query,
      state: visibleRows.length ? "READY" : "EMPTY",
      summary,
      visibility: "organization"
    };
  } catch (error) {
    if (error instanceof UnifiedCrmManagerExceptionQueueError) throw error;
    throw new UnifiedCrmManagerExceptionQueueError(
      "MANAGER_EXCEPTION_SOURCE_UNAVAILABLE",
      "Manager CRM exceptions are temporarily unavailable.",
      { cause: error }
    );
  }
}
