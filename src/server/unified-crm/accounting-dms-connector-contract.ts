export const UNIFIED_CRM_ACCOUNTING_DMS_CONNECTOR_CONTRACT_VERSION = "ucrm.accounting-dms-connector/v1" as const;
export const UNIFIED_CRM_ACCOUNTING_DMS_CONNECTOR_ERROR_CONTRACT_VERSION = "ucrm.accounting-dms-connector-error/v1" as const;

export type UnifiedCrmAccountingDmsConnectorStatus = "PASS" | "HOLD";

export type UnifiedCrmAccountingDmsConnectorCheck = {
  category:
    | "systemSelection"
    | "fieldOwnership"
    | "mapping"
    | "conflictRules"
    | "backfill"
    | "incrementalSync"
    | "reconciliation"
    | "sensitiveData"
    | "failureRecovery"
    | "disablement";
  evidence: string;
  holdOwner: string | null;
  status: UnifiedCrmAccountingDmsConnectorStatus;
};

export type UnifiedCrmAccountingDmsMappingPreviewRow = {
  id: string;
  crmField: string;
  externalField: string;
  sourceAuthority: "CRM" | "CUSTOMERS" | "QUOTES" | "DISPATCH" | "ACCOUNTING_DMS";
  direction: "READ_ONLY_PREVIEW" | "HELD_WRITEBACK";
  conflictRisk: "LOW" | "MEDIUM" | "HIGH";
  decisionNeeded: string | null;
};

export type UnifiedCrmAccountingDmsConnectorReadModel = {
  activation: {
    backfillEnabled: false;
    incrementalSyncEnabled: false;
    outboundWriteEnabled: false;
    selectedSystemName: null;
    state: "HELD";
  };
  checks: UnifiedCrmAccountingDmsConnectorCheck[];
  contractVersion: typeof UNIFIED_CRM_ACCOUNTING_DMS_CONNECTOR_CONTRACT_VERSION;
  mappingPreview: {
    state: "READY_REVIEW";
    selectedSystemName: null;
    syncEnabled: false;
    rows: UnifiedCrmAccountingDmsMappingPreviewRow[];
  };
  generatedAt: string;
  rollback: {
    fallback: "manual-accounting-dms-entry-and-reconciliation";
    featureControl: "crm.integrations.accountingDms.enabled";
    posture: "fail-closed";
  };
  state: "HELD";
  visibility: "management";
};

export type UnifiedCrmAccountingDmsConnectorFailureCode =
  | "AUTHENTICATION_REQUIRED"
  | "ACCOUNTING_DMS_CONNECTOR_NOT_AUTHORIZED";

const FAILURE_STATUS: Record<UnifiedCrmAccountingDmsConnectorFailureCode, number> = {
  AUTHENTICATION_REQUIRED: 401,
  ACCOUNTING_DMS_CONNECTOR_NOT_AUTHORIZED: 403
};

export class UnifiedCrmAccountingDmsConnectorError extends Error {
  readonly code: UnifiedCrmAccountingDmsConnectorFailureCode;
  readonly contractVersion = UNIFIED_CRM_ACCOUNTING_DMS_CONNECTOR_ERROR_CONTRACT_VERSION;
  readonly httpStatus: number;
  readonly retryable = false;

  constructor(code: UnifiedCrmAccountingDmsConnectorFailureCode, message: string) {
    super(message);
    this.name = "UnifiedCrmAccountingDmsConnectorError";
    this.code = code;
    this.httpStatus = FAILURE_STATUS[code];
  }
}
