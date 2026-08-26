export const UNIFIED_CRM_ACCESSIBILITY_RESPONSIVE_CONTRACT_VERSION = "ucrm.accessibility-responsive/v1" as const;
export const UNIFIED_CRM_ACCESSIBILITY_RESPONSIVE_ERROR_CONTRACT_VERSION = "ucrm.accessibility-responsive-error/v1" as const;

export type UnifiedCrmAccessibilityResponsiveStatus = "PASS" | "HOLD";

export type UnifiedCrmAccessibilityResponsiveCheck = {
  category:
    | "keyboard"
    | "screenReader"
    | "focusBehavior"
    | "errorBehavior"
    | "contrast"
    | "zoom"
    | "desktop"
    | "mobile"
    | "lightDark";
  evidence: string;
  holdOwner: string | null;
  status: UnifiedCrmAccessibilityResponsiveStatus;
};

export type UnifiedCrmAccessibilityResponsiveReadModel = {
  checks: UnifiedCrmAccessibilityResponsiveCheck[];
  contractVersion: typeof UNIFIED_CRM_ACCESSIBILITY_RESPONSIVE_CONTRACT_VERSION;
  generatedAt: string;
  state: "PASS" | "HELD";
  target: "WCAG_2_2_AA";
  visibility: "management";
};

export type UnifiedCrmAccessibilityResponsiveFailureCode =
  | "ACCESSIBILITY_GATE_NOT_AUTHORIZED"
  | "AUTHENTICATION_REQUIRED";

const FAILURE_STATUS: Record<UnifiedCrmAccessibilityResponsiveFailureCode, number> = {
  ACCESSIBILITY_GATE_NOT_AUTHORIZED: 403,
  AUTHENTICATION_REQUIRED: 401
};

export class UnifiedCrmAccessibilityResponsiveError extends Error {
  readonly code: UnifiedCrmAccessibilityResponsiveFailureCode;
  readonly contractVersion = UNIFIED_CRM_ACCESSIBILITY_RESPONSIVE_ERROR_CONTRACT_VERSION;
  readonly httpStatus: number;
  readonly retryable = false;

  constructor(code: UnifiedCrmAccessibilityResponsiveFailureCode, message: string) {
    super(message);
    this.name = "UnifiedCrmAccessibilityResponsiveError";
    this.code = code;
    this.httpStatus = FAILURE_STATUS[code];
  }
}
