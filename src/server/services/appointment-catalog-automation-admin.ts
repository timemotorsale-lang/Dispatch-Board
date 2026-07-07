import type { Prisma } from "@prisma/client";

import {
  APPOINTMENT_TEMPLATE_CATEGORIES,
  INITIAL_APPOINTMENT_TEMPLATE_DEFINITIONS,
  type AppointmentTemplateApprovalMode,
  type AppointmentTemplateCategory,
  type AppointmentTemplateDefinition,
  type AppointmentTemplateMissingInputBehavior,
  type AppointmentTemplateTaskBlueprint
} from "@/server/appointments/appointment-template-domain";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import type { AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";
import { canManageSettings } from "@/server/policies/access";
import { validateAppointmentTemplateCatalog } from "@/server/validation/appointment-template";

const liveFollowUpDispositionCodes = [
  "NO_FOLLOW_UP_REQUIRED",
  "CALLBACK_REQUIRED",
  "FOLLOW_UP_APPOINTMENT_REQUIRED",
  "TASK_CREATED",
  "MANAGER_REVIEW_REQUIRED"
] as const;

const operationalReasonCodes = [
  "UNSCHEDULED_DRAFT_SCHEDULED",
  "APPOINTMENT_OWNER_TRANSFERRED",
  "OUTCOME_RECORDED",
  "CUSTOMER_NO_SHOW",
  "CUSTOMER_REQUEST",
  "RESOURCE_WARNING_OVERRIDDEN",
  "STAFF_WARNING_OVERRIDDEN",
  "AUTOMATION_SIMULATED",
  "CATALOG_DRAFT_UPDATED",
  "CATALOG_VERSION_ACTIVATED"
] as const;

const editableApprovalModes = [
  "OWNER_CAN_SCHEDULE",
  "MANAGER_RECOMMENDED",
  "MANAGER_REQUIRED",
  "RULE_DEPENDENT"
] as const satisfies AppointmentTemplateApprovalMode[];

type AppointmentCatalogVersionStatus = "DRAFT" | "ACTIVE" | "RETIRED";
type AppointmentCatalogChangeAction =
  | "SEEDED"
  | "DRAFT_CREATED"
  | "DRAFT_UPDATED"
  | "ACTIVATED"
  | "RETIRED";

type AppointmentCatalogApprovalStatus =
  | "NOT_REQUIRED"
  | "PENDING_REVIEW"
  | "APPROVED"
  | "CHANGES_REQUESTED"
  | "REJECTED";

type AppointmentCatalogCodeType = "OUTCOME" | "FOLLOW_UP_DISPOSITION" | "REASON";

export type AppointmentAutomationSimulationInput = {
  purposeCode: string;
  outcomeCode: string;
  followUpDispositionCode: string;
  missingRequiredFields?: string[];
};

export type AppointmentCatalogCodeDetail = {
  code: string;
  type: AppointmentCatalogCodeType;
  label: string;
  description: string;
  systemRequired: boolean;
  deprecated: boolean;
  replacementCode: string | null;
  deprecatedReason: string | null;
  deprecatedAt: string | null;
};

type AppointmentCatalogPurpose = ReturnType<typeof buildPurpose>;
type AppointmentCatalogCore = ReturnType<typeof buildAppointmentCatalogCore>;

export type AppointmentCatalogVersionSummary = {
  id: string | null;
  organizationId: string;
  version: number;
  status: AppointmentCatalogVersionStatus | "BASELINE";
  title: string;
  description: string | null;
  reason: string;
  createdByUserId: string | null;
  activatedByUserId: string | null;
  activatedAt: string | null;
  retiredAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type AppointmentCatalogChangeEventSummary = {
  id: string;
  catalogVersionId: string;
  action: AppointmentCatalogChangeAction;
  reason: string;
  actorUserId: string | null;
  occurredAt: string;
};

export type AppointmentCatalogValidationSummary = {
  isValid: boolean;
  errors: string[];
  warnings: string[];
};

export type AppointmentCatalogApprovalSummary = {
  status: AppointmentCatalogApprovalStatus;
  requiredApproverRoleName: "General Manager";
  reason: string | null;
  reviewedByUserId: string | null;
  reviewedAt: string | null;
  activationBlocked: boolean;
};

export type AppointmentCatalogPurposeUsageSummary = {
  purposeCode: string;
  active: boolean;
  automationRuleCount: number;
  enabledAutomationRuleCount: number;
  taskBlueprintCount: number;
  outcomeCodeCount: number;
  followUpDispositionCodeCount: number;
  referenceCount: number;
  deleteRisk: "DRAFT_ONLY" | "PUBLISHED_REFERENCES";
  recommendation: "DELETE_ALLOWED" | "DEPRECATE_INSTEAD" | "REVIEW_BEFORE_CHANGE";
  warnings: string[];
};

export type AppointmentCatalogAutomationAdmin = AppointmentCatalogCore & {
  versioning: {
    organizationId: string;
    displayedSource: "BASELINE" | "ACTIVE" | "DRAFT";
    activeVersion: AppointmentCatalogVersionSummary | null;
    draftVersion: AppointmentCatalogVersionSummary | null;
    displayedVersion: AppointmentCatalogVersionSummary;
    validation: AppointmentCatalogValidationSummary;
    approval: AppointmentCatalogApprovalSummary;
    recentChanges: AppointmentCatalogChangeEventSummary[];
  };
  purposeUsage: AppointmentCatalogPurposeUsageSummary[];
  editor: {
    canEdit: true;
    reasonMinimumCharacters: number;
    activationRequiresValidDraft: true;
    activationRequiresApproval: true;
    editableApprovalModes: AppointmentTemplateApprovalMode[];
  };
};

export type AppointmentCatalogPurposeDraftInput = {
  purposeCode: string;
  reason: string;
  changes: {
    name?: string;
    description?: string;
    isActive?: boolean;
    defaultDurationMinutes?: number;
    minimumDurationMinutes?: number;
    maximumDurationMinutes?: number;
    preparationBufferMinutes?: number;
    cleanupBufferMinutes?: number;
    startIntervalMinutes?: number;
    minimumNoticeMinutes?: number;
    bookingHorizonDays?: number;
    approvalMode?: AppointmentTemplateApprovalMode;
    missingInputBehavior?: AppointmentTemplateMissingInputBehavior;
    outcomeCodes?: string[];
    followUpDispositionCodes?: string[];
    reasonCodes?: string[];
  };
};

export type AppointmentCatalogActivateInput = {
  reason: string;
};

export type AppointmentCatalogApprovalReviewInput = {
  action: "APPROVE" | "REQUEST_CHANGES" | "REJECT";
  reason: string;
};

export type AppointmentCatalogCodeEditorInput = {
  catalog: AppointmentCatalogCodeType;
  action: "ADD" | "RENAME" | "REMOVE" | "DEPRECATE" | "REACTIVATE";
  purposeCode?: string;
  code: string;
  nextCode?: string;
  replacementCode?: string;
  label?: string;
  description?: string;
  reason: string;
};

export type AppointmentCatalogPurposeLifecycleInput =
  | {
      action: "CREATE";
      purposeCode: string;
      name: string;
      reason: string;
      sourcePurposeCode?: string;
      category?: AppointmentTemplateCategory;
    }
  | {
      action: "DUPLICATE";
      purposeCode: string;
      name: string;
      reason: string;
      sourcePurposeCode: string;
    }
  | {
      action: "DEPRECATE" | "REACTIVATE" | "DELETE";
      purposeCode: string;
      reason: string;
    };

type AppointmentCatalogVersionRecord = {
  id: string;
  organizationId: string;
  version: number;
  status: AppointmentCatalogVersionStatus;
  title: string;
  description: string | null;
  reason: string;
  catalogSnapshot: unknown;
  validationSnapshot: unknown;
  createdByUserId: string | null;
  activatedByUserId: string | null;
  activatedAt: Date | null;
  retiredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type AppointmentCatalogChangeEventRecord = {
  id: string;
  catalogVersionId: string;
  action: AppointmentCatalogChangeAction;
  reason: string;
  actorUserId: string | null;
  occurredAt: Date;
};

export type AppointmentCatalogAutomationAdminRepository = {
  getActiveVersion(organizationId: string): Promise<AppointmentCatalogVersionRecord | null>;
  getDraftVersion(organizationId: string): Promise<AppointmentCatalogVersionRecord | null>;
  getLatestVersionNumber(organizationId: string): Promise<number>;
  listRecentChanges(
    organizationId: string,
    limit: number
  ): Promise<AppointmentCatalogChangeEventRecord[]>;
  createDraftVersion(input: {
    organizationId: string;
    version: number;
    title: string;
    description: string | null;
    reason: string;
    actorUserId: string;
    catalogSnapshot: AppointmentCatalogCore;
    validationSnapshot: AppointmentCatalogValidationSummary;
    action: AppointmentCatalogChangeAction;
  }): Promise<AppointmentCatalogVersionRecord>;
  updateDraftVersion(input: {
    draftVersionId: string;
    organizationId: string;
    title: string;
    description: string | null;
    reason: string;
    actorUserId: string;
    priorSnapshot: unknown;
    catalogSnapshot: AppointmentCatalogCore;
    validationSnapshot: AppointmentCatalogValidationSummary;
  }): Promise<AppointmentCatalogVersionRecord>;
  activateDraftVersion(input: {
    draftVersionId: string;
    organizationId: string;
    reason: string;
    actorUserId: string;
    priorSnapshot: unknown;
    catalogSnapshot: AppointmentCatalogCore;
    validationSnapshot: AppointmentCatalogValidationSummary;
  }): Promise<AppointmentCatalogVersionRecord>;
};

function assertCanManageCatalogAutomation(user: AuthenticatedUser | null): asserts user is AuthenticatedUser {
  if (!user) {
    throw new Error("Authentication required.");
  }

  if (!canManageSettings(user)) {
    throw new Error("Manager access required.");
  }
}

function uniqueSorted(values: string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function labelFromCode(code: string) {
  return code
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function codeDetailKey(type: AppointmentCatalogCodeType, code: string) {
  return `${type}:${code}`;
}

function systemRequiredCodesByType(type: AppointmentCatalogCodeType) {
  if (type === "FOLLOW_UP_DISPOSITION") {
    return new Set<string>(liveFollowUpDispositionCodes);
  }

  if (type === "REASON") {
    return new Set<string>(operationalReasonCodes);
  }

  return new Set<string>();
}

function normalizeCode(value: unknown, label: string) {
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";

  if (!normalized) {
    throw new Error(`${label} is required.`);
  }

  return normalized;
}

function normalizeOptionalText(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeCatalogCodeType(value: unknown) {
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";

  if (
    normalized !== "OUTCOME" &&
    normalized !== "FOLLOW_UP_DISPOSITION" &&
    normalized !== "REASON"
  ) {
    throw new Error("Catalog code type is not supported.");
  }

  return normalized as AppointmentCatalogCodeType;
}

function normalizeReason(reason: unknown, label = "Change reason") {
  const normalized = typeof reason === "string" ? reason.trim() : "";

  if (normalized.length < 8) {
    throw new Error(`${label} must document the reason in at least 8 characters.`);
  }

  return normalized;
}

function normalizePositiveInteger(value: unknown, label: string, fallback: number) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const normalized = Number(value);

  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw new Error(`${label} must be a positive whole number.`);
  }

  return normalized;
}

function normalizeBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeCodeList(values: unknown, label: string, fallback: string[]) {
  if (values === undefined || values === null) {
    return [...fallback];
  }

  if (!Array.isArray(values)) {
    throw new Error(`${label} must be a list of codes.`);
  }

  const normalized = values.map((value) => normalizeCode(value, label));

  if (normalized.length === 0) {
    throw new Error(`${label} must include at least one code.`);
  }

  return uniqueSorted(normalized);
}

function normalizeApprovalMode(value: unknown, fallback: AppointmentTemplateApprovalMode) {
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : fallback;

  if (!editableApprovalModes.includes(normalized as AppointmentTemplateApprovalMode)) {
    throw new Error("Approval mode is not supported.");
  }

  return normalized as AppointmentTemplateApprovalMode;
}

function normalizeMissingInputBehavior(
  value: unknown,
  fallback: AppointmentTemplateMissingInputBehavior
) {
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : fallback;
  const allowed: AppointmentTemplateMissingInputBehavior[] = [
    "CREATE_DRAFT",
    "CREATE_REVIEW_ITEM",
    "BLOCK_AUTOMATION"
  ];

  if (!allowed.includes(normalized as AppointmentTemplateMissingInputBehavior)) {
    throw new Error("Missing-input behavior is not supported.");
  }

  return normalized as AppointmentTemplateMissingInputBehavior;
}

function normalizeCategory(value: unknown, fallback: AppointmentTemplateCategory) {
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : fallback;

  if (!APPOINTMENT_TEMPLATE_CATEGORIES.includes(normalized as AppointmentTemplateCategory)) {
    throw new Error("Appointment purpose category is not supported.");
  }

  return normalized as AppointmentTemplateCategory;
}

function toIso(value: Date | null) {
  return value ? value.toISOString() : null;
}

function getCatalogTemplates() {
  return validateAppointmentTemplateCatalog([...INITIAL_APPOINTMENT_TEMPLATE_DEFINITIONS]);
}

function isFollowUpAppointmentDisposition(code: string) {
  return code === "FOLLOW_UP_APPOINTMENT_REQUIRED" || code === "SCHEDULE_NEXT_APPOINTMENT";
}

function isTaskGeneratingDisposition(code: string) {
  return ["CALLBACK_REQUIRED", "CALL_CUSTOMER", "CREATE_TASK", "TASK_CREATED", "MANAGER_REVIEW_REQUIRED"].includes(code);
}

function getOutcomeBlueprints(template: Pick<AppointmentCatalogPurpose, "taskBlueprints">) {
  return template.taskBlueprints.filter((blueprint) =>
    ["ON_OUTCOME", "ON_COMPLETION"].includes(blueprint.creationTiming)
  );
}

function buildPurpose(template: AppointmentTemplateDefinition) {
  return {
    code: template.code,
    name: template.name,
    description: template.description,
    category: template.category,
    version: template.version,
    isActive: template.isActive,
    defaultDurationMinutes: template.defaultDurationMinutes,
    minimumDurationMinutes: template.minimumDurationMinutes,
    maximumDurationMinutes: template.maximumDurationMinutes,
    preparationBufferMinutes: template.preparationBufferMinutes,
    cleanupBufferMinutes: template.cleanupBufferMinutes,
    startIntervalMinutes: template.startIntervalMinutes,
    minimumNoticeMinutes: template.minimumNoticeMinutes,
    bookingHorizonDays: template.bookingHorizonDays,
    approvalMode: template.approvalMode,
    missingInputBehavior: template.missingInputBehavior,
    dataSensitivity: template.dataSensitivity,
    eligibleOwnerRoleNames: [...template.eligibleOwnerRoleNames],
    requiredParticipantTypes: [...template.requiredParticipantTypes],
    requiredResourceTypeCodes: [...template.requiredResourceTypeCodes],
    requiredContextFields: [...template.requiredContextFields],
    hardConflictCodes: [...template.hardConflictCodes],
    warningCodes: [...template.warningCodes],
    outcomeCodes: [...template.outcomeCodes],
    followUpDispositionCodes: uniqueSorted([
      ...template.followUpDispositionCodes,
      ...liveFollowUpDispositionCodes
    ]),
    taskBlueprints: template.taskBlueprints.map((blueprint) => ({ ...blueprint })),
    automationTriggers: [...template.automationTriggers],
    reportingDimensions: [...template.reportingDimensions],
    approvedByRoleName: template.approvedByRoleName
  };
}

function buildAutomationRule(
  template: Pick<
    AppointmentCatalogPurpose,
    | "code"
    | "name"
    | "isActive"
    | "approvalMode"
    | "missingInputBehavior"
    | "dataSensitivity"
    | "taskBlueprints"
    | "automationTriggers"
  >,
  trigger: string
) {
  const outcomeBlueprints = getOutcomeBlueprints(template);

  return {
    id: `${template.code}:${trigger}`,
    purposeCode: template.code,
    purposeName: template.name,
    trigger,
    enabled: template.isActive,
    approvalMode: template.approvalMode,
    missingInputBehavior: template.missingInputBehavior,
    dataSensitivity: template.dataSensitivity,
    createsDraftAppointment: template.missingInputBehavior === "CREATE_DRAFT",
    createsReviewItem: template.missingInputBehavior === "CREATE_REVIEW_ITEM",
    blocksWhenMissingInput: template.missingInputBehavior === "BLOCK_AUTOMATION",
    taskBlueprintCount: template.taskBlueprints.length,
    outcomeBlueprintCount: outcomeBlueprints.length,
    generatedTaskBlueprints: outcomeBlueprints.map((blueprint) => ({ ...blueprint }))
  };
}

function buildCodeDetails(input: {
  outcomeCodes: string[];
  followUpDispositionCodes: string[];
  reasonCodes: string[];
  existingDetails?: Record<string, AppointmentCatalogCodeDetail>;
}) {
  const details: Record<string, AppointmentCatalogCodeDetail> = {};

  for (const [type, codes] of [
    ["OUTCOME", input.outcomeCodes],
    ["FOLLOW_UP_DISPOSITION", input.followUpDispositionCodes],
    ["REASON", input.reasonCodes]
  ] as const) {
    const systemRequiredCodes = systemRequiredCodesByType(type);

    for (const code of codes) {
      const key = codeDetailKey(type, code);
      const existing = input.existingDetails?.[key];

      details[key] = {
        code,
        type,
        label: normalizeOptionalText(existing?.label, labelFromCode(code)),
        description: normalizeOptionalText(
          existing?.description,
          `${labelFromCode(code)} catalog code.`
        ),
        systemRequired: existing?.systemRequired ?? systemRequiredCodes.has(code),
        deprecated: existing?.deprecated ?? false,
        replacementCode: existing?.replacementCode ?? null,
        deprecatedReason: existing?.deprecatedReason ?? null,
        deprecatedAt: existing?.deprecatedAt ?? null
      };
    }
  }

  return details;
}

function buildAppointmentCatalogCore(input?: {
  purposes?: AppointmentCatalogPurpose[];
  reasonCodes?: string[];
  codeDetails?: Record<string, AppointmentCatalogCodeDetail>;
}) {
  const templates = getCatalogTemplates();
  const purposes = input?.purposes ?? templates.map(buildPurpose);
  const outcomeCodes = uniqueSorted(purposes.flatMap((purpose) => purpose.outcomeCodes));
  const followUpDispositionCodes = uniqueSorted([
    ...purposes.flatMap((purpose) => purpose.followUpDispositionCodes),
    ...liveFollowUpDispositionCodes
  ]);
  const reasonCodes = uniqueSorted([
    ...operationalReasonCodes,
    ...(input?.reasonCodes ?? []),
    ...purposes.flatMap((purpose) => purpose.hardConflictCodes),
    ...purposes.flatMap((purpose) => purpose.warningCodes)
  ]);
  const codeDetails = buildCodeDetails({
    outcomeCodes,
    followUpDispositionCodes,
    reasonCodes,
    existingDetails: input?.codeDetails
  });
  const automationRules = purposes.flatMap((purpose) =>
    purpose.automationTriggers.map((trigger) => buildAutomationRule(purpose, trigger))
  );

  return {
    purposes,
    catalogs: {
      outcomeCodes,
      followUpDispositionCodes,
      reasonCodes,
      codeDetails
    },
    automationRules,
    governance: {
      purposeCount: purposes.length,
      activePurposeCount: purposes.filter((purpose) => purpose.isActive).length,
      managerRequiredPurposeCount: purposes.filter(
        (purpose) => purpose.approvalMode === "MANAGER_REQUIRED"
      ).length,
      automationRuleCount: automationRules.length,
      enabledAutomationRuleCount: automationRules.filter((rule) => rule.enabled).length,
      taskBlueprintCount: purposes.reduce(
        (total, purpose) => total + purpose.taskBlueprints.length,
        0
      ),
      outcomeCodeCount: outcomeCodes.length,
      followUpDispositionCodeCount: followUpDispositionCodes.length,
      reasonCodeCount: reasonCodes.length
    }
  };
}

function getBaselineCatalogCore() {
  return buildAppointmentCatalogCore();
}

function looksLikePurpose(value: unknown): value is AppointmentCatalogPurpose {
  if (!value || typeof value !== "object") {
    return false;
  }

  const purpose = value as Partial<AppointmentCatalogPurpose>;

  return Boolean(
    purpose.code &&
      purpose.name &&
      Array.isArray(purpose.outcomeCodes) &&
      Array.isArray(purpose.followUpDispositionCodes) &&
      Array.isArray(purpose.taskBlueprints) &&
      Array.isArray(purpose.automationTriggers)
  );
}

function normalizeCatalogSnapshot(value: unknown) {
  if (!value || typeof value !== "object") {
    return getBaselineCatalogCore();
  }

  const candidate = value as Partial<AppointmentCatalogCore>;
  const purposes = Array.isArray(candidate.purposes)
    ? candidate.purposes.filter(looksLikePurpose)
    : [];
  const codeDetails =
    candidate.catalogs &&
    typeof candidate.catalogs === "object" &&
    "codeDetails" in candidate.catalogs &&
    candidate.catalogs.codeDetails &&
    typeof candidate.catalogs.codeDetails === "object" &&
    !Array.isArray(candidate.catalogs.codeDetails)
      ? (candidate.catalogs.codeDetails as Record<string, AppointmentCatalogCodeDetail>)
      : undefined;

  if (purposes.length === 0) {
    return getBaselineCatalogCore();
  }

  return buildAppointmentCatalogCore({
    purposes,
    reasonCodes: Array.isArray(candidate.catalogs?.reasonCodes)
      ? candidate.catalogs.reasonCodes.filter((code): code is string => typeof code === "string")
      : [],
    codeDetails
  });
}

function validateCatalogCore(catalog: AppointmentCatalogCore): AppointmentCatalogValidationSummary {
  const errors: string[] = [];
  const warnings: string[] = [];
  const purposeCodes = new Set<string>();

  for (const purpose of catalog.purposes) {
    if (purposeCodes.has(purpose.code)) {
      errors.push(`Duplicate appointment purpose code: ${purpose.code}.`);
    }
    purposeCodes.add(purpose.code);

    if (!purpose.name.trim()) {
      errors.push(`${purpose.code} must have a name.`);
    }

    if (purpose.minimumDurationMinutes > purpose.defaultDurationMinutes) {
      errors.push(`${purpose.code} minimum duration cannot exceed default duration.`);
    }

    if (purpose.defaultDurationMinutes > purpose.maximumDurationMinutes) {
      errors.push(`${purpose.code} default duration cannot exceed maximum duration.`);
    }

    if (purpose.startIntervalMinutes > purpose.defaultDurationMinutes) {
      warnings.push(`${purpose.code} start interval is longer than the default duration.`);
    }

    if (purpose.outcomeCodes.length === 0) {
      errors.push(`${purpose.code} must include at least one outcome code.`);
    }

    if (purpose.followUpDispositionCodes.length === 0) {
      errors.push(`${purpose.code} must include at least one follow-up disposition code.`);
    }

    for (const [type, codes] of [
      ["OUTCOME", purpose.outcomeCodes],
      ["FOLLOW_UP_DISPOSITION", purpose.followUpDispositionCodes]
    ] as const) {
      for (const code of codes) {
        const detail = catalog.catalogs.codeDetails[codeDetailKey(type, code)];

        if (detail?.deprecated) {
          warnings.push(
            `${purpose.code} still references deprecated ${type.toLowerCase()} code ${code}.`
          );
        }
      }
    }

    if (purpose.automationTriggers.length === 0) {
      warnings.push(`${purpose.code} does not have an automation trigger.`);
    }
  }

  for (const [label, codes] of [
    ["outcome", catalog.catalogs.outcomeCodes],
    ["follow-up disposition", catalog.catalogs.followUpDispositionCodes],
    ["reason", catalog.catalogs.reasonCodes]
  ] as const) {
    const seen = new Set<string>();

    for (const code of codes) {
      if (seen.has(code)) {
        errors.push(`Duplicate ${label} code: ${code}.`);
      }
      seen.add(code);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

function buildApprovalSummary(input?: {
  status?: AppointmentCatalogApprovalStatus;
  reason?: string | null;
  reviewedByUserId?: string | null;
  reviewedAt?: string | null;
}): AppointmentCatalogApprovalSummary {
  const status = input?.status ?? "PENDING_REVIEW";

  return {
    status,
    requiredApproverRoleName: "General Manager",
    reason: input?.reason ?? null,
    reviewedByUserId: input?.reviewedByUserId ?? null,
    reviewedAt: input?.reviewedAt ?? null,
    activationBlocked: status !== "APPROVED"
  };
}

function isApprovalStatus(value: unknown): value is AppointmentCatalogApprovalStatus {
  return (
    value === "NOT_REQUIRED" ||
    value === "PENDING_REVIEW" ||
    value === "APPROVED" ||
    value === "CHANGES_REQUESTED" ||
    value === "REJECTED"
  );
}

function extractApprovalSummary(
  validationSnapshot: unknown,
  fallbackStatus: AppointmentCatalogApprovalStatus
) {
  if (!validationSnapshot || typeof validationSnapshot !== "object") {
    return buildApprovalSummary({ status: fallbackStatus });
  }

  const candidate = validationSnapshot as {
    approval?: Partial<AppointmentCatalogApprovalSummary>;
  };
  const approval = candidate.approval;

  return buildApprovalSummary({
    status: isApprovalStatus(approval?.status) ? approval.status : fallbackStatus,
    reason: typeof approval?.reason === "string" ? approval.reason : null,
    reviewedByUserId:
      typeof approval?.reviewedByUserId === "string" ? approval.reviewedByUserId : null,
    reviewedAt: typeof approval?.reviewedAt === "string" ? approval.reviewedAt : null
  });
}

function withApprovalSnapshot(
  validation: AppointmentCatalogValidationSummary,
  approval: AppointmentCatalogApprovalSummary
) {
  return {
    ...validation,
    approval
  };
}

function buildPurposeUsageSummaries(input: {
  catalog: AppointmentCatalogCore;
  publishedPurposeCodes: Set<string>;
}): AppointmentCatalogPurposeUsageSummary[] {
  return input.catalog.purposes.map((purpose) => {
    const automationRules = input.catalog.automationRules.filter(
      (rule) => rule.purposeCode === purpose.code
    );
    const enabledAutomationRuleCount = automationRules.filter((rule) => rule.enabled).length;
    const referenceCount =
      automationRules.length +
      purpose.taskBlueprints.length +
      purpose.outcomeCodes.length +
      purpose.followUpDispositionCodes.length;
    const isPublished = input.publishedPurposeCodes.has(purpose.code);
    const warnings = [
      isPublished
        ? "Published purpose may be referenced by existing appointments or audit history."
        : null,
      enabledAutomationRuleCount > 0
        ? "Enabled automation hooks reference this purpose."
        : null,
      purpose.taskBlueprints.length > 0
        ? "Task blueprints will be affected by lifecycle changes."
        : null
    ].filter((warning): warning is string => Boolean(warning));

    return {
      purposeCode: purpose.code,
      active: purpose.isActive,
      automationRuleCount: automationRules.length,
      enabledAutomationRuleCount,
      taskBlueprintCount: purpose.taskBlueprints.length,
      outcomeCodeCount: purpose.outcomeCodes.length,
      followUpDispositionCodeCount: purpose.followUpDispositionCodes.length,
      referenceCount,
      deleteRisk: isPublished ? "PUBLISHED_REFERENCES" : "DRAFT_ONLY",
      recommendation: isPublished
        ? "DEPRECATE_INSTEAD"
        : referenceCount > 0
          ? "REVIEW_BEFORE_CHANGE"
          : "DELETE_ALLOWED",
      warnings
    };
  });
}

function summarizeVersion(
  record: AppointmentCatalogVersionRecord | null,
  fallback?: AppointmentCatalogVersionSummary
): AppointmentCatalogVersionSummary | null {
  if (!record) {
    return fallback ?? null;
  }

  return {
    id: record.id,
    organizationId: record.organizationId,
    version: record.version,
    status: record.status,
    title: record.title,
    description: record.description,
    reason: record.reason,
    createdByUserId: record.createdByUserId,
    activatedByUserId: record.activatedByUserId,
    activatedAt: toIso(record.activatedAt),
    retiredAt: toIso(record.retiredAt),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString()
  };
}

function baselineVersionSummary(): AppointmentCatalogVersionSummary {
  return {
    id: null,
    organizationId: INITIAL_ORGANIZATION.id,
    version: 1,
    status: "BASELINE",
    title: "Day-one enterprise appointment catalog",
    description: "Code-defined baseline catalog used until an active catalog version is published.",
    reason: "Initial approved enterprise catalog baseline.",
    createdByUserId: null,
    activatedByUserId: null,
    activatedAt: null,
    retiredAt: null,
    createdAt: null,
    updatedAt: null
  };
}

function summarizeChangeEvent(
  event: AppointmentCatalogChangeEventRecord
): AppointmentCatalogChangeEventSummary {
  return {
    id: event.id,
    catalogVersionId: event.catalogVersionId,
    action: event.action,
    reason: event.reason,
    actorUserId: event.actorUserId,
    occurredAt: event.occurredAt.toISOString()
  };
}

function buildAdminModel(input: {
  activeVersion: AppointmentCatalogVersionRecord | null;
  draftVersion: AppointmentCatalogVersionRecord | null;
  recentChanges: AppointmentCatalogChangeEventRecord[];
}) {
  const activeCatalog = input.activeVersion
    ? normalizeCatalogSnapshot(input.activeVersion.catalogSnapshot)
    : getBaselineCatalogCore();
  const displayedCatalog = input.draftVersion
    ? normalizeCatalogSnapshot(input.draftVersion.catalogSnapshot)
    : activeCatalog;
  const validation = validateCatalogCore(displayedCatalog);
  const activeVersion = summarizeVersion(input.activeVersion);
  const draftVersion = summarizeVersion(input.draftVersion);
  const displayedVersion =
    draftVersion ?? activeVersion ?? baselineVersionSummary();
  const approval = input.draftVersion
    ? extractApprovalSummary(input.draftVersion.validationSnapshot, "PENDING_REVIEW")
    : input.activeVersion
      ? extractApprovalSummary(input.activeVersion.validationSnapshot, "APPROVED")
      : buildApprovalSummary({ status: "NOT_REQUIRED" });
  const purposeUsage = buildPurposeUsageSummaries({
    catalog: displayedCatalog,
    publishedPurposeCodes: getPublishedPurposeCodes(input.activeVersion)
  });

  return {
    ...displayedCatalog,
    versioning: {
      organizationId: INITIAL_ORGANIZATION.id,
      displayedSource: input.draftVersion ? "DRAFT" : input.activeVersion ? "ACTIVE" : "BASELINE",
      activeVersion,
      draftVersion,
      displayedVersion,
      validation,
      approval,
      recentChanges: input.recentChanges.map(summarizeChangeEvent)
    },
    purposeUsage,
    editor: {
      canEdit: true,
      reasonMinimumCharacters: 8,
      activationRequiresValidDraft: true,
      activationRequiresApproval: true,
      editableApprovalModes: [...editableApprovalModes]
    }
  } satisfies AppointmentCatalogAutomationAdmin;
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function isCatalogPersistenceUnavailable(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  return (
    message.includes("AppointmentCatalogVersion") ||
    message.includes("AppointmentCatalogChangeEvent") ||
    message.includes("does not exist") ||
    message.includes("Unknown field")
  );
}

function unavailableCatalogPersistenceError() {
  return new Error(
    "Appointment catalog persistence is not available until the Prisma client is regenerated and the catalog migration is applied."
  );
}

function selectCatalogVersion() {
  return {
    id: true,
    organizationId: true,
    version: true,
    status: true,
    title: true,
    description: true,
    reason: true,
    catalogSnapshot: true,
    validationSnapshot: true,
    createdByUserId: true,
    activatedByUserId: true,
    activatedAt: true,
    retiredAt: true,
    createdAt: true,
    updatedAt: true
  } as const;
}

export function createAppointmentCatalogAutomationAdminRepository(): AppointmentCatalogAutomationAdminRepository {
  const catalogPrisma = prisma as typeof prisma & {
    appointmentCatalogVersion: {
      findFirst: (input: unknown) => Promise<AppointmentCatalogVersionRecord | null>;
      create: (input: unknown) => Promise<AppointmentCatalogVersionRecord>;
      update: (input: unknown) => Promise<AppointmentCatalogVersionRecord>;
      updateMany: (input: unknown) => Promise<unknown>;
    };
    appointmentCatalogChangeEvent: {
      findMany: (input: unknown) => Promise<AppointmentCatalogChangeEventRecord[]>;
      create: (input: unknown) => Promise<unknown>;
    };
    $transaction: <T>(callback: (transaction: {
      appointmentCatalogVersion: {
        create: (input: unknown) => Promise<AppointmentCatalogVersionRecord>;
        update: (input: unknown) => Promise<AppointmentCatalogVersionRecord>;
        updateMany: (input: unknown) => Promise<unknown>;
      };
      appointmentCatalogChangeEvent: {
        create: (input: unknown) => Promise<unknown>;
      };
    }) => Promise<T>) => Promise<T>;
  };
  const hasCatalogDelegates = Boolean(
    catalogPrisma.appointmentCatalogVersion && catalogPrisma.appointmentCatalogChangeEvent
  );

  return {
    async getActiveVersion(organizationId) {
      if (!hasCatalogDelegates) {
        return null;
      }

      try {
        return await catalogPrisma.appointmentCatalogVersion.findFirst({
          where: { organizationId, status: "ACTIVE" },
          select: selectCatalogVersion(),
          orderBy: [{ version: "desc" }]
        });
      } catch (error) {
        if (isCatalogPersistenceUnavailable(error)) {
          return null;
        }

        throw error;
      }
    },
    async getDraftVersion(organizationId) {
      if (!hasCatalogDelegates) {
        return null;
      }

      try {
        return await catalogPrisma.appointmentCatalogVersion.findFirst({
          where: { organizationId, status: "DRAFT" },
          select: selectCatalogVersion(),
          orderBy: [{ version: "desc" }]
        });
      } catch (error) {
        if (isCatalogPersistenceUnavailable(error)) {
          return null;
        }

        throw error;
      }
    },
    async getLatestVersionNumber(organizationId) {
      if (!hasCatalogDelegates) {
        return 0;
      }

      let latest: { version: number } | null;

      try {
        latest = (await catalogPrisma.appointmentCatalogVersion.findFirst({
          where: { organizationId },
          select: { version: true },
          orderBy: [{ version: "desc" }]
        })) as { version: number } | null;
      } catch (error) {
        if (isCatalogPersistenceUnavailable(error)) {
          return 0;
        }

        throw error;
      }

      return latest?.version ?? 0;
    },
    async listRecentChanges(organizationId, limit) {
      if (!hasCatalogDelegates) {
        return [];
      }

      try {
        return await catalogPrisma.appointmentCatalogChangeEvent.findMany({
          where: { organizationId },
          select: {
            id: true,
            catalogVersionId: true,
            action: true,
            reason: true,
            actorUserId: true,
            occurredAt: true
          },
          orderBy: [{ occurredAt: "desc" }],
          take: limit
        });
      } catch (error) {
        if (isCatalogPersistenceUnavailable(error)) {
          return [];
        }

        throw error;
      }
    },
    async createDraftVersion(input) {
      if (!hasCatalogDelegates) {
        throw unavailableCatalogPersistenceError();
      }

      return catalogPrisma.$transaction(async (transaction) => {
        const version = await transaction.appointmentCatalogVersion.create({
          data: {
            organizationId: input.organizationId,
            version: input.version,
            status: "DRAFT",
            title: input.title,
            description: input.description,
            reason: input.reason,
            createdByUserId: input.actorUserId,
            catalogSnapshot: toJsonValue(input.catalogSnapshot),
            validationSnapshot: toJsonValue(input.validationSnapshot)
          },
          select: selectCatalogVersion()
        });

        await transaction.appointmentCatalogChangeEvent.create({
          data: {
            catalogVersionId: version.id,
            organizationId: input.organizationId,
            actorUserId: input.actorUserId,
            action: input.action,
            reason: input.reason,
            newSnapshot: toJsonValue(input.catalogSnapshot),
            validationSnapshot: toJsonValue(input.validationSnapshot)
          }
        });

        return version;
      });
    },
    async updateDraftVersion(input) {
      if (!hasCatalogDelegates) {
        throw unavailableCatalogPersistenceError();
      }

      return catalogPrisma.$transaction(async (transaction) => {
        const version = await transaction.appointmentCatalogVersion.update({
          where: {
            id: input.draftVersionId,
            organizationId: input.organizationId,
            status: "DRAFT"
          },
          data: {
            title: input.title,
            description: input.description,
            reason: input.reason,
            catalogSnapshot: toJsonValue(input.catalogSnapshot),
            validationSnapshot: toJsonValue(input.validationSnapshot)
          },
          select: selectCatalogVersion()
        });

        await transaction.appointmentCatalogChangeEvent.create({
          data: {
            catalogVersionId: version.id,
            organizationId: input.organizationId,
            actorUserId: input.actorUserId,
            action: "DRAFT_UPDATED",
            reason: input.reason,
            priorSnapshot: toJsonValue(input.priorSnapshot),
            newSnapshot: toJsonValue(input.catalogSnapshot),
            validationSnapshot: toJsonValue(input.validationSnapshot)
          }
        });

        return version;
      });
    },
    async activateDraftVersion(input) {
      if (!hasCatalogDelegates) {
        throw unavailableCatalogPersistenceError();
      }

      return catalogPrisma.$transaction(async (transaction) => {
        await transaction.appointmentCatalogVersion.updateMany({
          where: {
            organizationId: input.organizationId,
            status: "ACTIVE"
          },
          data: {
            status: "RETIRED",
            retiredAt: new Date()
          }
        });

        const version = await transaction.appointmentCatalogVersion.update({
          where: {
            id: input.draftVersionId,
            organizationId: input.organizationId,
            status: "DRAFT"
          },
          data: {
            status: "ACTIVE",
            reason: input.reason,
            activatedByUserId: input.actorUserId,
            activatedAt: new Date(),
            catalogSnapshot: toJsonValue(input.catalogSnapshot),
            validationSnapshot: toJsonValue(input.validationSnapshot)
          },
          select: selectCatalogVersion()
        });

        await transaction.appointmentCatalogChangeEvent.create({
          data: {
            catalogVersionId: version.id,
            organizationId: input.organizationId,
            actorUserId: input.actorUserId,
            action: "ACTIVATED",
            reason: input.reason,
            priorSnapshot: toJsonValue(input.priorSnapshot),
            newSnapshot: toJsonValue(input.catalogSnapshot),
            validationSnapshot: toJsonValue(input.validationSnapshot)
          }
        });

        return version;
      });
    }
  };
}

async function loadAdminModel(repository: AppointmentCatalogAutomationAdminRepository) {
  const organizationId = INITIAL_ORGANIZATION.id;
  const [activeVersion, draftVersion, recentChanges] = await Promise.all([
    repository.getActiveVersion(organizationId),
    repository.getDraftVersion(organizationId),
    repository.listRecentChanges(organizationId, 8)
  ]);

  return buildAdminModel({
    activeVersion,
    draftVersion,
    recentChanges
  });
}

function buildLifecyclePurpose(input: {
  source?: AppointmentCatalogPurpose;
  purposeCode: string;
  name: string;
  category?: AppointmentTemplateCategory;
}): AppointmentCatalogPurpose {
  const source = input.source ?? getBaselineCatalogCore().purposes[0];

  return {
    ...source,
    code: input.purposeCode,
    name: input.name,
    description: input.source
      ? `Duplicated from ${source.code}. ${source.description}`
      : "Manager-created appointment purpose awaiting final enterprise governance review.",
    category: input.category ?? source.category,
    version: 1,
    isActive: true,
    taskBlueprints: source.taskBlueprints.map((blueprint) => ({
      ...blueprint,
      code: `${input.purposeCode}-${blueprint.code}`.slice(0, 96)
    })),
    automationTriggers: uniqueSorted(source.automationTriggers.length > 0
      ? source.automationTriggers
      : ["MANUAL_MANAGER_REVIEW"])
  };
}

function getPublishedPurposeCodes(activeVersion: AppointmentCatalogVersionRecord | null) {
  const publishedCatalog = activeVersion
    ? normalizeCatalogSnapshot(activeVersion.catalogSnapshot)
    : getBaselineCatalogCore();

  return new Set(publishedCatalog.purposes.map((purpose) => purpose.code));
}

function applyPurposeLifecycleChange(input: {
  catalog: AppointmentCatalogCore;
  lifecycle: AppointmentCatalogPurposeLifecycleInput;
  publishedPurposeCodes: Set<string>;
}) {
  const action = input.lifecycle.action;
  const purposeCode = normalizeCode(input.lifecycle.purposeCode, "Purpose code");
  const existingPurpose = input.catalog.purposes.find(
    (candidate) => candidate.code === purposeCode
  );

  if (action === "CREATE" || action === "DUPLICATE") {
    if (existingPurpose) {
      throw new Error("Appointment purpose code is already configured.");
    }

    const sourcePurposeCode =
      "sourcePurposeCode" in input.lifecycle && input.lifecycle.sourcePurposeCode
        ? normalizeCode(input.lifecycle.sourcePurposeCode, "Source purpose code")
        : null;
    const sourcePurpose = sourcePurposeCode
      ? input.catalog.purposes.find((candidate) => candidate.code === sourcePurposeCode)
      : undefined;

    if (sourcePurposeCode && !sourcePurpose) {
      throw new Error("Source appointment purpose is not configured.");
    }

    const name = normalizeOptionalText(input.lifecycle.name, "");

    if (!name) {
      throw new Error("Purpose name is required.");
    }

    const purpose = buildLifecyclePurpose({
      source: sourcePurpose,
      purposeCode,
      name,
      category:
        action === "CREATE"
          ? normalizeCategory(input.lifecycle.category, sourcePurpose?.category ?? "GENERAL")
          : sourcePurpose?.category
    });

    return buildAppointmentCatalogCore({
      purposes: uniqueSorted([...input.catalog.purposes.map((purpose) => purpose.code), purpose.code])
        .map((code) =>
          code === purpose.code
            ? purpose
            : input.catalog.purposes.find((candidate) => candidate.code === code)
        )
        .filter((purpose): purpose is AppointmentCatalogPurpose => Boolean(purpose)),
      reasonCodes: input.catalog.catalogs.reasonCodes,
      codeDetails: input.catalog.catalogs.codeDetails
    });
  }

  if (!existingPurpose) {
    throw new Error("Appointment purpose is not configured.");
  }

  if (action === "DELETE") {
    if (input.publishedPurposeCodes.has(existingPurpose.code)) {
      throw new Error(
        "Published appointment purposes cannot be deleted because existing appointments may reference them. Deprecate the purpose instead."
      );
    }

    return buildAppointmentCatalogCore({
      purposes: input.catalog.purposes.filter((purpose) => purpose.code !== existingPurpose.code),
      reasonCodes: input.catalog.catalogs.reasonCodes,
      codeDetails: input.catalog.catalogs.codeDetails
    });
  }

  const isActive = action === "REACTIVATE";

  return buildAppointmentCatalogCore({
    purposes: input.catalog.purposes.map((purpose) =>
      purpose.code === existingPurpose.code ? { ...purpose, isActive } : purpose
    ),
    reasonCodes: input.catalog.catalogs.reasonCodes,
    codeDetails: input.catalog.catalogs.codeDetails
  });
}

function applyPurposeDraftChange(
  catalog: AppointmentCatalogCore,
  input: AppointmentCatalogPurposeDraftInput
) {
  const purposeCode = normalizeCode(input.purposeCode, "Purpose code");
  const purpose = catalog.purposes.find((candidate) => candidate.code === purposeCode);

  if (!purpose) {
    throw new Error("Appointment purpose is not configured.");
  }

  const changes = input.changes ?? {};
  const nextOutcomeCodes = normalizeCodeList(changes.outcomeCodes, "Outcome codes", purpose.outcomeCodes);
  const nextFollowUpDispositionCodes = normalizeCodeList(
    changes.followUpDispositionCodes,
    "Follow-up disposition codes",
    purpose.followUpDispositionCodes
  );

  for (const [type, codes, currentCodes] of [
    ["OUTCOME", nextOutcomeCodes, purpose.outcomeCodes],
    ["FOLLOW_UP_DISPOSITION", nextFollowUpDispositionCodes, purpose.followUpDispositionCodes]
  ] as const) {
    for (const code of codes) {
      const detail = catalog.catalogs.codeDetails[codeDetailKey(type, code)];

      if (detail?.deprecated && !currentCodes.includes(code)) {
        throw new Error(`Deprecated ${type.toLowerCase()} code ${code} cannot be added to new configuration.`);
      }
    }
  }

  const nextPurpose: AppointmentCatalogPurpose = {
    ...purpose,
    name: normalizeOptionalText(changes.name, purpose.name),
    description: normalizeOptionalText(changes.description, purpose.description),
    isActive: normalizeBoolean(changes.isActive, purpose.isActive),
    defaultDurationMinutes: normalizePositiveInteger(
      changes.defaultDurationMinutes,
      "Default duration",
      purpose.defaultDurationMinutes
    ),
    minimumDurationMinutes: normalizePositiveInteger(
      changes.minimumDurationMinutes,
      "Minimum duration",
      purpose.minimumDurationMinutes
    ),
    maximumDurationMinutes: normalizePositiveInteger(
      changes.maximumDurationMinutes,
      "Maximum duration",
      purpose.maximumDurationMinutes
    ),
    preparationBufferMinutes: normalizePositiveInteger(
      changes.preparationBufferMinutes,
      "Preparation buffer",
      purpose.preparationBufferMinutes
    ),
    cleanupBufferMinutes: normalizePositiveInteger(
      changes.cleanupBufferMinutes,
      "Cleanup buffer",
      purpose.cleanupBufferMinutes
    ),
    startIntervalMinutes: normalizePositiveInteger(
      changes.startIntervalMinutes,
      "Start interval",
      purpose.startIntervalMinutes
    ),
    minimumNoticeMinutes: normalizePositiveInteger(
      changes.minimumNoticeMinutes,
      "Minimum notice",
      purpose.minimumNoticeMinutes
    ),
    bookingHorizonDays: normalizePositiveInteger(
      changes.bookingHorizonDays,
      "Booking horizon",
      purpose.bookingHorizonDays
    ),
    approvalMode: normalizeApprovalMode(changes.approvalMode, purpose.approvalMode),
    missingInputBehavior: normalizeMissingInputBehavior(
      changes.missingInputBehavior,
      purpose.missingInputBehavior
    ),
    outcomeCodes: nextOutcomeCodes,
    followUpDispositionCodes: nextFollowUpDispositionCodes
  };

  return buildAppointmentCatalogCore({
    purposes: catalog.purposes.map((candidate) =>
      candidate.code === purposeCode ? nextPurpose : candidate
    ),
    reasonCodes: normalizeCodeList(
      changes.reasonCodes,
      "Reason codes",
      catalog.catalogs.reasonCodes
    ),
    codeDetails: catalog.catalogs.codeDetails
  });
}

function applyCatalogCodeEditorChange(
  catalog: AppointmentCatalogCore,
  input: AppointmentCatalogCodeEditorInput
) {
  const catalogType = normalizeCatalogCodeType(input.catalog);
  const action = input.action;
  const code = normalizeCode(input.code, "Catalog code");
  const nextCode =
    action === "RENAME" ? normalizeCode(input.nextCode, "Replacement catalog code") : code;
  const replacementCode =
    action === "DEPRECATE" && input.replacementCode
      ? normalizeCode(input.replacementCode, "Replacement catalog code")
      : null;
  const label = normalizeOptionalText(input.label, labelFromCode(nextCode));
  const description = normalizeOptionalText(
    input.description,
    `${labelFromCode(nextCode)} catalog code.`
  );
  const codeDetails = { ...catalog.catalogs.codeDetails };

  function upsertCodeDetail(type: AppointmentCatalogCodeType, detailCode: string) {
    const key = codeDetailKey(type, detailCode);
    const existing = codeDetails[key];

    codeDetails[key] = {
      code: detailCode,
      type,
      label,
      description,
      systemRequired: existing?.systemRequired ?? systemRequiredCodesByType(type).has(detailCode),
      deprecated: existing?.deprecated ?? false,
      replacementCode: existing?.replacementCode ?? null,
      deprecatedReason: existing?.deprecatedReason ?? null,
      deprecatedAt: existing?.deprecatedAt ?? null
    };
  }

  function removeCodeDetail(type: AppointmentCatalogCodeType, detailCode: string) {
    delete codeDetails[codeDetailKey(type, detailCode)];
  }

  function setDeprecatedCodeDetail(input: {
    type: AppointmentCatalogCodeType;
    detailCode: string;
    deprecated: boolean;
    reason: string;
  }) {
    const key = codeDetailKey(input.type, input.detailCode);
    const existing = codeDetails[key];

    if (!existing) {
      throw new Error("Catalog code detail is not configured.");
    }

    if (input.deprecated && replacementCode) {
      const replacement = codeDetails[codeDetailKey(input.type, replacementCode)];

      if (!replacement || replacement.deprecated) {
        throw new Error("Replacement catalog code must be configured and active.");
      }
    }

    codeDetails[key] = {
      ...existing,
      deprecated: input.deprecated,
      replacementCode: input.deprecated ? replacementCode : null,
      deprecatedReason: input.deprecated ? normalizeReason(input.reason, "Deprecation reason") : null,
      deprecatedAt: input.deprecated ? new Date().toISOString() : null
    };
  }

  if (catalogType === "REASON") {
    if (
      systemRequiredCodesByType("REASON").has(code) &&
      ["RENAME", "REMOVE", "DEPRECATE"].includes(action)
    ) {
      throw new Error("System-required reason codes cannot be renamed, removed, or deprecated.");
    }

    const reasonCodes = [...catalog.catalogs.reasonCodes];
    const exists = reasonCodes.includes(code);

    if (action === "ADD") {
      if (exists) {
        throw new Error("Reason code is already configured.");
      }
      upsertCodeDetail("REASON", code);

      return buildAppointmentCatalogCore({
        purposes: catalog.purposes,
        reasonCodes: [...reasonCodes, code],
        codeDetails
      });
    }

    if (!exists) {
      throw new Error("Reason code is not configured.");
    }

    if (action === "DEPRECATE" || action === "REACTIVATE") {
      setDeprecatedCodeDetail({
        type: "REASON",
        detailCode: code,
        deprecated: action === "DEPRECATE",
        reason: input.reason
      });

      return buildAppointmentCatalogCore({
        purposes: catalog.purposes,
        reasonCodes,
        codeDetails
      });
    }

    if (action === "REMOVE") {
      removeCodeDetail("REASON", code);

      return buildAppointmentCatalogCore({
        purposes: catalog.purposes,
        reasonCodes: reasonCodes.filter((candidate) => candidate !== code),
        codeDetails
      });
    }

    if (reasonCodes.includes(nextCode)) {
      throw new Error("Replacement reason code is already configured.");
    }

    removeCodeDetail("REASON", code);
    upsertCodeDetail("REASON", nextCode);

    return buildAppointmentCatalogCore({
      purposes: catalog.purposes,
      reasonCodes: reasonCodes.map((candidate) => (candidate === code ? nextCode : candidate)),
      codeDetails
    });
  }

  const purposeCode = normalizeCode(input.purposeCode, "Purpose code");
  const purpose = catalog.purposes.find((candidate) => candidate.code === purposeCode);

  if (!purpose) {
    throw new Error("Appointment purpose is not configured.");
  }

  const field = catalogType === "OUTCOME" ? "outcomeCodes" : "followUpDispositionCodes";
  const values = [...purpose[field]];
  const exists = values.includes(code);

  if (action === "ADD") {
    if (exists) {
      throw new Error("Catalog code is already configured for this purpose.");
    }
    const existingDetail = codeDetails[codeDetailKey(catalogType, code)];

    if (existingDetail?.deprecated) {
      throw new Error("Deprecated catalog codes cannot be added to new configuration.");
    }
    upsertCodeDetail(catalogType, code);

    return buildAppointmentCatalogCore({
      purposes: catalog.purposes.map((candidate) =>
        candidate.code === purpose.code
          ? { ...candidate, [field]: uniqueSorted([...values, code]) }
          : candidate
      ),
      reasonCodes: catalog.catalogs.reasonCodes,
      codeDetails
    });
  }

  if (!exists) {
    throw new Error("Catalog code is not configured for this purpose.");
  }

  if (action === "DEPRECATE" || action === "REACTIVATE") {
    setDeprecatedCodeDetail({
      type: catalogType,
      detailCode: code,
      deprecated: action === "DEPRECATE",
      reason: input.reason
    });

    return buildAppointmentCatalogCore({
      purposes: catalog.purposes,
      reasonCodes: catalog.catalogs.reasonCodes,
      codeDetails
    });
  }

  if (action === "REMOVE") {
    if (values.length <= 1) {
      throw new Error("Each purpose must keep at least one configured code.");
    }
    removeCodeDetail(catalogType, code);

    return buildAppointmentCatalogCore({
      purposes: catalog.purposes.map((candidate) =>
        candidate.code === purpose.code
          ? { ...candidate, [field]: values.filter((candidateCode) => candidateCode !== code) }
          : candidate
      ),
      reasonCodes: catalog.catalogs.reasonCodes,
      codeDetails
    });
  }

  if (values.includes(nextCode)) {
    throw new Error("Replacement catalog code is already configured for this purpose.");
  }

  removeCodeDetail(catalogType, code);
  upsertCodeDetail(catalogType, nextCode);

  return buildAppointmentCatalogCore({
    purposes: catalog.purposes.map((candidate) =>
      candidate.code === purpose.code
        ? {
            ...candidate,
            [field]: uniqueSorted(
              values.map((candidateCode) => (candidateCode === code ? nextCode : candidateCode))
            )
          }
        : candidate
    ),
    reasonCodes: catalog.catalogs.reasonCodes,
    codeDetails
  });
}

function buildGeneratedTaskActions(input: {
  purpose: AppointmentCatalogPurpose;
  followUpDispositionCode: string;
}) {
  const blueprintActions = getOutcomeBlueprints(input.purpose).map((blueprint) => ({
    source: "TEMPLATE_BLUEPRINT" as const,
    code: blueprint.code,
    title: blueprint.title,
    linkType: blueprint.linkType,
    creationTiming: blueprint.creationTiming,
    ownerPolicy: blueprint.ownerPolicy,
    blockingEffect: blueprint.blockingEffect
  }));

  if (!isTaskGeneratingDisposition(input.followUpDispositionCode)) {
    return blueprintActions;
  }

  return [
    ...blueprintActions,
    {
      source: "FOLLOW_UP_DISPOSITION" as const,
      code: `OUTCOME-${input.followUpDispositionCode}`,
      title:
        input.followUpDispositionCode === "MANAGER_REVIEW_REQUIRED"
          ? "Manager review follow-up"
          : "Outcome follow-up task",
      linkType: "FOLLOW_UP" as AppointmentTemplateTaskBlueprint["linkType"],
      creationTiming: "ON_OUTCOME" as AppointmentTemplateTaskBlueprint["creationTiming"],
      ownerPolicy:
        input.followUpDispositionCode === "MANAGER_REVIEW_REQUIRED"
          ? ("MANAGER_REVIEW" as AppointmentTemplateTaskBlueprint["ownerPolicy"])
          : ("APPOINTMENT_OWNER" as AppointmentTemplateTaskBlueprint["ownerPolicy"]),
      blockingEffect: "NONE" as AppointmentTemplateTaskBlueprint["blockingEffect"]
    }
  ];
}

export function simulateAppointmentCatalogAutomation(
  input: AppointmentAutomationSimulationInput,
  catalog: AppointmentCatalogCore = getBaselineCatalogCore()
) {
  const purposeCode = normalizeCode(input.purposeCode, "Purpose code");
  const outcomeCode = normalizeCode(input.outcomeCode, "Outcome code");
  const followUpDispositionCode = normalizeCode(
    input.followUpDispositionCode,
    "Follow-up disposition code"
  );
  const purpose = catalog.purposes.find((candidate) => candidate.code === purposeCode);

  if (!purpose) {
    throw new Error("Appointment purpose is not configured.");
  }

  const validOutcome = purpose.outcomeCodes.includes(outcomeCode);
  const validFollowUpDisposition = [
    ...purpose.followUpDispositionCodes,
    ...liveFollowUpDispositionCodes
  ].includes(followUpDispositionCode);
  const missingRequiredFields = uniqueSorted(
    (input.missingRequiredFields ?? [])
      .map((field) => field.trim())
      .filter(Boolean)
  );
  const hasMissingInput = missingRequiredFields.length > 0;
  const blocked = hasMissingInput && purpose.missingInputBehavior === "BLOCK_AUTOMATION";
  const generatedTaskActions = blocked
    ? []
    : buildGeneratedTaskActions({ purpose, followUpDispositionCode });
  const generatedAppointmentAction =
    !blocked && isFollowUpAppointmentDisposition(followUpDispositionCode)
      ? {
          source: "FOLLOW_UP_DISPOSITION" as const,
          title: `${purpose.name} follow-up appointment`,
          status: hasMissingInput ? "DRAFT_PENDING_INPUT" : "DRAFT_READY",
          reason: `Follow-up disposition ${followUpDispositionCode} requires a scheduled next appointment.`
        }
      : null;

  return {
    purpose,
    input: {
      outcomeCode,
      followUpDispositionCode,
      missingRequiredFields
    },
    validation: {
      validOutcome,
      validFollowUpDisposition,
      warnings: [
        validOutcome ? null : `Outcome ${outcomeCode} is not in the selected purpose catalog.`,
        validFollowUpDisposition
          ? null
          : `Follow-up disposition ${followUpDispositionCode} is not in the selected purpose catalog.`
      ].filter((message): message is string => Boolean(message))
    },
    missingInputBehavior: {
      behavior: purpose.missingInputBehavior,
      hasMissingInput,
      blocked,
      createsDraftAppointment:
        hasMissingInput && purpose.missingInputBehavior === "CREATE_DRAFT",
      createsReviewItem:
        hasMissingInput && purpose.missingInputBehavior === "CREATE_REVIEW_ITEM"
    },
    actions: {
      generatedTaskActions,
      generatedAppointmentAction,
      managerReviewRequired:
        followUpDispositionCode === "MANAGER_REVIEW_REQUIRED" ||
        (hasMissingInput && purpose.missingInputBehavior === "CREATE_REVIEW_ITEM"),
      auditReasonCode: "AUTOMATION_SIMULATED"
    }
  };
}

export async function getAppointmentCatalogAutomationAdminForManager(
  user: AuthenticatedUser | null,
  repository: AppointmentCatalogAutomationAdminRepository = createAppointmentCatalogAutomationAdminRepository()
) {
  assertCanManageCatalogAutomation(user);

  return loadAdminModel(repository);
}

export async function saveAppointmentCatalogDraftForManager(
  user: AuthenticatedUser | null,
  input: AppointmentCatalogPurposeDraftInput,
  repository: AppointmentCatalogAutomationAdminRepository = createAppointmentCatalogAutomationAdminRepository()
) {
  assertCanManageCatalogAutomation(user);

  const organizationId = INITIAL_ORGANIZATION.id;
  const reason = normalizeReason(input.reason);
  const [activeVersion, draftVersion, latestVersionNumber] = await Promise.all([
    repository.getActiveVersion(organizationId),
    repository.getDraftVersion(organizationId),
    repository.getLatestVersionNumber(organizationId)
  ]);
  const currentCatalog = draftVersion
    ? normalizeCatalogSnapshot(draftVersion.catalogSnapshot)
    : activeVersion
      ? normalizeCatalogSnapshot(activeVersion.catalogSnapshot)
      : getBaselineCatalogCore();
  const nextCatalog = applyPurposeDraftChange(currentCatalog, input);
  const validation = validateCatalogCore(nextCatalog);
  const approval = buildApprovalSummary({
    status: "PENDING_REVIEW",
    reason: "Draft changed and requires General Manager approval before activation."
  });

  if (!validation.isValid) {
    throw new Error(`Catalog draft is invalid: ${validation.errors.join(" ")}`);
  }

  if (draftVersion) {
    await repository.updateDraftVersion({
      draftVersionId: draftVersion.id,
      organizationId,
      title: "Draft appointment catalog",
      description: "Manager-edited draft catalog awaiting activation.",
      reason,
      actorUserId: user.id,
      priorSnapshot: draftVersion.catalogSnapshot,
      catalogSnapshot: nextCatalog,
      validationSnapshot: withApprovalSnapshot(validation, approval)
    });
  } else {
    await repository.createDraftVersion({
      organizationId,
      version: Math.max(latestVersionNumber, activeVersion?.version ?? 0, 0) + 1,
      title: "Draft appointment catalog",
      description: "Manager-edited draft catalog awaiting activation.",
      reason,
      actorUserId: user.id,
      catalogSnapshot: nextCatalog,
      validationSnapshot: withApprovalSnapshot(validation, approval),
      action: "DRAFT_CREATED"
    });
  }

  return loadAdminModel(repository);
}

export async function updateAppointmentCatalogPurposeLifecycleForManager(
  user: AuthenticatedUser | null,
  input: AppointmentCatalogPurposeLifecycleInput,
  repository: AppointmentCatalogAutomationAdminRepository = createAppointmentCatalogAutomationAdminRepository()
) {
  assertCanManageCatalogAutomation(user);

  const organizationId = INITIAL_ORGANIZATION.id;
  const reason = normalizeReason(input.reason);
  const [activeVersion, draftVersion, latestVersionNumber] = await Promise.all([
    repository.getActiveVersion(organizationId),
    repository.getDraftVersion(organizationId),
    repository.getLatestVersionNumber(organizationId)
  ]);
  const currentCatalog = draftVersion
    ? normalizeCatalogSnapshot(draftVersion.catalogSnapshot)
    : activeVersion
      ? normalizeCatalogSnapshot(activeVersion.catalogSnapshot)
      : getBaselineCatalogCore();
  const nextCatalog = applyPurposeLifecycleChange({
    catalog: currentCatalog,
    lifecycle: input,
    publishedPurposeCodes: getPublishedPurposeCodes(activeVersion)
  });
  const validation = validateCatalogCore(nextCatalog);
  const approval = buildApprovalSummary({
    status: "PENDING_REVIEW",
    reason: "Lifecycle change requires General Manager approval before activation."
  });

  if (!validation.isValid) {
    throw new Error(`Catalog draft is invalid: ${validation.errors.join(" ")}`);
  }

  const title = "Draft appointment catalog";
  const description = "Manager-edited draft catalog awaiting activation.";

  if (draftVersion) {
    await repository.updateDraftVersion({
      draftVersionId: draftVersion.id,
      organizationId,
      title,
      description,
      reason,
      actorUserId: user.id,
      priorSnapshot: draftVersion.catalogSnapshot,
      catalogSnapshot: nextCatalog,
      validationSnapshot: withApprovalSnapshot(validation, approval)
    });
  } else {
    await repository.createDraftVersion({
      organizationId,
      version: Math.max(latestVersionNumber, activeVersion?.version ?? 0, 0) + 1,
      title,
      description,
      reason,
      actorUserId: user.id,
      catalogSnapshot: nextCatalog,
      validationSnapshot: withApprovalSnapshot(validation, approval),
      action: "DRAFT_CREATED"
    });
  }

  return loadAdminModel(repository);
}

export async function updateAppointmentCatalogCodeForManager(
  user: AuthenticatedUser | null,
  input: AppointmentCatalogCodeEditorInput,
  repository: AppointmentCatalogAutomationAdminRepository = createAppointmentCatalogAutomationAdminRepository()
) {
  assertCanManageCatalogAutomation(user);

  const organizationId = INITIAL_ORGANIZATION.id;
  const reason = normalizeReason(input.reason);
  const [activeVersion, draftVersion, latestVersionNumber] = await Promise.all([
    repository.getActiveVersion(organizationId),
    repository.getDraftVersion(organizationId),
    repository.getLatestVersionNumber(organizationId)
  ]);
  const currentCatalog = draftVersion
    ? normalizeCatalogSnapshot(draftVersion.catalogSnapshot)
    : activeVersion
      ? normalizeCatalogSnapshot(activeVersion.catalogSnapshot)
      : getBaselineCatalogCore();
  const nextCatalog = applyCatalogCodeEditorChange(currentCatalog, input);
  const validation = validateCatalogCore(nextCatalog);
  const approval = buildApprovalSummary({
    status: "PENDING_REVIEW",
    reason: "Catalog code edit requires General Manager approval before activation."
  });

  if (!validation.isValid) {
    throw new Error(`Catalog draft is invalid: ${validation.errors.join(" ")}`);
  }

  const title = "Draft appointment catalog";
  const description = "Manager-edited draft catalog awaiting activation.";

  if (draftVersion) {
    await repository.updateDraftVersion({
      draftVersionId: draftVersion.id,
      organizationId,
      title,
      description,
      reason,
      actorUserId: user.id,
      priorSnapshot: draftVersion.catalogSnapshot,
      catalogSnapshot: nextCatalog,
      validationSnapshot: withApprovalSnapshot(validation, approval)
    });
  } else {
    await repository.createDraftVersion({
      organizationId,
      version: Math.max(latestVersionNumber, activeVersion?.version ?? 0, 0) + 1,
      title,
      description,
      reason,
      actorUserId: user.id,
      catalogSnapshot: nextCatalog,
      validationSnapshot: withApprovalSnapshot(validation, approval),
      action: "DRAFT_CREATED"
    });
  }

  return loadAdminModel(repository);
}

export async function reviewAppointmentCatalogDraftForManager(
  user: AuthenticatedUser | null,
  input: AppointmentCatalogApprovalReviewInput,
  repository: AppointmentCatalogAutomationAdminRepository = createAppointmentCatalogAutomationAdminRepository()
) {
  assertCanManageCatalogAutomation(user);

  const organizationId = INITIAL_ORGANIZATION.id;
  const reason = normalizeReason(input.reason, "Review reason");
  const draftVersion = await repository.getDraftVersion(organizationId);

  if (!draftVersion) {
    throw new Error("No draft catalog version is ready for review.");
  }

  const catalog = normalizeCatalogSnapshot(draftVersion.catalogSnapshot);
  const validation = validateCatalogCore(catalog);
  const statusByAction = {
    APPROVE: "APPROVED",
    REQUEST_CHANGES: "CHANGES_REQUESTED",
    REJECT: "REJECTED"
  } as const satisfies Record<
    AppointmentCatalogApprovalReviewInput["action"],
    AppointmentCatalogApprovalStatus
  >;
  const approval = buildApprovalSummary({
    status: statusByAction[input.action],
    reason,
    reviewedByUserId: user.id,
    reviewedAt: new Date().toISOString()
  });

  await repository.updateDraftVersion({
    draftVersionId: draftVersion.id,
    organizationId,
    title: draftVersion.title,
    description: draftVersion.description,
    reason,
    actorUserId: user.id,
    priorSnapshot: draftVersion.catalogSnapshot,
    catalogSnapshot: catalog,
    validationSnapshot: withApprovalSnapshot(validation, approval)
  });

  return loadAdminModel(repository);
}

export async function activateAppointmentCatalogDraftForManager(
  user: AuthenticatedUser | null,
  input: AppointmentCatalogActivateInput,
  repository: AppointmentCatalogAutomationAdminRepository = createAppointmentCatalogAutomationAdminRepository()
) {
  assertCanManageCatalogAutomation(user);

  const organizationId = INITIAL_ORGANIZATION.id;
  const reason = normalizeReason(input.reason, "Activation reason");
  const draftVersion = await repository.getDraftVersion(organizationId);

  if (!draftVersion) {
    throw new Error("No draft catalog version is ready for activation.");
  }

  const catalog = normalizeCatalogSnapshot(draftVersion.catalogSnapshot);
  const validation = validateCatalogCore(catalog);
  const approval = extractApprovalSummary(draftVersion.validationSnapshot, "PENDING_REVIEW");

  if (!validation.isValid) {
    throw new Error(`Catalog draft is invalid: ${validation.errors.join(" ")}`);
  }

  if (approval.status !== "APPROVED") {
    throw new Error("Catalog draft must be approved before activation.");
  }

  await repository.activateDraftVersion({
    draftVersionId: draftVersion.id,
    organizationId,
    reason,
    actorUserId: user.id,
    priorSnapshot: draftVersion.catalogSnapshot,
    catalogSnapshot: catalog,
    validationSnapshot: withApprovalSnapshot(validation, approval)
  });

  return loadAdminModel(repository);
}

export async function simulateAppointmentCatalogAutomationForManager(
  user: AuthenticatedUser | null,
  input: AppointmentAutomationSimulationInput,
  repository: AppointmentCatalogAutomationAdminRepository = createAppointmentCatalogAutomationAdminRepository()
) {
  assertCanManageCatalogAutomation(user);

  const admin = await loadAdminModel(repository);

  return simulateAppointmentCatalogAutomation(input, admin);
}
