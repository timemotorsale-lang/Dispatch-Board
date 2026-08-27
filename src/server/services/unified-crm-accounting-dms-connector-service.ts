import type { AuthenticatedUser } from "@/server/auth/store";
import { resolveUnifiedCrmWorkspace } from "@/server/policies/unified-crm-access";
import {
  UNIFIED_CRM_ACCOUNTING_DMS_CONNECTOR_CONTRACT_VERSION,
  UnifiedCrmAccountingDmsConnectorError,
  type UnifiedCrmAccountingDmsConnectorCheck,
  type UnifiedCrmAccountingDmsConnectorReadModel
} from "@/server/unified-crm/accounting-dms-connector-contract";

type Dependencies = {
  now?: () => Date;
};

const CHECKS: UnifiedCrmAccountingDmsConnectorCheck[] = [
  {
    category: "systemSelection",
    evidence: "No accounting or DMS system has been named for CRM integration.",
    holdOwner: "product-owner",
    status: "HOLD"
  },
  {
    category: "fieldOwnership",
    evidence: "CRM must not overwrite accounting, DMS, Customer, Inventory, Quote, or Dispatch source-of-truth fields without an approved ownership map.",
    holdOwner: "architecture",
    status: "HOLD"
  },
  {
    category: "mapping",
    evidence: "Field mapping, normalization, required fields, external ids, and versioning must be approved for one named system.",
    holdOwner: "data-owner",
    status: "HOLD"
  },
  {
    category: "conflictRules",
    evidence: "Conflict detection and resolution rules must be explicit; silent last-write-wins behavior is not allowed.",
    holdOwner: "data-owner",
    status: "HOLD"
  },
  {
    category: "backfill",
    evidence: "Backfill direction, limits, dry-run output, and rollback criteria remain unapproved.",
    holdOwner: "operations",
    status: "HOLD"
  },
  {
    category: "incrementalSync",
    evidence: "Incremental sync requires cursor ownership, idempotency, rate limits, dead-letter handling, and reconciliation before activation.",
    holdOwner: "architecture",
    status: "HOLD"
  },
  {
    category: "reconciliation",
    evidence: "Reconciliation must compare CRM envelopes against the named system and surface missing, duplicate, stale, and conflicted records.",
    holdOwner: null,
    status: "PASS"
  },
  {
    category: "sensitiveData",
    evidence: "Sensitive financial, customer, integration payload, and audit fields must remain masked unless explicit capabilities allow access.",
    holdOwner: null,
    status: "PASS"
  },
  {
    category: "failureRecovery",
    evidence: "Provider failures must degrade visibly, preserve queues, and avoid duplicate writes on replay.",
    holdOwner: null,
    status: "PASS"
  },
  {
    category: "disablement",
    evidence: "The connector remains disabled by default and falls back to manual accounting/DMS entry plus reconciliation.",
    holdOwner: null,
    status: "PASS"
  }
];

export async function getUnifiedCrmAccountingDmsConnector(
  actor: AuthenticatedUser | null,
  dependencies: Dependencies = {}
): Promise<UnifiedCrmAccountingDmsConnectorReadModel> {
  if (!actor) {
    throw new UnifiedCrmAccountingDmsConnectorError("AUTHENTICATION_REQUIRED", "Sign in before opening CRM accounting and DMS connector readiness.");
  }
  if (resolveUnifiedCrmWorkspace(actor) !== "MANAGEMENT") {
    throw new UnifiedCrmAccountingDmsConnectorError(
      "ACCOUNTING_DMS_CONNECTOR_NOT_AUTHORIZED",
      "CRM accounting and DMS connector readiness is available to the manager workspace."
    );
  }

  return {
    activation: {
      backfillEnabled: false,
      incrementalSyncEnabled: false,
      outboundWriteEnabled: false,
      selectedSystemName: null,
      state: "HELD"
    },
    checks: CHECKS.map((check) => ({ ...check })),
    contractVersion: UNIFIED_CRM_ACCOUNTING_DMS_CONNECTOR_CONTRACT_VERSION,
    generatedAt: (dependencies.now?.() ?? new Date()).toISOString(),
    rollback: {
      fallback: "manual-accounting-dms-entry-and-reconciliation",
      featureControl: "crm.integrations.accountingDms.enabled",
      posture: "fail-closed"
    },
    state: "HELD",
    visibility: "management"
  };
}
