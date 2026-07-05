import type {
  AppointmentTemplateApprovalMode,
  AppointmentTemplateDefinition
} from "@/server/appointments/appointment-template-domain";
import { getLocationMinuteOfDay } from "@/server/appointments/location-time-service";

export const APPOINTMENT_DURATION_RULE_LIMITS = {
  minimumDurationMinutes: 5,
  maximumDurationMinutes: 8 * 60,
  maximumBufferMinutes: 4 * 60,
  maximumReservedFootprintMinutes: 12 * 60,
  minimumStartIntervalMinutes: 5,
  maximumStartIntervalMinutes: 2 * 60
} as const;

export type AppointmentDurationOverrideActor = "OWNER" | "MANAGER" | "SYSTEM";

export type AppointmentDurationOverride = {
  durationMinutes?: number;
  preparationBufferMinutes?: number;
  cleanupBufferMinutes?: number;
  reasonCode?: string;
  reasonNote?: string;
};

export type ResolvedAppointmentDurationRule = {
  templateCode: string;
  templateVersion: number;
  approvalMode: AppointmentTemplateApprovalMode;
  durationMinutes: number;
  preparationBufferMinutes: number;
  cleanupBufferMinutes: number;
  startIntervalMinutes: number;
  totalReservedFootprintMinutes: number;
  overrideApplied: boolean;
  managerApprovalRequired: boolean;
  overrideReasonCode: string | null;
  overrideReasonNote: string | null;
};

export type AppointmentTimeFootprint = ResolvedAppointmentDurationRule & {
  appointmentStartsAt: Date;
  appointmentEndsAt: Date;
  resourceWindowStartsAt: Date;
  resourceWindowEndsAt: Date;
};

function assertValidDate(value: Date, label: string) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new Error(`${label} must be a valid date.`);
  }
}

function assertWholeMinutes(value: number, label: string) {
  if (!Number.isInteger(value)) {
    throw new Error(`${label} must be a whole number of minutes.`);
  }
}

function assertDurationRange(input: {
  value: number;
  label: string;
  minimum: number;
  maximum: number;
}) {
  assertWholeMinutes(input.value, input.label);

  if (input.value < input.minimum || input.value > input.maximum) {
    throw new Error(
      `${input.label} must be between ${input.minimum} and ${input.maximum} minutes.`
    );
  }
}

function assertBufferRange(value: number, label: string) {
  assertDurationRange({
    value,
    label,
    minimum: 0,
    maximum: APPOINTMENT_DURATION_RULE_LIMITS.maximumBufferMinutes
  });
}

function trimOptionalText(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function addMinutes(value: Date, minutes: number) {
  return new Date(value.getTime() + minutes * 60 * 1000);
}

function isManagerApprovalRequired(input: {
  approvalMode: AppointmentTemplateApprovalMode;
  overrideApplied: boolean;
  actor: AppointmentDurationOverrideActor;
}) {
  if (!input.overrideApplied) {
    return false;
  }

  if (input.actor === "MANAGER") {
    return false;
  }

  return (
    input.approvalMode === "MANAGER_REQUIRED" ||
    input.approvalMode === "RULE_DEPENDENT"
  );
}

function getOverrideApplied(input: {
  template: AppointmentTemplateDefinition;
  durationMinutes: number;
  preparationBufferMinutes: number;
  cleanupBufferMinutes: number;
}) {
  return (
    input.durationMinutes !== input.template.defaultDurationMinutes ||
    input.preparationBufferMinutes !== input.template.preparationBufferMinutes ||
    input.cleanupBufferMinutes !== input.template.cleanupBufferMinutes
  );
}

export function resolveAppointmentDurationRule(input: {
  template: AppointmentTemplateDefinition;
  override?: AppointmentDurationOverride;
  actor?: AppointmentDurationOverrideActor;
}): ResolvedAppointmentDurationRule {
  const actor = input.actor ?? "OWNER";
  const { template } = input;
  const override = input.override ?? {};

  assertDurationRange({
    value: template.minimumDurationMinutes,
    label: "Appointment template minimum duration",
    minimum: APPOINTMENT_DURATION_RULE_LIMITS.minimumDurationMinutes,
    maximum: APPOINTMENT_DURATION_RULE_LIMITS.maximumDurationMinutes
  });
  assertDurationRange({
    value: template.maximumDurationMinutes,
    label: "Appointment template maximum duration",
    minimum: template.minimumDurationMinutes,
    maximum: APPOINTMENT_DURATION_RULE_LIMITS.maximumDurationMinutes
  });
  assertDurationRange({
    value: template.defaultDurationMinutes,
    label: "Appointment template default duration",
    minimum: template.minimumDurationMinutes,
    maximum: template.maximumDurationMinutes
  });
  assertBufferRange(
    template.preparationBufferMinutes,
    "Appointment template preparation buffer"
  );
  assertBufferRange(template.cleanupBufferMinutes, "Appointment template cleanup buffer");
  assertDurationRange({
    value: template.startIntervalMinutes,
    label: "Appointment template start interval",
    minimum: APPOINTMENT_DURATION_RULE_LIMITS.minimumStartIntervalMinutes,
    maximum: APPOINTMENT_DURATION_RULE_LIMITS.maximumStartIntervalMinutes
  });

  const durationMinutes = override.durationMinutes ?? template.defaultDurationMinutes;
  const preparationBufferMinutes =
    override.preparationBufferMinutes ?? template.preparationBufferMinutes;
  const cleanupBufferMinutes = override.cleanupBufferMinutes ?? template.cleanupBufferMinutes;

  assertDurationRange({
    value: durationMinutes,
    label: "Appointment duration",
    minimum: template.minimumDurationMinutes,
    maximum: template.maximumDurationMinutes
  });
  assertBufferRange(preparationBufferMinutes, "Appointment preparation buffer");
  assertBufferRange(cleanupBufferMinutes, "Appointment cleanup buffer");

  const totalReservedFootprintMinutes =
    preparationBufferMinutes + durationMinutes + cleanupBufferMinutes;

  if (
    totalReservedFootprintMinutes >
    APPOINTMENT_DURATION_RULE_LIMITS.maximumReservedFootprintMinutes
  ) {
    throw new Error("Appointment reserved footprint exceeds the enterprise maximum.");
  }

  const overrideApplied = getOverrideApplied({
    template,
    durationMinutes,
    preparationBufferMinutes,
    cleanupBufferMinutes
  });
  const overrideReasonCode = trimOptionalText(override.reasonCode);
  const overrideReasonNote = trimOptionalText(override.reasonNote);

  if (overrideApplied && !overrideReasonCode) {
    throw new Error("Appointment duration or buffer overrides require a documented reason.");
  }

  return {
    templateCode: template.code,
    templateVersion: template.version,
    approvalMode: template.approvalMode,
    durationMinutes,
    preparationBufferMinutes,
    cleanupBufferMinutes,
    startIntervalMinutes: template.startIntervalMinutes,
    totalReservedFootprintMinutes,
    overrideApplied,
    managerApprovalRequired: isManagerApprovalRequired({
      approvalMode: template.approvalMode,
      overrideApplied,
      actor
    }),
    overrideReasonCode: overrideApplied ? overrideReasonCode : null,
    overrideReasonNote: overrideApplied ? overrideReasonNote : null
  };
}

export function buildAppointmentTimeFootprint(input: {
  template: AppointmentTemplateDefinition;
  startsAt: Date;
  timezone?: string;
  override?: AppointmentDurationOverride;
  actor?: AppointmentDurationOverrideActor;
}): AppointmentTimeFootprint {
  assertValidDate(input.startsAt, "Appointment start");

  const resolvedRule = resolveAppointmentDurationRule(input);
  const minuteOfDay = input.timezone
    ? getLocationMinuteOfDay(input.startsAt, input.timezone)
    : input.startsAt.getUTCMinutes() + input.startsAt.getUTCHours() * 60;

  if (minuteOfDay % resolvedRule.startIntervalMinutes !== 0) {
    throw new Error(
      `Appointment start must align to the ${resolvedRule.startIntervalMinutes}-minute start interval.`
    );
  }

  const appointmentEndsAt = addMinutes(input.startsAt, resolvedRule.durationMinutes);

  return {
    ...resolvedRule,
    appointmentStartsAt: input.startsAt,
    appointmentEndsAt,
    resourceWindowStartsAt: addMinutes(
      input.startsAt,
      -resolvedRule.preparationBufferMinutes
    ),
    resourceWindowEndsAt: addMinutes(
      appointmentEndsAt,
      resolvedRule.cleanupBufferMinutes
    )
  };
}
