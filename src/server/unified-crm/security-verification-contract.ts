export const UNIFIED_CRM_SECURITY_VERIFICATION_CONTRACT_VERSION = "ucrm.security-verification/v1" as const;
export const UNIFIED_CRM_SECURITY_VERIFICATION_ERROR_CONTRACT_VERSION = "ucrm.security-verification-error/v1" as const;

export type UnifiedCrmSecurityVerificationStatus = "PASS" | "HOLD";

export type UnifiedCrmSecurityVerificationCheck = {
  category:
    | "organizationIsolation"
    | "rbacCapabilities"
    | "fieldMasking"
    | "idor"
    | "inputSafety"
    | "csrfSession"
    | "exportControls"
    | "loggingSecrets"
    | "dependencyScan"
    | "abuseRateLimit";
  evidence: string;
  holdOwner: string | null;
  status: UnifiedCrmSecurityVerificationStatus;
};

export type UnifiedCrmSecurityVerificationReadModel = {
  checks: UnifiedCrmSecurityVerificationCheck[];
  contractVersion: typeof UNIFIED_CRM_SECURITY_VERIFICATION_CONTRACT_VERSION;
  generatedAt: string;
  state: "PASS" | "HELD";
  visibility: "management";
};

export type UnifiedCrmSecurityVerificationFailureCode =
  | "AUTHENTICATION_REQUIRED"
  | "SECURITY_VERIFICATION_NOT_AUTHORIZED";

const FAILURE_STATUS: Record<UnifiedCrmSecurityVerificationFailureCode, number> = {
  AUTHENTICATION_REQUIRED: 401,
  SECURITY_VERIFICATION_NOT_AUTHORIZED: 403
};

export class UnifiedCrmSecurityVerificationError extends Error {
  readonly code: UnifiedCrmSecurityVerificationFailureCode;
  readonly contractVersion = UNIFIED_CRM_SECURITY_VERIFICATION_ERROR_CONTRACT_VERSION;
  readonly httpStatus: number;
  readonly retryable = false;

  constructor(code: UnifiedCrmSecurityVerificationFailureCode, message: string) {
    super(message);
    this.name = "UnifiedCrmSecurityVerificationError";
    this.code = code;
    this.httpStatus = FAILURE_STATUS[code];
  }
}
