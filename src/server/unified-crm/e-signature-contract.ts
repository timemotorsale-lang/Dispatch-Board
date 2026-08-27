export const UNIFIED_CRM_E_SIGNATURE_CONTRACT_VERSION = "ucrm.e-signature/v1" as const;
export const UNIFIED_CRM_E_SIGNATURE_ERROR_CONTRACT_VERSION = "ucrm.e-signature-error/v1" as const;

export type UnifiedCrmESignatureStatus = "PASS" | "HOLD";

export type UnifiedCrmESignatureCheck = {
  category:
    | "providerSelection"
    | "documentAuthority"
    | "signerIdentity"
    | "envelopeEvidence"
    | "webhookReconciliation"
    | "expiryCancel"
    | "permissions"
    | "templateVersioning"
    | "audit"
    | "rollback";
  evidence: string;
  holdOwner: string | null;
  status: UnifiedCrmESignatureStatus;
};

export type UnifiedCrmESignatureReadModel = {
  activation: {
    envelopeCreateEnabled: false;
    providerName: null;
    signatureStatusImportEnabled: false;
    state: "HELD";
  };
  checks: UnifiedCrmESignatureCheck[];
  contractVersion: typeof UNIFIED_CRM_E_SIGNATURE_CONTRACT_VERSION;
  generatedAt: string;
  rollback: {
    fallback: "manual-document-review-and-existing-approval-workflow";
    featureControl: "crm.integrations.eSignature.enabled";
    posture: "fail-closed";
  };
  state: "HELD";
  visibility: "management";
};

export type UnifiedCrmESignatureFailureCode =
  | "AUTHENTICATION_REQUIRED"
  | "E_SIGNATURE_NOT_AUTHORIZED";

const FAILURE_STATUS: Record<UnifiedCrmESignatureFailureCode, number> = {
  AUTHENTICATION_REQUIRED: 401,
  E_SIGNATURE_NOT_AUTHORIZED: 403
};

export class UnifiedCrmESignatureError extends Error {
  readonly code: UnifiedCrmESignatureFailureCode;
  readonly contractVersion = UNIFIED_CRM_E_SIGNATURE_ERROR_CONTRACT_VERSION;
  readonly httpStatus: number;
  readonly retryable = false;

  constructor(code: UnifiedCrmESignatureFailureCode, message: string) {
    super(message);
    this.name = "UnifiedCrmESignatureError";
    this.code = code;
    this.httpStatus = FAILURE_STATUS[code];
  }
}
