export const UNIFIED_CRM_OPPORTUNITY_APPOINTMENT_BRIDGE_COMMAND = "CRM_OPPORTUNITY_APPOINTMENT_BRIDGE_CREATE_DRAFT" as const;
export const UNIFIED_CRM_OPPORTUNITY_APPOINTMENT_BRIDGE_CONTRACT_VERSION = "ucrm.opportunity-appointment-bridge/v1" as const;
export const UNIFIED_CRM_OPPORTUNITY_APPOINTMENT_BRIDGE_ERROR_CONTRACT_VERSION = "ucrm.opportunity-appointment-bridge-error/v1" as const;

export type UnifiedCrmOpportunityAppointmentBridgeCommandInput = {
  appointmentNumber: string;
  expectedVersion: number;
  idempotencyKey: string;
  locationId: string;
  schedulingTimezone: string;
  startsAt?: string | null;
  endsAt?: string | null;
  title: string;
};

export type UnifiedCrmOpportunityAppointmentBridgeCommandResult = {
  appointment: {
    href: string;
    id: string;
    appointmentNumber: string;
    version: number;
  };
  contractVersion: typeof UNIFIED_CRM_OPPORTUNITY_APPOINTMENT_BRIDGE_CONTRACT_VERSION;
  duplicate: boolean;
  opportunityId: string;
};

export type UnifiedCrmOpportunityAppointmentBridgeFailureCode =
  | "AUTHENTICATION_REQUIRED"
  | "APPOINTMENT_BRIDGE_NOT_AUTHORIZED"
  | "APPOINTMENT_BRIDGE_OFF"
  | "OPPORTUNITY_NOT_AVAILABLE"
  | "OPPORTUNITY_VERSION_CONFLICT"
  | "INVALID_APPOINTMENT_BRIDGE_COMMAND"
  | "IDEMPOTENCY_KEY_REUSED"
  | "APPOINTMENT_SOURCE_UNAVAILABLE"
  | "ORGANIZATION_SCOPE_AMBIGUOUS"
  | "ORGANIZATION_SCOPE_UNAVAILABLE";

const FAILURE_STATUS: Record<UnifiedCrmOpportunityAppointmentBridgeFailureCode, number> = {
  AUTHENTICATION_REQUIRED: 401,
  APPOINTMENT_BRIDGE_NOT_AUTHORIZED: 403,
  APPOINTMENT_BRIDGE_OFF: 503,
  OPPORTUNITY_NOT_AVAILABLE: 404,
  OPPORTUNITY_VERSION_CONFLICT: 409,
  INVALID_APPOINTMENT_BRIDGE_COMMAND: 400,
  IDEMPOTENCY_KEY_REUSED: 409,
  APPOINTMENT_SOURCE_UNAVAILABLE: 503,
  ORGANIZATION_SCOPE_AMBIGUOUS: 409,
  ORGANIZATION_SCOPE_UNAVAILABLE: 403
};

export class UnifiedCrmOpportunityAppointmentBridgeError extends Error {
  readonly code: UnifiedCrmOpportunityAppointmentBridgeFailureCode;
  readonly contractVersion = UNIFIED_CRM_OPPORTUNITY_APPOINTMENT_BRIDGE_ERROR_CONTRACT_VERSION;
  readonly httpStatus: number;
  readonly retryable: boolean;

  constructor(code: UnifiedCrmOpportunityAppointmentBridgeFailureCode, message: string, options: { cause?: unknown } = {}) {
    super(message, options);
    this.name = "UnifiedCrmOpportunityAppointmentBridgeError";
    this.code = code;
    this.httpStatus = FAILURE_STATUS[code];
    this.retryable = code === "APPOINTMENT_SOURCE_UNAVAILABLE";
  }
}
