import { describe, expect, it } from "vitest";

import {
  buildAppointmentTimeFootprint,
  resolveAppointmentDurationRule
} from "@/server/appointments/appointment-duration-rules";
import {
  getInitialAppointmentTemplateDefinition,
  type AppointmentTemplateDefinition
} from "@/server/appointments/appointment-template-domain";

function getTemplate(code: string) {
  const template = getInitialAppointmentTemplateDefinition(code);

  if (!template) {
    throw new Error(`Missing template fixture ${code}`);
  }

  return template;
}

describe("appointment duration and buffer rules", () => {
  it("resolves the approved template defaults into a reserved time footprint", () => {
    const testDrive = getTemplate("APT-TEST-DRIVE");
    const startsAt = new Date("2026-07-06T15:00:00.000Z");
    const footprint = buildAppointmentTimeFootprint({
      template: testDrive,
      startsAt,
      timezone: "America/Chicago"
    });

    expect(footprint).toMatchObject({
      templateCode: "APT-TEST-DRIVE",
      templateVersion: 1,
      durationMinutes: 45,
      preparationBufferMinutes: 15,
      cleanupBufferMinutes: 15,
      totalReservedFootprintMinutes: 75,
      overrideApplied: false,
      managerApprovalRequired: false,
      overrideReasonCode: null
    });
    expect(footprint.appointmentStartsAt.toISOString()).toBe("2026-07-06T15:00:00.000Z");
    expect(footprint.appointmentEndsAt.toISOString()).toBe("2026-07-06T15:45:00.000Z");
    expect(footprint.resourceWindowStartsAt.toISOString()).toBe(
      "2026-07-06T14:45:00.000Z"
    );
    expect(footprint.resourceWindowEndsAt.toISOString()).toBe("2026-07-06T16:00:00.000Z");
  });

  it("allows documented owner overrides when the template permits owner scheduling", () => {
    const service = getTemplate("APT-SERVICE-INTAKE");
    const resolved = resolveAppointmentDurationRule({
      template: service,
      actor: "OWNER",
      override: {
        durationMinutes: 45,
        preparationBufferMinutes: 15,
        cleanupBufferMinutes: 20,
        reasonCode: "CUSTOMER_COMPLEXITY",
        reasonNote: "Customer asked for additional inspection explanation."
      }
    });

    expect(resolved).toMatchObject({
      durationMinutes: 45,
      preparationBufferMinutes: 15,
      cleanupBufferMinutes: 20,
      totalReservedFootprintMinutes: 80,
      overrideApplied: true,
      managerApprovalRequired: false,
      overrideReasonCode: "CUSTOMER_COMPLEXITY",
      overrideReasonNote: "Customer asked for additional inspection explanation."
    });
  });

  it("flags manager approval when a non-manager overrides a manager-required template", () => {
    const general = getTemplate("APT-GENERAL");
    const resolved = resolveAppointmentDurationRule({
      template: general,
      actor: "OWNER",
      override: {
        durationMinutes: 45,
        reasonCode: "EXTENDED_DISCUSSION"
      }
    });

    expect(resolved.overrideApplied).toBe(true);
    expect(resolved.managerApprovalRequired).toBe(true);
  });

  it("does not require extra approval when the manager makes the same governed override", () => {
    const general = getTemplate("APT-GENERAL");
    const resolved = resolveAppointmentDurationRule({
      template: general,
      actor: "MANAGER",
      override: {
        durationMinutes: 45,
        reasonCode: "EXTENDED_DISCUSSION"
      }
    });

    expect(resolved.overrideApplied).toBe(true);
    expect(resolved.managerApprovalRequired).toBe(false);
  });

  it("requires an explicit reason for duration and buffer overrides", () => {
    const delivery = getTemplate("APT-VEHICLE-DELIVERY");

    expect(() =>
      resolveAppointmentDurationRule({
        template: delivery,
        override: {
          durationMinutes: 90
        }
      })
    ).toThrow(/documented reason/i);
  });

  it("rejects unsafe durations, buffers, and reserved footprints", () => {
    const testDrive = getTemplate("APT-TEST-DRIVE");

    expect(() =>
      resolveAppointmentDurationRule({
        template: testDrive,
        override: {
          durationMinutes: 120,
          reasonCode: "TOO_LONG"
        }
      })
    ).toThrow(/appointment duration/i);

    expect(() =>
      resolveAppointmentDurationRule({
        template: testDrive,
        override: {
          cleanupBufferMinutes: 241,
          reasonCode: "UNSAFE_BUFFER"
        }
      })
    ).toThrow(/cleanup buffer/i);

    const extremeTemplate: AppointmentTemplateDefinition = {
      ...testDrive,
      defaultDurationMinutes: 480,
      minimumDurationMinutes: 5,
      maximumDurationMinutes: 480,
      preparationBufferMinutes: 240,
      cleanupBufferMinutes: 240
    };

    expect(() =>
      resolveAppointmentDurationRule({
        template: extremeTemplate
      })
    ).toThrow(/reserved footprint/i);
  });

  it("enforces template start intervals in the location timezone", () => {
    const testDrive = getTemplate("APT-TEST-DRIVE");

    expect(() =>
      buildAppointmentTimeFootprint({
        template: testDrive,
        startsAt: new Date("2026-07-06T15:07:00.000Z"),
        timezone: "America/Chicago"
      })
    ).toThrow(/15-minute start interval/i);
  });
});
