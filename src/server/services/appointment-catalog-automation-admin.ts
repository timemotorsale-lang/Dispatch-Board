import type { AuthenticatedUser } from "@/server/auth/store";
import {
  INITIAL_APPOINTMENT_TEMPLATE_DEFINITIONS,
  type AppointmentTemplateDefinition,
  type AppointmentTemplateTaskBlueprint
} from "@/server/appointments/appointment-template-domain";
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
  "AUTOMATION_SIMULATED"
] as const;

export type AppointmentAutomationSimulationInput = {
  purposeCode: string;
  outcomeCode: string;
  followUpDispositionCode: string;
  missingRequiredFields?: string[];
};

export type AppointmentCatalogAutomationAdmin = ReturnType<typeof buildAppointmentCatalogAutomationAdmin>;

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

function normalizeCode(value: unknown, label: string) {
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";

  if (!normalized) {
    throw new Error(`${label} is required.`);
  }

  return normalized;
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

function getOutcomeBlueprints(template: AppointmentTemplateDefinition) {
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

function buildAutomationRule(template: AppointmentTemplateDefinition, trigger: string) {
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

function buildAppointmentCatalogAutomationAdmin() {
  const templates = getCatalogTemplates();
  const purposes = templates.map(buildPurpose);
  const outcomeCodes = uniqueSorted(templates.flatMap((template) => template.outcomeCodes));
  const followUpDispositionCodes = uniqueSorted([
    ...templates.flatMap((template) => template.followUpDispositionCodes),
    ...liveFollowUpDispositionCodes
  ]);
  const reasonCodes = uniqueSorted([
    ...operationalReasonCodes,
    ...templates.flatMap((template) => template.hardConflictCodes),
    ...templates.flatMap((template) => template.warningCodes)
  ]);
  const automationRules = templates.flatMap((template) =>
    template.automationTriggers.map((trigger) => buildAutomationRule(template, trigger))
  );

  return {
    purposes,
    catalogs: {
      outcomeCodes,
      followUpDispositionCodes,
      reasonCodes
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
      taskBlueprintCount: templates.reduce(
        (total, template) => total + template.taskBlueprints.length,
        0
      ),
      outcomeCodeCount: outcomeCodes.length,
      followUpDispositionCodeCount: followUpDispositionCodes.length,
      reasonCodeCount: reasonCodes.length
    }
  };
}

function buildGeneratedTaskActions(input: {
  template: AppointmentTemplateDefinition;
  followUpDispositionCode: string;
}) {
  const blueprintActions = getOutcomeBlueprints(input.template).map((blueprint) => ({
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

export function simulateAppointmentCatalogAutomation(input: AppointmentAutomationSimulationInput) {
  const purposeCode = normalizeCode(input.purposeCode, "Purpose code");
  const outcomeCode = normalizeCode(input.outcomeCode, "Outcome code");
  const followUpDispositionCode = normalizeCode(
    input.followUpDispositionCode,
    "Follow-up disposition code"
  );
  const template = getCatalogTemplates().find((candidate) => candidate.code === purposeCode);

  if (!template) {
    throw new Error("Appointment purpose is not configured.");
  }

  const validOutcome = template.outcomeCodes.includes(outcomeCode);
  const validFollowUpDisposition = [
    ...template.followUpDispositionCodes,
    ...liveFollowUpDispositionCodes
  ].includes(followUpDispositionCode);
  const missingRequiredFields = uniqueSorted(
    (input.missingRequiredFields ?? [])
      .map((field) => field.trim())
      .filter(Boolean)
  );
  const hasMissingInput = missingRequiredFields.length > 0;
  const blocked =
    hasMissingInput && template.missingInputBehavior === "BLOCK_AUTOMATION";
  const generatedTaskActions = blocked
    ? []
    : buildGeneratedTaskActions({ template, followUpDispositionCode });
  const generatedAppointmentAction =
    !blocked && isFollowUpAppointmentDisposition(followUpDispositionCode)
      ? {
          source: "FOLLOW_UP_DISPOSITION" as const,
          title: `${template.name} follow-up appointment`,
          status: hasMissingInput ? "DRAFT_PENDING_INPUT" : "DRAFT_READY",
          reason: `Follow-up disposition ${followUpDispositionCode} requires a scheduled next appointment.`
        }
      : null;

  return {
    purpose: buildPurpose(template),
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
      behavior: template.missingInputBehavior,
      hasMissingInput,
      blocked,
      createsDraftAppointment:
        hasMissingInput && template.missingInputBehavior === "CREATE_DRAFT",
      createsReviewItem:
        hasMissingInput && template.missingInputBehavior === "CREATE_REVIEW_ITEM"
    },
    actions: {
      generatedTaskActions,
      generatedAppointmentAction,
      managerReviewRequired:
        followUpDispositionCode === "MANAGER_REVIEW_REQUIRED" ||
        (hasMissingInput && template.missingInputBehavior === "CREATE_REVIEW_ITEM"),
      auditReasonCode: "AUTOMATION_SIMULATED"
    }
  };
}

export async function getAppointmentCatalogAutomationAdminForManager(
  user: AuthenticatedUser | null
) {
  assertCanManageCatalogAutomation(user);

  return buildAppointmentCatalogAutomationAdmin();
}

export async function simulateAppointmentCatalogAutomationForManager(
  user: AuthenticatedUser | null,
  input: AppointmentAutomationSimulationInput
) {
  assertCanManageCatalogAutomation(user);

  return simulateAppointmentCatalogAutomation(input);
}
