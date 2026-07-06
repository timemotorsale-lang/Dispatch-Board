import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import {
  previewAppointmentScheduleReadiness,
  type AppointmentScheduleReadinessAppointmentRecord,
  type AppointmentScheduleReadinessLocationAccessRecord,
  type AppointmentScheduleReadinessRepository
} from "@/server/services/appointment-schedule-readiness-service";

const now = new Date("2026-07-06T15:00:00.000Z");

const managerUser: AuthenticatedUser = {
  id: "user-manager",
  name: "Abdi Farah",
  email: "manager@local.test",
  isActive: true,
  roles: ["General Manager"],
  duties: {
    direct: [],
    roleDefaults: [],
    all: []
  }
};

function access(
  overrides: Partial<AppointmentScheduleReadinessLocationAccessRecord> = {}
): AppointmentScheduleReadinessLocationAccessRecord {
  return {
    userId: managerUser.id,
    locationId: "loc-time-motor-sales-minneapolis",
    canViewSchedule: true,
    canParticipate: true,
    canOwnAppointments: true,
    canManageAppointments: true,
    canViewLimitedData: true,
    validFrom: new Date("2026-01-01T00:00:00.000Z"),
    validTo: null,
    ...overrides
  };
}

function appointment(
  overrides: Partial<AppointmentScheduleReadinessAppointmentRecord> = {}
): AppointmentScheduleReadinessAppointmentRecord {
  return {
    id: "appointment-1",
    appointmentNumber: "APT-20001",
    locationId: "loc-time-motor-sales-minneapolis",
    ownerUserId: managerUser.id,
    startsAt: new Date("2026-07-06T15:00:00.000Z"),
    endsAt: new Date("2026-07-06T16:00:00.000Z"),
    bookingStatus: "DRAFT",
    customerSnapshot: {
      displayName: "Ahmed Ibrahim"
    },
    vehicleSnapshot: {
      vehicleNumber: "2018 Toyota Camry"
    },
    participants: [],
    vehicles: [],
    resourceRequirements: [],
    taskLinks: [],
    ...overrides
  };
}

function repository(input?: {
  appointment?: AppointmentScheduleReadinessAppointmentRecord | null;
  access?: AppointmentScheduleReadinessLocationAccessRecord | null;
}): AppointmentScheduleReadinessRepository {
  return {
    async findAppointmentById() {
      return input?.appointment === undefined ? appointment() : input.appointment;
    },
    async findActiveLocationAccess() {
      return input?.access === undefined ? access() : input.access;
    }
  };
}

describe("appointment schedule readiness service", () => {
  it("returns warning readiness when optional scheduling context is incomplete", async () => {
    const readiness = await previewAppointmentScheduleReadiness(
      managerUser,
      "appointment-1",
      repository(),
      now
    );

    expect(readiness).toMatchObject({
      appointmentId: "appointment-1",
      appointmentNumber: "APT-20001",
      status: "WARNING",
      canSubmitSchedule: true,
      warnings: [
        {
          code: "RESOURCE_REQUIREMENTS_NOT_SELECTED"
        }
      ]
    });
  });

  it("blocks scheduling when required owner or time data is missing", async () => {
    const readiness = await previewAppointmentScheduleReadiness(
      managerUser,
      "appointment-1",
      repository({
        appointment: appointment({
          ownerUserId: null,
          startsAt: null,
          endsAt: null
        })
      }),
      now
    );

    expect(readiness).toMatchObject({
      status: "BLOCKED",
      canSubmitSchedule: false,
      hardBlocks: [
        {
          code: "OWNER_REQUIRED"
        },
        {
          code: "INVALID_TIME"
        }
      ]
    });
  });

  it("rejects unauthorized schedule preview access", async () => {
    await expect(
      previewAppointmentScheduleReadiness(
        managerUser,
        "appointment-1",
        repository({
          access: access({
            canManageAppointments: false
          }),
          appointment: appointment({
            ownerUserId: "another-user"
          })
        }),
        now
      )
    ).rejects.toThrow("Appointment command is not authorized.");
  });
});
