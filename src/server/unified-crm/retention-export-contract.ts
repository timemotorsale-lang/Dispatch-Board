export const UNIFIED_CRM_RETENTION_EXPORT_CONTRACT_VERSION = "ucrm.retention-export/v1" as const;
export const UNIFIED_CRM_RETENTION_EXPORT_ERROR_CONTRACT_VERSION = "ucrm.retention-export-error/v1" as const;

export type UnifiedCrmRetentionExportStatus = "PASS" | "HOLD";
export type UnifiedCrmRetentionExportCheck = {
  category: "approvedPolicy" | "fieldClassification" | "legalHold" | "immutableEvidence" | "jobSimulation" | "exportThresholds" | "recovery" | "legalSecuritySignoff";
  evidence: string;
  holdOwner: string | null;
  status: UnifiedCrmRetentionExportStatus;
};

export type UnifiedCrmRetentionExportReadModel = {
  activation: { automatedDispositionEnabled: false; broadExportEnabled: false; restrictedExportEnabled: false; state: "HELD" };
  checks: UnifiedCrmRetentionExportCheck[];
  contractVersion: typeof UNIFIED_CRM_RETENTION_EXPORT_CONTRACT_VERSION;
  generatedAt: string;
  policyDependency: "UCRM-DEC-014";
  rollback: { fallback: "source-domain-retention-and-manual-approved-export"; featureControl: "crm.enterprise.retentionExport.enabled"; posture: "fail-closed" };
  state: "HELD";
  visibility: "management";
};

export type UnifiedCrmRetentionExportFailureCode = "AUTHENTICATION_REQUIRED" | "RETENTION_EXPORT_NOT_AUTHORIZED";
const FAILURE_STATUS: Record<UnifiedCrmRetentionExportFailureCode, number> = { AUTHENTICATION_REQUIRED: 401, RETENTION_EXPORT_NOT_AUTHORIZED: 403 };

export class UnifiedCrmRetentionExportError extends Error {
  readonly code: UnifiedCrmRetentionExportFailureCode;
  readonly contractVersion = UNIFIED_CRM_RETENTION_EXPORT_ERROR_CONTRACT_VERSION;
  readonly httpStatus: number;
  readonly retryable = false;
  constructor(code: UnifiedCrmRetentionExportFailureCode, message: string) {
    super(message);
    this.name = "UnifiedCrmRetentionExportError";
    this.code = code;
    this.httpStatus = FAILURE_STATUS[code];
  }
}
