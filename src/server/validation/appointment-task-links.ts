import {
  APPOINTMENT_TASK_LINK_TYPES,
  type AppointmentTaskLinkType
} from "@/server/appointments/appointment-domain";

const appointmentTaskLinkTypes = new Set<string>(APPOINTMENT_TASK_LINK_TYPES);
const linkCodePattern = /^[A-Z0-9]+(?:_[A-Z0-9]+)*$/;

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

function optionalText(value: string | null | undefined, label: string, maximumLength: number) {
  const normalized = value?.trim() ?? "";

  if (normalized.length > maximumLength) {
    throw new Error(`${label} cannot exceed ${maximumLength} characters.`);
  }

  return normalized || null;
}

function optionalPositiveInteger(value: number | null | undefined, label: string) {
  if (value === null || value === undefined) {
    return null;
  }

  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${label} must be a positive integer.`);
  }

  return value;
}

export type AppointmentTaskLinkInput = {
  appointmentId: string;
  taskId: string;
  linkType: string;
  linkCode: string;
  title: string;
  explanation?: string | null;
  isRequired?: boolean;
  blocksAppointment?: boolean;
  blocksTask?: boolean;
  automationRuleCode?: string | null;
  templateVersion?: number | null;
  createdByUserId?: string | null;
};

export function normalizeAppointmentTaskLink(input: AppointmentTaskLinkInput) {
  if (!appointmentTaskLinkTypes.has(input.linkType)) {
    throw new Error(`Appointment task link type is invalid: "${input.linkType}".`);
  }

  const linkCode = requiredText(input.linkCode, "Appointment task link code", 100).toUpperCase();

  if (!linkCodePattern.test(linkCode)) {
    throw new Error(
      "Appointment task link code must contain uppercase letters, numbers, and single underscores only."
    );
  }

  const automationRuleCode = optionalText(
    input.automationRuleCode,
    "Appointment task link automation rule code",
    100
  )?.toUpperCase();
  const templateVersion = optionalPositiveInteger(
    input.templateVersion,
    "Appointment task link template version"
  );

  if (automationRuleCode && !linkCodePattern.test(automationRuleCode)) {
    throw new Error(
      "Appointment task link automation rule code must contain uppercase letters, numbers, and single underscores only."
    );
  }

  if (automationRuleCode && !templateVersion) {
    throw new Error("An automated appointment task link requires a template version.");
  }

  if (templateVersion && !automationRuleCode) {
    throw new Error("A template-versioned appointment task link requires an automation rule code.");
  }

  const linkType = input.linkType as AppointmentTaskLinkType;
  const blocksAppointment = input.blocksAppointment ?? false;
  const blocksTask = input.blocksTask ?? false;

  if (linkType === "REFERENCE" && (blocksAppointment || blocksTask)) {
    throw new Error("Reference appointment task links cannot block appointment or task progress.");
  }

  if (linkType === "SOURCE" && blocksTask) {
    throw new Error("A source appointment link cannot block its source task by default.");
  }

  return {
    appointmentId: requiredText(input.appointmentId, "Appointment task link appointment", 100),
    taskId: requiredText(input.taskId, "Appointment task link task", 100),
    linkType,
    linkCode,
    title: requiredText(input.title, "Appointment task link title", 160),
    explanation: optionalText(input.explanation, "Appointment task link explanation", 1200),
    isRequired: input.isRequired ?? false,
    blocksAppointment,
    blocksTask,
    automationRuleCode,
    templateVersion,
    createdByUserId: optionalText(
      input.createdByUserId,
      "Appointment task link creator",
      100
    )
  };
}
