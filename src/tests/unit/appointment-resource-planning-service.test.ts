import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import {
  previewAppointmentResourcePlanning,
  type AppointmentResourcePlanningAppointmentRecord,
  type AppointmentResourcePlanningLocationAccessRecord,
  type AppointmentResourcePlanningRepository,
  type AppointmentResourcePlanningResourceRecord,
  type AppointmentResourcePlanningResourceTypeRecord
} from "@/server/services/appointment-resource-planning-service";

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
  overrides: Partial<AppointmentResourcePlanningLocationAccessRecord> = {}
): AppointmentResourcePlanningLocationAccessRecord {
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

function resourceType(
  overrides: Partial<AppointmentResourcePlanningResourceTypeRecord> = {}
): AppointmentResourcePlanningResourceTypeRecord {
  return {
    id: "resource-type-service-bay",
    code: "SERVICE_BAY",
    name: "Service Bay",
    kind: "SERVICE_BAY",
    defaultCapacityMode: "EXCLUSIVE",
    defaultCapacity: 1,
    defaultConflictPolicy: "HARD_BLOCK",
    visibilityClass: "OPERATIONAL",
    ...overrides
  };
}

function resource(
  overrides: Partial<AppointmentResourcePlanningResourceRecord> = {}
): AppointmentResourcePlanningResourceRecord {
  return {
    id: "resource-bay-1",
    resourceTypeId: "resource-type-service-bay",
    code: "BAY_1",
    name: "Service Bay 1",
    status: "ACTIVE",
    capacityMode: "EXCLUSIVE",
    capacity: 1,
    conflictPolicy: "HARD_BLOCK",
    ...overrides
  };
}

function appointment(
  overrides: Partial<AppointmentResourcePlanningAppointmentRecord> = {}
): AppointmentResourcePlanningAppointmentRecord {
  return {
    id: "appointment-1",
    appointmentNumber: "APT-20001",
    organizationId: "org-time-motor-sales",
    locationId: "loc-time-motor-sales-minneapolis",
    ownerUserId: managerUser.id,
    title: "Service / Repair",
    bookingStatus: "DRAFT",
    purposeSnapshot: {
      category: "service"
    },
    resourceRequirements: [],
    ...overrides
  };
}

function repository(input?: {
  appointment?: AppointmentResourcePlanningAppointmentRecord | null;
  access?: AppointmentResourcePlanningLocationAccessRecord | null;
  resourceTypes?: AppointmentResourcePlanningResourceTypeRecord[];
  resources?: AppointmentResourcePlanningResourceRecord[];
}): AppointmentResourcePlanningRepository {
  return {
    async findAppointmentById() {
      return input?.appointment === undefined ? appointment() : input.appointment;
    },
    async findActiveLocationAccess() {
      return input?.access === undefined ? access() : input.access;
    },
    async findActiveResourceTypes() {
      return input?.resourceTypes ?? [resourceType()];
    },
    async findActiveResourcesForTypes() {
      return input?.resources ?? [resource()];
    }
  };
}

describe("appointment resource planning service", () => {
  it("returns available recommended resources for the appointment category", async () => {
    const planning = await previewAppointmentResourcePlanning(
      managerUser,
      "appointment-1",
      repository(),
      now
    );

    expect(planning).toMatchObject({
      appointmentId: "appointment-1",
      appointmentNumber: "APT-20001",
      category: "service",
      status: "READY_TO_SELECT",
      recommendations: [
        {
          requirementCode: "SERVICE_BAY",
          resourceTypeCode: "SERVICE_BAY",
          status: "AVAILABLE",
          activeCandidateCount: 1
        }
      ]
    });
  });

  it("reports configuration needed when resource type exists but no active resources exist", async () => {
    const planning = await previewAppointmentResourcePlanning(
      managerUser,
      "appointment-1",
      repository({
        resources: []
      }),
      now
    );

    expect(planning).toMatchObject({
      status: "CONFIGURATION_NEEDED",
      recommendations: [
        {
          requirementCode: "SERVICE_BAY",
          status: "CONFIGURATION_NEEDED",
          activeCandidateCount: 0
        }
      ]
    });
  });

  it("marks an already attached requirement as selected", async () => {
    const planning = await previewAppointmentResourcePlanning(
      managerUser,
      "appointment-1",
      repository({
        appointment: appointment({
          resourceRequirements: [
            {
              id: "requirement-1",
              resourceTypeId: "resource-type-service-bay",
              requirementCode: "SERVICE_BAY",
              requiredCapacity: 1,
              isMandatory: true,
              assignmentTiming: "AT_BOOKING",
              hardBlockIfUnfulfilled: true,
              resourceType: {
                id: "resource-type-service-bay",
                code: "SERVICE_BAY",
                name: "Service Bay",
                kind: "SERVICE_BAY"
              },
              reservations: []
            }
          ]
        })
      }),
      now
    );

    expect(planning).toMatchObject({
      status: "REQUIREMENT_SELECTED",
      recommendations: [
        {
          selectedRequirementId: "requirement-1",
          status: "SELECTED"
        }
      ]
    });
  });

  it("rejects unauthorized resource planning access", async () => {
    await expect(
      previewAppointmentResourcePlanning(
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
