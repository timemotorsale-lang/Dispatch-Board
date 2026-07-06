import { BusinessDay } from "@prisma/client";
import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import { locationLocalDateMinuteToInstant } from "@/server/appointments/location-time-service";
import {
  previewAppointmentResourceCandidateAvailability,
  type AppointmentResourceCandidateAvailabilityAppointmentRecord,
  type AppointmentResourceCandidateAvailabilityLocationAccessRecord,
  type AppointmentResourceCandidateAvailabilityRepository
} from "@/server/services/appointment-resource-candidate-availability-service";

const timezone = "America/Chicago";
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

function localInstant(localDate: string, hour: number, minute = 0) {
  return locationLocalDateMinuteToInstant({
    localDate,
    minuteOfDay: hour * 60 + minute,
    timezone
  });
}

function access(
  overrides: Partial<AppointmentResourceCandidateAvailabilityLocationAccessRecord> = {}
): AppointmentResourceCandidateAvailabilityLocationAccessRecord {
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
  overrides: Partial<AppointmentResourceCandidateAvailabilityAppointmentRecord> = {}
): AppointmentResourceCandidateAvailabilityAppointmentRecord {
  const startsAt = localInstant("2026-07-06", 10);
  const endsAt = localInstant("2026-07-06", 11);

  return {
    id: "appointment-1",
    appointmentNumber: "APT-20001",
    locationId: "loc-time-motor-sales-minneapolis",
    ownerUserId: managerUser.id,
    schedulingTimezone: timezone,
    startsAt,
    endsAt,
    resourceRequirements: [
      {
        id: "requirement-1",
        requirementCode: "SERVICE_BAY",
        requiredCapacity: 1,
        reservations: [
          {
            id: "reservation-proposed",
            appointmentId: "appointment-1",
            requirementId: "requirement-1",
            resourceId: "resource-bay-1",
            status: "PROPOSED",
            startsAt,
            endsAt,
            capacityUnits: 1,
            bufferBeforeMinutes: 0,
            bufferAfterMinutes: 0,
            resource: {
              id: "resource-bay-1",
              code: "BAY_1",
              name: "Service Bay 1",
              status: "ACTIVE",
              capacityMode: "EXCLUSIVE",
              capacity: 1,
              conflictPolicy: "HARD_BLOCK",
              effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
              effectiveTo: null,
              operatingWindows: [
                {
                  businessDay: BusinessDay.MONDAY,
                  opensAtMinute: 9 * 60,
                  closesAtMinute: 18 * 60,
                  capacityOverride: null,
                  validFrom: new Date("2026-01-01T00:00:00.000Z"),
                  validTo: null
                }
              ],
              unavailability: [],
              reservations: []
            }
          }
        ]
      }
    ],
    ...overrides
  };
}

function repository(input?: {
  appointment?: AppointmentResourceCandidateAvailabilityAppointmentRecord | null;
  access?: AppointmentResourceCandidateAvailabilityLocationAccessRecord | null;
}): AppointmentResourceCandidateAvailabilityRepository {
  return {
    async findAppointmentById() {
      return input?.appointment === undefined ? appointment() : input.appointment;
    },
    async findActiveLocationAccess() {
      return input?.access === undefined ? access() : input.access;
    }
  };
}

describe("appointment resource candidate availability service", () => {
  it("marks proposed candidates ready when resource capacity is available", async () => {
    const availability = await previewAppointmentResourceCandidateAvailability(
      managerUser,
      "appointment-1",
      repository(),
      now
    );

    expect(availability).toMatchObject({
      appointmentId: "appointment-1",
      status: "READY",
      canProceedToHold: true,
      proposals: [
        {
          reservationId: "reservation-proposed",
          resourceName: "Service Bay 1",
          status: "READY",
          reasons: []
        }
      ]
    });
  });

  it("blocks proposed candidates that overlap committed reservations", async () => {
    const proposedAppointment = appointment();
    const proposedReservation =
      proposedAppointment.resourceRequirements[0].reservations[0];

    const availability = await previewAppointmentResourceCandidateAvailability(
      managerUser,
      "appointment-1",
      repository({
        appointment: {
          ...proposedAppointment,
          resourceRequirements: [
            {
              ...proposedAppointment.resourceRequirements[0],
              reservations: [
                {
                  ...proposedReservation,
                  resource: {
                    ...proposedReservation.resource,
                    reservations: [
                      {
                        id: "reservation-committed",
                        appointmentId: "appointment-2",
                        status: "COMMITTED",
                        startsAt: proposedReservation.startsAt,
                        endsAt: proposedReservation.endsAt,
                        capacityUnits: 1,
                        bufferBeforeMinutes: 0,
                        bufferAfterMinutes: 0
                      }
                    ]
                  }
                }
              ]
            }
          ]
        }
      }),
      now
    );

    expect(availability).toMatchObject({
      status: "BLOCKED",
      canProceedToHold: false,
      proposals: [
        {
          status: "BLOCKED",
          canProceedToHold: false,
          reasons: expect.arrayContaining([
            "Resource capacity is already reserved during the candidate window.",
            "Resource does not have enough available capacity."
          ])
        }
      ]
    });
  });

  it("rejects unauthorized availability preview access", async () => {
    await expect(
      previewAppointmentResourceCandidateAvailability(
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
