export const UNIFIED_CRM_ADMIN_READINESS_HUB_CONTRACT_VERSION = "ucrm.admin-readiness-hub/v1" as const;
export const UNIFIED_CRM_ADMIN_READINESS_HUB_ERROR_CONTRACT_VERSION = "ucrm.admin-readiness-hub-error/v1" as const;

export type UnifiedCrmAdminReadinessHubStatus = "AVAILABLE" | "HELD" | "PLANNED";

export type UnifiedCrmAdminReadinessHubTile = {
  milestoneId: string;
  title: string;
  status: UnifiedCrmAdminReadinessHubStatus;
  summary: string;
  nextDecision: string | null;
  featureControl: string;
};

export type UnifiedCrmAdminReadinessHubControl = {
  area: string;
  auditEventType: string;
  href: string;
  staffVisibility: "ADMIN_ONLY";
  summary: string;
  title: string;
};

export type UnifiedCrmAdminReadinessHubReadModel = {
  adminControls: UnifiedCrmAdminReadinessHubControl[];
  contractVersion: typeof UNIFIED_CRM_ADMIN_READINESS_HUB_CONTRACT_VERSION;
  generatedAt: string;
  groups: {
    title: string;
    tiles: UnifiedCrmAdminReadinessHubTile[];
  }[];
  rollback: {
    fallback: "crm-more-menu-and-direct-readiness-routes";
    featureControl: "crm.admin.readinessHub.enabled";
    posture: "read-only";
  };
  state: "AVAILABLE";
  visibility: "management";
};

export type UnifiedCrmAdminReadinessHubFailureCode =
  | "AUTHENTICATION_REQUIRED"
  | "ADMIN_READINESS_HUB_NOT_AUTHORIZED";

const FAILURE_STATUS: Record<UnifiedCrmAdminReadinessHubFailureCode, number> = {
  AUTHENTICATION_REQUIRED: 401,
  ADMIN_READINESS_HUB_NOT_AUTHORIZED: 403
};

export class UnifiedCrmAdminReadinessHubError extends Error {
  readonly code: UnifiedCrmAdminReadinessHubFailureCode;
  readonly contractVersion = UNIFIED_CRM_ADMIN_READINESS_HUB_ERROR_CONTRACT_VERSION;
  readonly httpStatus: number;
  readonly retryable = false;

  constructor(code: UnifiedCrmAdminReadinessHubFailureCode, message: string) {
    super(message);
    this.name = "UnifiedCrmAdminReadinessHubError";
    this.code = code;
    this.httpStatus = FAILURE_STATUS[code];
  }
}
