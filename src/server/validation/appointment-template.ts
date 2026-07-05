import {
  APPOINTMENT_TEMPLATE_APPROVAL_MODES,
  APPOINTMENT_TEMPLATE_CATEGORIES,
  APPOINTMENT_TEMPLATE_MISSING_INPUT_BEHAVIORS,
  type AppointmentTemplateDefinition
} from "@/server/appointments/appointment-template-domain";

const templateCategories = new Set<string>(APPOINTMENT_TEMPLATE_CATEGORIES);
const approvalModes = new Set<string>(APPOINTMENT_TEMPLATE_APPROVAL_MODES);
const missingInputBehaviors = new Set<string>(APPOINTMENT_TEMPLATE_MISSING_INPUT_BEHAVIORS);
const templateCodePattern = /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/;
const blueprintCodePattern = /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/;

function requiredText(value: string, label: string, maximumLength: number) {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${label} is required.`);
  }

  if (normalized.length > maximumLength) {
    throw new Error(`${label} cannot exceed ${maximumLength} characters.`);
  }

  return normalized;
}

function positiveInteger(value: number, label: string) {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${label} must be a positive integer.`);
  }

  return value;
}

function nonNegativeInteger(value: number, label: string) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer.`);
  }

  return value;
}

function requiredUniqueList(values: string[], label: string) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error(`${label} must include at least one value.`);
  }

  const normalizedValues = values.map((value) => requiredText(value, label, 120));
  const duplicates = normalizedValues.filter(
    (value, index) => normalizedValues.indexOf(value) !== index
  );

  if (duplicates.length > 0) {
    throw new Error(`${label} contains duplicate values: ${[...new Set(duplicates)].join(", ")}.`);
  }

  return normalizedValues;
}

export function normalizeAppointmentTemplateDefinition(
  input: AppointmentTemplateDefinition
): AppointmentTemplateDefinition {
  const code = requiredText(input.code, "Appointment template code", 64).toUpperCase();

  if (!templateCodePattern.test(code)) {
    throw new Error(
      "Appointment template code must contain uppercase letters, numbers, and single hyphens only."
    );
  }

  if (!templateCategories.has(input.category)) {
    throw new Error(`Appointment template category is invalid: "${input.category}".`);
  }

  if (!approvalModes.has(input.approvalMode)) {
    throw new Error(`Appointment template approval mode is invalid: "${input.approvalMode}".`);
  }

  if (!missingInputBehaviors.has(input.missingInputBehavior)) {
    throw new Error(
      `Appointment template missing-input behavior is invalid: "${input.missingInputBehavior}".`
    );
  }

  const normalized: AppointmentTemplateDefinition = {
    ...input,
    code,
    name: requiredText(input.name, "Appointment template name", 120),
    description: requiredText(input.description, "Appointment template description", 800),
    version: positiveInteger(input.version, "Appointment template version"),
    defaultDurationMinutes: positiveInteger(
      input.defaultDurationMinutes,
      "Appointment template default duration"
    ),
    minimumDurationMinutes: positiveInteger(
      input.minimumDurationMinutes,
      "Appointment template minimum duration"
    ),
    maximumDurationMinutes: positiveInteger(
      input.maximumDurationMinutes,
      "Appointment template maximum duration"
    ),
    preparationBufferMinutes: nonNegativeInteger(
      input.preparationBufferMinutes,
      "Appointment template preparation buffer"
    ),
    cleanupBufferMinutes: nonNegativeInteger(
      input.cleanupBufferMinutes,
      "Appointment template cleanup buffer"
    ),
    startIntervalMinutes: positiveInteger(
      input.startIntervalMinutes,
      "Appointment template start interval"
    ),
    minimumNoticeMinutes: nonNegativeInteger(
      input.minimumNoticeMinutes,
      "Appointment template minimum notice"
    ),
    bookingHorizonDays: positiveInteger(
      input.bookingHorizonDays,
      "Appointment template booking horizon"
    ),
    eligibleOwnerRoleNames: requiredUniqueList(
      input.eligibleOwnerRoleNames,
      "Appointment template eligible owner roles"
    ),
    requiredParticipantTypes: requiredUniqueList(
      input.requiredParticipantTypes,
      "Appointment template participant types"
    ),
    requiredResourceTypeCodes: Array.from(new Set(input.requiredResourceTypeCodes.map((value) => requiredText(value, "Appointment template resource type", 100)))),
    requiredContextFields: requiredUniqueList(
      input.requiredContextFields,
      "Appointment template required context fields"
    ),
    hardConflictCodes: requiredUniqueList(
      input.hardConflictCodes,
      "Appointment template hard conflict codes"
    ),
    warningCodes: requiredUniqueList(
      input.warningCodes,
      "Appointment template warning codes"
    ),
    outcomeCodes: requiredUniqueList(
      input.outcomeCodes,
      "Appointment template outcome codes"
    ),
    followUpDispositionCodes: requiredUniqueList(
      input.followUpDispositionCodes,
      "Appointment template follow-up disposition codes"
    ),
    automationTriggers: requiredUniqueList(
      input.automationTriggers,
      "Appointment template automation triggers"
    ),
    reportingDimensions: requiredUniqueList(
      input.reportingDimensions,
      "Appointment template reporting dimensions"
    ),
    taskBlueprints: input.taskBlueprints.map((blueprint) => {
      const blueprintCode = requiredText(
        blueprint.code,
        "Appointment template task blueprint code",
        80
      ).toUpperCase();

      if (!blueprintCodePattern.test(blueprintCode)) {
        throw new Error(
          "Appointment template task blueprint code must contain uppercase letters, numbers, and single hyphens only."
        );
      }

      return {
        ...blueprint,
        code: blueprintCode,
        title: requiredText(blueprint.title, "Appointment template task blueprint title", 140)
      };
    })
  };

  if (normalized.minimumDurationMinutes > normalized.defaultDurationMinutes) {
    throw new Error("Appointment template minimum duration cannot exceed default duration.");
  }

  if (normalized.defaultDurationMinutes > normalized.maximumDurationMinutes) {
    throw new Error("Appointment template default duration cannot exceed maximum duration.");
  }

  if (normalized.startIntervalMinutes > normalized.defaultDurationMinutes) {
    throw new Error("Appointment template start interval cannot exceed default duration.");
  }

  if (!normalized.isActive && normalized.approvalMode !== "MANAGER_REQUIRED") {
    throw new Error("Inactive appointment templates must remain manager-required until retired.");
  }

  if (normalized.taskBlueprints.length === 0) {
    throw new Error("Appointment template must define at least one linked-task blueprint.");
  }

  return normalized;
}

export function validateAppointmentTemplateCatalog(
  templates: AppointmentTemplateDefinition[]
) {
  const normalizedTemplates = templates.map((template) =>
    normalizeAppointmentTemplateDefinition(template)
  );
  const codes = normalizedTemplates.map((template) => template.code);
  const duplicateCodes = codes.filter((code, index) => codes.indexOf(code) !== index);

  if (duplicateCodes.length > 0) {
    throw new Error(
      `Appointment template catalog contains duplicate codes: ${[
        ...new Set(duplicateCodes)
      ].join(", ")}.`
    );
  }

  const activeTemplates = normalizedTemplates.filter((template) => template.isActive);

  if (activeTemplates.length === 0) {
    throw new Error("Appointment template catalog must include at least one active template.");
  }

  return normalizedTemplates;
}
