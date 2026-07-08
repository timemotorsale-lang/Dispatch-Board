import { BusinessDay, LocationSchedulingStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import { locationLocalDateMinuteToInstant } from "@/server/appointments/location-time-service";
import {
  createAppointmentAvailabilityRecommendationRepository,
  recommendAppointmentAvailability,
  type AppointmentAvailabilityRecommendationAppointmentRecord,
  type AppointmentAvailabilityRecommendationLocationAccessRecord,
  type AppointmentAvailabilityRecommendationRepository,
  type AppointmentAvailabilityRecommendationStaffResourceRecord
} from "@/server/services/appointment-availability-recommendation-service";

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
  userId = managerUser.id,
  overrides: Partial<AppointmentAvailabilityRecommendationLocationAccessRecord> = {}
): AppointmentAvailabilityRecommendationLocationAccessRecord {
  return {
    userId,
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

function staffResource(
  userId = managerUser.id,
  overrides: Partial<AppointmentAvailabilityRecommendationStaffResourceRecord> = {}
): AppointmentAvailabilityRecommendationStaffResourceRecord {
  return {
    id: "resource-staff-1",
    locationId: "loc-time-motor-sales-minneapolis",
    userId,
    name: "Abdi Farah",
    status: "ACTIVE",
    capacityMode: "EXCLUSIVE",
    capacity: 1,
    conflictPolicy: "HARD_BLOCK",
    effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
    effectiveTo: null,
    resourceType: {
      kind: "STAFF"
    },
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
    reservations: [],
    ...overrides
  };
}

function appointment(
  overrides: Partial<AppointmentAvailabilityRecommendationAppointmentRecord> = {}
): AppointmentAvailabilityRecommendationAppointmentRecord {
  return {
    id: "appointment-1",
    appointmentNumber: "APT-20001",
    organizationId: "org-time-motor-sales",
    locationId: "loc-time-motor-sales-minneapolis",
    ownerUserId: managerUser.id,
    sourceType: "MANUAL",
    sourceReference: "Manual follow-up scheduling",
    title: "Customer follow-up discussion",
    schedulingTimezone: timezone,
    startsAt: null,
    endsAt: null,
    bookingStatus: "DRAFT",
    purposeSnapshot: null,
    customerSnapshot: {
      displayName: "Amina Said"
    },
    vehicleSnapshot: {
      displayName: "2019 Toyota Camry",
      vehicleNumber: "CAMRY-19"
    },
    sourceSnapshot: null,
    ownerUser: {
      id: managerUser.id,
      name: managerUser.name,
      isActive: true
    },
    participants: [],
    location: {
      id: "loc-time-motor-sales-minneapolis",
      timezone,
      schedulingStatus: LocationSchedulingStatus.ACTIVE,
      operatingWindows: [
        {
          businessDay: BusinessDay.MONDAY,
          opensAtMinute: 9 * 60,
          closesAtMinute: 18 * 60,
          validFrom: new Date("2026-01-01T00:00:00.000Z"),
          validTo: null
        }
      ],
      closures: []
    },
    resourceRequirements: [],
    ...overrides
  };
}

function repository(input?: {
  appointment?: AppointmentAvailabilityRecommendationAppointmentRecord | null;
  actorAccess?: AppointmentAvailabilityRecommendationLocationAccessRecord | null;
  ownerAccess?: AppointmentAvailabilityRecommendationLocationAccessRecord | null;
  staffResource?: AppointmentAvailabilityRecommendationStaffResourceRecord | null;
}): AppointmentAvailabilityRecommendationRepository {
  return {
    async findAppointmentById() {
      return input?.appointment === undefined ? appointment() : input.appointment;
    },
    async findLocationAccess(userId) {
      if (userId === managerUser.id) {
        return input?.actorAccess === undefined ? access(managerUser.id) : input.actorAccess;
      }

      return input?.ownerAccess === undefined ? access(userId) : input.ownerAccess;
    },
    async findStaffResourceForUser(userId) {
      if (userId !== managerUser.id) {
        return null;
      }

      return input?.staffResource === undefined ? staffResource(userId) : input.staffResource;
    }
  };
}

describe("appointment availability recommendation service", () => {
  it("returns ranked slot recommendations for an unscheduled draft using the proposed window", async () => {
    const result = await recommendAppointmentAvailability(
      managerUser,
      "appointment-1",
      repository(),
      now,
      {
        proposedStartsAt: localInstant("2026-07-06", 10),
        proposedEndsAt: localInstant("2026-07-06", 11),
        proposedSchedulingTimezone: timezone,
        maximumCandidates: 3,
        searchHorizonDays: 2
      }
    );

    expect(result).toMatchObject({
      appointmentId: "appointment-1",
      appointmentNumber: "APT-20001",
      templateCode: "APT-GENERAL",
      templateSource: "GENERAL_FALLBACK",
      windowStartLocalDate: "2026-07-06",
      windowEndLocalDate: "2026-07-07",
      candidateCount: 3,
      ownerStaffCount: 1,
      selectedResourceCount: 0
    });
    expect(result.candidates.map((candidate) => candidate.startMinuteOfDay)).toEqual([
      10 * 60,
      10 * 60 + 15,
      10 * 60 + 30
    ]);
    expect(result.candidates.every((candidate) => candidate.status === "AVAILABLE")).toBe(true);
  });

  it("falls back to the task meeting template when the appointment comes from a task", async () => {
    const result = await recommendAppointmentAvailability(
      managerUser,
      "appointment-1",
      repository({
        appointment: appointment({
          sourceType: "TASK",
          sourceSnapshot: {
            sourceTaskId: "task-1"
          },
          title: "Task-driven meeting"
        })
      }),
      now,
      {
        proposedStartsAt: localInstant("2026-07-06", 10),
        proposedEndsAt: localInstant("2026-07-06", 11),
        proposedSchedulingTimezone: timezone,
        maximumCandidates: 2
      }
    );

    expect(result.templateCode).toBe("APT-TASK-MEETING");
    expect(result.templateSource).toBe("TASK_FALLBACK");
    expect(result.candidateCount).toBe(2);
  });

  it("rejects appointments when the actor does not have active schedule access", async () => {
    await expect(
      recommendAppointmentAvailability(
        managerUser,
        "appointment-1",
        repository({
          actorAccess: null
        }),
        now,
        {
          proposedStartsAt: localInstant("2026-07-06", 10),
          proposedEndsAt: localInstant("2026-07-06", 11),
          proposedSchedulingTimezone: timezone
        }
      )
    ).rejects.toThrow("Appointment schedule is not authorized.");
  });

  it("builds the default repository against the Prisma client", async () => {
    const repo = createAppointmentAvailabilityRecommendationRepository();

    expect(repo).toHaveProperty("findAppointmentById");
    expect(repo).toHaveProperty("findLocationAccess");
    expect(repo).toHaveProperty("findStaffResourceForUser");
  });
});
