import type { AuthenticatedUser } from "@/server/auth/store";
import { isManager } from "@/server/policies/access";
import { requireUnifiedCrmCustomerReadPolicy } from "@/server/policies/unified-crm-customer-read";
import {
  DEFAULT_UNIFIED_CRM_SAVED_VIEW_CONFIG,
  UNIFIED_CRM_SAVED_VIEW_CONFIG_SCHEMA_VERSION,
  UNIFIED_CRM_SAVED_VIEW_CONTRACT_VERSION,
  normalizeUnifiedCrmSavedViewConfig,
  normalizeUnifiedCrmSavedViewName,
  normalizeUnifiedCrmSavedViewVisibility,
  UnifiedCrmSavedViewError,
  type UnifiedCrmSavedViewListModel,
  type UnifiedCrmSavedViewModel
} from "@/server/unified-crm/saved-view-contract";
import {
  createUnifiedCrmSavedViewRepository,
  type UnifiedCrmSavedViewRecord,
  type UnifiedCrmSavedViewRepository
} from "@/server/repositories/unified-crm-saved-view-repository";

type UnifiedCrmSavedViewDependencies = {
  now?: () => Date;
  repository?: UnifiedCrmSavedViewRepository;
};

function object(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new UnifiedCrmSavedViewError("SAVED_VIEW_INVALID", "Saved view payload must be an object.");
  }
  return value as Record<string, unknown>;
}

async function resolveOrganizationId(
  actor: AuthenticatedUser,
  repository: UnifiedCrmSavedViewRepository,
  now: Date
) {
  const organizationIds = await repository.listActiveOrganizationIds(actor.id, now);
  if (organizationIds.length === 0) {
    throw new UnifiedCrmSavedViewError("SAVED_VIEW_FORBIDDEN", "CRM saved views are not available for this viewer.");
  }
  if (organizationIds.length > 1) {
    throw new UnifiedCrmSavedViewError("SAVED_VIEW_INVALID", "Select one authorized organization before using CRM saved views.");
  }
  return organizationIds[0];
}

function mapSavedView(record: UnifiedCrmSavedViewRecord, actor: AuthenticatedUser): UnifiedCrmSavedViewModel {
  let config = DEFAULT_UNIFIED_CRM_SAVED_VIEW_CONFIG;
  let recoveryNotice: string | null = null;

  try {
    if (record.configSchemaVersion !== UNIFIED_CRM_SAVED_VIEW_CONFIG_SCHEMA_VERSION) {
      throw new Error("Unsupported saved view schema version.");
    }
    config = normalizeUnifiedCrmSavedViewConfig(record.config);
  } catch {
    recoveryNotice = "A retired or invalid CRM filter was removed; this view now opens with safe defaults.";
  }

  return {
    ...config,
    canDelete: record.createdByUser.id === actor.id || (record.visibility === "TEAM" && isManager(actor)),
    configSchemaVersion: record.configSchemaVersion,
    contractVersion: UNIFIED_CRM_SAVED_VIEW_CONTRACT_VERSION,
    createdAt: record.createdAt.toISOString(),
    createdByUser: record.createdByUser,
    id: record.id,
    name: record.name,
    recoveryNotice,
    updatedAt: record.updatedAt.toISOString(),
    version: record.version,
    visibility: record.visibility
  };
}

export async function listUnifiedCrmSavedViews(
  actor: AuthenticatedUser | null,
  dependencies: UnifiedCrmSavedViewDependencies = {}
): Promise<UnifiedCrmSavedViewListModel> {
  requireUnifiedCrmCustomerReadPolicy(actor);
  const repository = dependencies.repository ?? createUnifiedCrmSavedViewRepository();
  const now = dependencies.now?.() ?? new Date();
  const organizationId = await resolveOrganizationId(actor!, repository, now);
  const savedViews = await repository.list({ organizationId, userId: actor!.id });
  return {
    contractVersion: UNIFIED_CRM_SAVED_VIEW_CONTRACT_VERSION,
    savedViews: savedViews.map((record) => mapSavedView(record, actor!))
  };
}

export async function getUnifiedCrmSavedView(
  actor: AuthenticatedUser | null,
  id: string,
  dependencies: UnifiedCrmSavedViewDependencies = {}
) {
  requireUnifiedCrmCustomerReadPolicy(actor);
  const savedViewId = normalizeUnifiedCrmSavedViewName(id);
  const repository = dependencies.repository ?? createUnifiedCrmSavedViewRepository();
  const now = dependencies.now?.() ?? new Date();
  const organizationId = await resolveOrganizationId(actor!, repository, now);
  const record = await repository.find({ id: savedViewId, organizationId, userId: actor!.id });
  return record ? mapSavedView(record, actor!) : null;
}

export async function createUnifiedCrmSavedView(
  actor: AuthenticatedUser | null,
  value: unknown,
  dependencies: UnifiedCrmSavedViewDependencies = {}
) {
  requireUnifiedCrmCustomerReadPolicy(actor);
  const raw = object(value);
  const visibility = normalizeUnifiedCrmSavedViewVisibility(raw.visibility);
  if (visibility === "TEAM" && !isManager(actor)) {
    throw new UnifiedCrmSavedViewError("SAVED_VIEW_FORBIDDEN", "Manager access is required to share a CRM saved view.");
  }

  const repository = dependencies.repository ?? createUnifiedCrmSavedViewRepository();
  const now = dependencies.now?.() ?? new Date();
  const organizationId = await resolveOrganizationId(actor!, repository, now);
  const record = await repository.create({
    config: normalizeUnifiedCrmSavedViewConfig(raw.config) as unknown as Record<string, unknown>,
    configSchemaVersion: UNIFIED_CRM_SAVED_VIEW_CONFIG_SCHEMA_VERSION,
    createdByUserId: actor!.id,
    name: normalizeUnifiedCrmSavedViewName(raw.name),
    organizationId,
    visibility
  });
  return mapSavedView(record, actor!);
}

export async function deleteUnifiedCrmSavedView(
  actor: AuthenticatedUser | null,
  id: string,
  dependencies: UnifiedCrmSavedViewDependencies = {}
) {
  requireUnifiedCrmCustomerReadPolicy(actor);
  const savedViewId = normalizeUnifiedCrmSavedViewName(id);
  const repository = dependencies.repository ?? createUnifiedCrmSavedViewRepository();
  const now = dependencies.now?.() ?? new Date();
  const organizationId = await resolveOrganizationId(actor!, repository, now);
  const record = await repository.find({ id: savedViewId, organizationId, userId: actor!.id });
  if (!record) {
    throw new UnifiedCrmSavedViewError("SAVED_VIEW_NOT_FOUND", "CRM saved view was not found.");
  }
  if (record.createdByUser.id !== actor!.id && !(record.visibility === "TEAM" && isManager(actor))) {
    throw new UnifiedCrmSavedViewError("SAVED_VIEW_FORBIDDEN", "You do not have permission to delete this CRM saved view.");
  }
  await repository.remove({ id: record.id, organizationId });
}
