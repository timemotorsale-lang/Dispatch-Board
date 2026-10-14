export const UNIFIED_CRM_RELIABILITY_VERIFICATION_CONTRACT_VERSION = "ucrm.reliability-verification/v1" as const;
export const UNIFIED_CRM_RELIABILITY_VERIFICATION_ERROR_CONTRACT_VERSION = "ucrm.reliability-verification-error/v1" as const;

export type UnifiedCrmReliabilityVerificationStatus = "PASS" | "HOLD";

export type UnifiedCrmReliabilityVerificationCheck = {
  category:
    | "staleWrites"
    | "idempotencyReuse"
    | "transactionFailure"
    | "retries"
    | "projectionLag"
    | "unavailableDependencies"
    | "jobLeases"
    | "recoveryBehavior";
  evidence: string;
  holdOwner: string | null;
  status: UnifiedCrmReliabilityVerificationStatus;
};

export type UnifiedCrmReliabilityVerificationReadModel = {
  checks: UnifiedCrmReliabilityVerificationCheck[];
  contractVersion: typeof UNIFIED_CRM_RELIABILITY_VERIFICATION_CONTRACT_VERSION;
  generatedAt: string;
  state: "PASS" | "HELD";
  visibility: "management";
};

export type UnifiedCrmReliabilityVerificationFailureCode =
  | "AUTHENTICATION_REQUIRED"
  | "RELIABILITY_VERIFICATION_NOT_AUTHORIZED";

const FAILURE_STATUS: Record<UnifiedCrmReliabilityVerificationFailureCode, number> = {
  AUTHENTICATION_REQUIRED: 401,
  RELIABILITY_VERIFICATION_NOT_AUTHORIZED: 403
};

export class UnifiedCrmReliabilityVerificationError extends Error {
  readonly code: UnifiedCrmReliabilityVerificationFailureCode;
  readonly contractVersion = UNIFIED_CRM_RELIABILITY_VERIFICATION_ERROR_CONTRACT_VERSION;
  readonly httpStatus: number;
  readonly retryable = false;

  constructor(code: UnifiedCrmReliabilityVerificationFailureCode, message: string) {
    super(message);
    this.name = "UnifiedCrmReliabilityVerificationError";
    this.code = code;
    this.httpStatus = FAILURE_STATUS[code];
  }
}
