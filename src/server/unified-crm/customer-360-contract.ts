export const UNIFIED_CRM_CUSTOMER_360_CONTRACT_VERSION = "ucrm.customer-360/v1" as const;
export const UNIFIED_CRM_CUSTOMER_360_ERROR_CONTRACT_VERSION = "ucrm.customer-360-error/v1" as const;

export type UnifiedCrmCustomer360Visibility = "organization" | "owned";

export type UnifiedCrmCustomer360Contact = {
  type: string;
  maskedValue: string;
  isPrimary: boolean;
  source: "CONTACT_POINT" | "CUSTOMER_LEGACY";
};

export type UnifiedCrmCustomer360Vehicle = {
  id: string;
  label: string;
  status: string;
  relationshipType: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  sourceHref: string;
};

export type UnifiedCrmCustomer360Appointment = {
  id: string;
  title: string;
  startsAt: string | null;
  bookingStatus: string;
  confirmationStatus: string;
  attendanceStatus: string;
  sourceHref: string;
};

export type UnifiedCrmCustomer360LeadLens = {
  id: string;
  leadNumber: string;
  stage: string;
  sourceCode: string;
  ownerName: string;
  vehicleInterest: string | null;
  nextActionCode: string;
  nextActionAt: string;
  sourceHref: string;
};

export type UnifiedCrmCustomer360CaseLens = {
  id: string;
  caseNumber: string;
  title: string;
  category: string;
  priority: string;
  status: string;
  ownerName: string;
  dueAt: string;
  resolutionDueAt: string | null;
  slaStage: string;
  sourceHref: string;
};

export type UnifiedCrmCustomer360TimelineItem = {
  id: string;
  kind: "interaction" | "task-event" | "appointment-event" | "lead-event" | "case-event" | "promise-event";
  title: string;
  detail: string;
  occurredAt: string;
  actorName: string | null;
  sourceLabel: string;
  sourceHref: string;
};

export type UnifiedCrmCustomer360Note = {
  id: string;
  body: string;
  authorName: string;
  createdAt: string;
  visibility: "INTERNAL" | "RESTRICTED";
};

export type UnifiedCrmCustomer360ReadModel = {
  contractVersion: typeof UNIFIED_CRM_CUSTOMER_360_CONTRACT_VERSION;
  state: "READY";
  visibility: UnifiedCrmCustomer360Visibility;
  generatedAt: string;
  source: {
    authority: "CUSTOMERS";
    label: "Customers";
    href: string;
    readMode: "LIVE_CANONICAL";
    observedAt: string;
  };
  freshness: {
    status: "CURRENT";
    observedAt: string;
    sourceRecordUpdatedAt: string;
  };
  identity: {
    id: string;
    customerNumber: string;
    displayName: string;
    status: "active" | "inactive" | "retired";
    customerSince: string;
  };
  owner: { id: string; name: string } | null;
  contacts: UnifiedCrmCustomer360Contact[];
  preferences: {
    preferredContactMethod: string | null;
    preferredContactTime: string | null;
    languageCode: string | null;
  };
  permissions: {
    canCreateRestrictedNote: boolean;
  };
  relationship: {
    lastInteractionAt: string | null;
    nextActionAt: string | null;
  };
  vehicles: UnifiedCrmCustomer360Vehicle[];
  appointments: UnifiedCrmCustomer360Appointment[];
  notes: UnifiedCrmCustomer360Note[];
  timeline: {
    itemCount: number;
    items: UnifiedCrmCustomer360TimelineItem[];
  };
  sourceLenses: {
    leads: UnifiedCrmCustomer360LeadLens[];
    cases: UnifiedCrmCustomer360CaseLens[];
  };
};

export type UnifiedCrmCustomer360FailureCode =
  | "AUTHENTICATION_REQUIRED"
  | "CUSTOMER_360_NOT_AUTHORIZED"
  | "CUSTOMER_360_OFF"
  | "CUSTOMER_NOT_AVAILABLE"
  | "CUSTOMER_SOURCE_UNAVAILABLE"
  | "INVALID_CUSTOMER_ID"
  | "ORGANIZATION_SCOPE_AMBIGUOUS"
  | "ORGANIZATION_SCOPE_UNAVAILABLE";

const FAILURE_STATUS: Record<UnifiedCrmCustomer360FailureCode, number> = {
  AUTHENTICATION_REQUIRED: 401,
  CUSTOMER_360_NOT_AUTHORIZED: 403,
  CUSTOMER_360_OFF: 503,
  CUSTOMER_NOT_AVAILABLE: 404,
  CUSTOMER_SOURCE_UNAVAILABLE: 503,
  INVALID_CUSTOMER_ID: 400,
  ORGANIZATION_SCOPE_AMBIGUOUS: 409,
  ORGANIZATION_SCOPE_UNAVAILABLE: 403
};

export class UnifiedCrmCustomer360Error extends Error {
  readonly code: UnifiedCrmCustomer360FailureCode;
  readonly contractVersion = UNIFIED_CRM_CUSTOMER_360_ERROR_CONTRACT_VERSION;
  readonly httpStatus: number;
  readonly retryable: boolean;

  constructor(code: UnifiedCrmCustomer360FailureCode, message: string, options: { cause?: unknown } = {}) {
    super(message, options);
    this.name = "UnifiedCrmCustomer360Error";
    this.code = code;
    this.httpStatus = FAILURE_STATUS[code];
    this.retryable = code === "CUSTOMER_SOURCE_UNAVAILABLE";
  }
}
