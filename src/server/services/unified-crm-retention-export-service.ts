import type { AuthenticatedUser } from "@/server/auth/store";
import { resolveUnifiedCrmWorkspace } from "@/server/policies/unified-crm-access";
import { UNIFIED_CRM_RETENTION_EXPORT_CONTRACT_VERSION, UnifiedCrmRetentionExportError, type UnifiedCrmRetentionExportCheck, type UnifiedCrmRetentionExportReadModel } from "@/server/unified-crm/retention-export-contract";

type Dependencies = { now?: () => Date };
const CHECKS: UnifiedCrmRetentionExportCheck[] = [
  { category: "approvedPolicy", evidence: "Exact retention periods, disposition schedule, and export volume thresholds remain deferred under UCRM-DEC-014.", holdOwner: "product-owner", status: "HOLD" },
  { category: "fieldClassification", evidence: "Sensitive fields remain classified; restricted exports cannot include masked data without explicit capability and policy.", holdOwner: null, status: "PASS" },
  { category: "legalHold", evidence: "Legal hold must block disposition and export deletion side effects before any job can run.", holdOwner: null, status: "PASS" },
  { category: "immutableEvidence", evidence: "Disposition/export previews, approvals, job runs, failures, and cancellations require immutable evidence.", holdOwner: null, status: "PASS" },
  { category: "jobSimulation", evidence: "Dry-run simulation is required before any real disposition or export job.", holdOwner: "quality", status: "HOLD" },
  { category: "exportThresholds", evidence: "Broad and restricted export thresholds remain unapproved.", holdOwner: "data-owner", status: "HOLD" },
  { category: "recovery", evidence: "Recovery and rollback behavior must be rehearsed before automated disposition.", holdOwner: "operations", status: "HOLD" },
  { category: "legalSecuritySignoff", evidence: "Legal/security signoff remains required before real-data disposition or restricted export.", holdOwner: "security-privacy", status: "HOLD" }
];

export async function getUnifiedCrmRetentionExport(actor: AuthenticatedUser | null, dependencies: Dependencies = {}): Promise<UnifiedCrmRetentionExportReadModel> {
  if (!actor) throw new UnifiedCrmRetentionExportError("AUTHENTICATION_REQUIRED", "Sign in before opening CRM retention and export readiness.");
  if (resolveUnifiedCrmWorkspace(actor) !== "MANAGEMENT") throw new UnifiedCrmRetentionExportError("RETENTION_EXPORT_NOT_AUTHORIZED", "CRM retention and export readiness is available to the manager workspace.");
  return {
    activation: { automatedDispositionEnabled: false, broadExportEnabled: false, restrictedExportEnabled: false, state: "HELD" },
    checks: CHECKS.map((check) => ({ ...check })),
    contractVersion: UNIFIED_CRM_RETENTION_EXPORT_CONTRACT_VERSION,
    generatedAt: (dependencies.now?.() ?? new Date()).toISOString(),
    policyDependency: "UCRM-DEC-014",
    rollback: { fallback: "source-domain-retention-and-manual-approved-export", featureControl: "crm.enterprise.retentionExport.enabled", posture: "fail-closed" },
    state: "HELD",
    visibility: "management"
  };
}
