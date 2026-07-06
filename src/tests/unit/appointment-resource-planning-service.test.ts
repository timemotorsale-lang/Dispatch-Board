import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import {
  attachRecommendedAppointmentResourceRequirement,
  previewAppointmentResourcePlanning,
  proposeAppointmentResourceCandidate,
  replaceAppointmentResourceReservation,
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
    organizationId: "org-time-motor-sales",
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
    organizationId: "org-time-motor-sales",
    locationId: "loc-time-motor-sales-minneapolis",
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
    version: 3,
    startsAt: new Date("2026-07-06T15:00:00.000Z"),
    endsAt: new Date("2026-07-06T16:00:00.000Z"),
    schedulingTimezone: "America/Chicago",
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
              appointmentId: "appointment-1",
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

describe("appointment recommended resource requirement attachment", () => {
  function database(input?: {
    appointment?: AppointmentResourcePlanningAppointmentRecord | null;
    access?: AppointmentResourcePlanningLocationAccessRecord | null;
    resourceType?: AppointmentResourcePlanningResourceTypeRecord | null;
    existingRequirement?: {
      id: string;
      appointmentId: string;
      resourceTypeId: string;
      requirementCode: string;
      requiredCapacity: number;
      isMandatory: boolean;
      assignmentTiming: string;
      hardBlockIfUnfulfilled: boolean;
    } | null;
    updateCount?: number;
  }) {
    const createdRequirements: unknown[] = [];
    const createdHistory: unknown[] = [];

    return {
      createdRequirements,
      createdHistory,
      database: {
        appointment: {
          async findUnique() {
            return input?.appointment === undefined ? appointment() : input.appointment;
          }
        },
        userLocationAccess: {
          async findFirst() {
            return input?.access === undefined ? access() : input.access;
          }
        },
        schedulableResourceType: {
          async findFirst() {
            return input?.resourceType === undefined ? resourceType() : input.resourceType;
          }
        },
        schedulableResource: {
          async findMany() {
            return [];
          }
        },
        async $transaction(operation: (tx: unknown) => Promise<unknown>) {
          return operation({
            appointmentResourceRequirement: {
              async findUnique() {
                return input?.existingRequirement ?? null;
              },
              async create(createInput: { data: unknown }) {
                createdRequirements.push(createInput.data);

                return {
                  id: "requirement-created",
                  appointmentId: "appointment-1",
                  resourceTypeId: "resource-type-service-bay",
                  requirementCode: "SERVICE_BAY",
                  requiredCapacity: 1,
                  isMandatory: true,
                  assignmentTiming: "AT_BOOKING",
                  hardBlockIfUnfulfilled: true
                };
              }
            },
            appointment: {
              async updateMany() {
                return {
                  count: input?.updateCount ?? 1
                };
              }
            },
            appointmentHistoryEvent: {
              async create(createInput: { data: unknown }) {
                createdHistory.push(createInput.data);
              }
            }
          });
        }
      }
    };
  }

  it("creates a recommended resource requirement with a version guard and history", async () => {
    const harness = database();

    const result = await attachRecommendedAppointmentResourceRequirement(
      managerUser,
      "appointment-1",
      {
        requirementCode: "SERVICE_BAY",
        expectedAppointmentVersion: 3,
        reasonCode: "RESOURCE_REQUIREMENT_ADDED",
        reasonNotes: "Attach service bay before scheduling.",
        correlationId: "correlation-1"
      },
      harness.database,
      now
    );

    expect(result).toMatchObject({
      id: "requirement-created",
      requirementCode: "SERVICE_BAY",
      created: true,
      appointmentVersion: 4
    });
    expect(harness.createdRequirements).toHaveLength(1);
    expect(harness.createdHistory).toHaveLength(1);
  });

  it("returns an existing requirement without creating a duplicate", async () => {
    const harness = database({
      existingRequirement: {
        id: "requirement-existing",
        appointmentId: "appointment-1",
        resourceTypeId: "resource-type-service-bay",
        requirementCode: "SERVICE_BAY",
        requiredCapacity: 1,
        isMandatory: true,
        assignmentTiming: "AT_BOOKING",
        hardBlockIfUnfulfilled: true
      }
    });

    const result = await attachRecommendedAppointmentResourceRequirement(
      managerUser,
      "appointment-1",
      {
        requirementCode: "SERVICE_BAY",
        expectedAppointmentVersion: 3,
        reasonCode: "RESOURCE_REQUIREMENT_ADDED",
        reasonNotes: "Attach service bay before scheduling."
      },
      harness.database,
      now
    );

    expect(result).toMatchObject({
      id: "requirement-existing",
      created: false,
      appointmentVersion: 3
    });
    expect(harness.createdRequirements).toHaveLength(0);
    expect(harness.createdHistory).toHaveLength(0);
  });

  it("rejects stale appointment versions", async () => {
    const harness = database({
      updateCount: 0
    });

    await expect(
      attachRecommendedAppointmentResourceRequirement(
        managerUser,
        "appointment-1",
        {
          requirementCode: "SERVICE_BAY",
          expectedAppointmentVersion: 2,
          reasonCode: "RESOURCE_REQUIREMENT_ADDED",
          reasonNotes: "Attach service bay before scheduling."
        },
        harness.database,
        now
      )
    ).rejects.toThrow("Appointment version is stale.");
  });
});

describe("appointment resource candidate proposal", () => {
  const attachedRequirement = {
    id: "requirement-1",
    appointmentId: "appointment-1",
    resourceTypeId: "resource-type-service-bay",
    requirementCode: "SERVICE_BAY",
    requiredCapacity: 1,
    isMandatory: true,
    assignmentTiming: "AT_BOOKING" as const,
    hardBlockIfUnfulfilled: true,
    resourceType: {
      id: "resource-type-service-bay",
      code: "SERVICE_BAY",
      name: "Service Bay",
      kind: "SERVICE_BAY" as const
    },
    reservations: []
  };

  function appointmentWithRequirement(
    overrides: Partial<AppointmentResourcePlanningAppointmentRecord> = {}
  ): AppointmentResourcePlanningAppointmentRecord {
    return appointment({
      resourceRequirements: [attachedRequirement],
      ...overrides
    });
  }

  function database(input?: {
    appointment?: AppointmentResourcePlanningAppointmentRecord | null;
    access?: AppointmentResourcePlanningLocationAccessRecord | null;
    resource?: AppointmentResourcePlanningResourceRecord | null;
    updateCount?: number;
    cancelledCount?: number;
  }) {
    const createdReservations: unknown[] = [];
    const createdHistory: unknown[] = [];

    return {
      createdReservations,
      createdHistory,
      database: {
        appointment: {
          async findUnique() {
            return input?.appointment === undefined
              ? appointmentWithRequirement()
              : input.appointment;
          }
        },
        userLocationAccess: {
          async findFirst() {
            return input?.access === undefined ? access() : input.access;
          }
        },
        schedulableResourceType: {
          async findFirst() {
            return resourceType();
          }
        },
        schedulableResource: {
          async findFirst() {
            return input?.resource === undefined ? resource() : input.resource;
          },
          async findMany() {
            return [];
          }
        },
        async $transaction(operation: (tx: unknown) => Promise<unknown>) {
          return operation({
            appointment: {
              async updateMany() {
                return {
                  count: input?.updateCount ?? 1
                };
              }
            },
            appointmentResourceReservation: {
              async updateMany() {
                return {
                  count: input?.cancelledCount ?? 0
                };
              },
              async create(createInput: { data: unknown }) {
                createdReservations.push(createInput.data);

                return {
                  id: "reservation-proposed",
                  appointmentId: "appointment-1",
                  requirementId: "requirement-1",
                  resourceId: "resource-bay-1",
                  status: "PROPOSED",
                  startsAt: new Date("2026-07-06T15:00:00.000Z"),
                  endsAt: new Date("2026-07-06T16:00:00.000Z"),
                  capacityUnits: 1
                };
              }
            },
            appointmentHistoryEvent: {
              async create(createInput: { data: unknown }) {
                createdHistory.push(createInput.data);
              }
            }
          });
        }
      }
    };
  }

  it("creates a proposed reservation candidate with version guard and history", async () => {
    const harness = database({
      cancelledCount: 1
    });

    const result = await proposeAppointmentResourceCandidate(
      managerUser,
      "appointment-1",
      {
        requirementId: "requirement-1",
        resourceId: "resource-bay-1",
        expectedAppointmentVersion: 3,
        reasonCode: "RESOURCE_CANDIDATE_PROPOSED",
        reasonNotes: "Propose Bay 1 before scheduling.",
        correlationId: "correlation-1"
      },
      harness.database,
      now
    );

    expect(result).toMatchObject({
      id: "reservation-proposed",
      resourceId: "resource-bay-1",
      resourceName: "Service Bay 1",
      status: "PROPOSED",
      created: true,
      cancelledPriorProposalCount: 1,
      appointmentVersion: 4
    });
    expect(harness.createdReservations).toHaveLength(1);
    expect(harness.createdHistory).toHaveLength(1);
  });

  it("returns an existing same proposed candidate without creating a duplicate", async () => {
    const harness = database({
      appointment: appointmentWithRequirement({
        resourceRequirements: [
          {
            ...attachedRequirement,
            reservations: [
              {
                id: "reservation-existing",
                status: "PROPOSED",
                resourceId: "resource-bay-1",
                createdAt: new Date("2026-07-06T15:05:00.000Z"),
                resource: {
                  id: "resource-bay-1",
                  code: "BAY_1",
                  name: "Service Bay 1"
                }
              }
            ]
          }
        ]
      })
    });

    const result = await proposeAppointmentResourceCandidate(
      managerUser,
      "appointment-1",
      {
        requirementId: "requirement-1",
        resourceId: "resource-bay-1",
        expectedAppointmentVersion: 3,
        reasonCode: "RESOURCE_CANDIDATE_PROPOSED",
        reasonNotes: "Propose Bay 1 before scheduling."
      },
      harness.database,
      now
    );

    expect(result).toMatchObject({
      id: "reservation-existing",
      created: false,
      appointmentVersion: 3
    });
    expect(harness.createdReservations).toHaveLength(0);
    expect(harness.createdHistory).toHaveLength(0);
  });

  it("rejects stale appointment versions", async () => {
    const harness = database({
      updateCount: 0
    });

    await expect(
      proposeAppointmentResourceCandidate(
        managerUser,
        "appointment-1",
        {
          requirementId: "requirement-1",
          resourceId: "resource-bay-1",
          expectedAppointmentVersion: 2,
          reasonCode: "RESOURCE_CANDIDATE_PROPOSED",
          reasonNotes: "Propose Bay 1 before scheduling."
        },
        harness.database,
        now
      )
    ).rejects.toThrow("Appointment version is stale.");
  });
});

describe("appointment resource reservation replacement", () => {
  const heldRequirement = {
    id: "requirement-1",
    appointmentId: "appointment-1",
    resourceTypeId: "resource-type-service-bay",
    requirementCode: "SERVICE_BAY",
    requiredCapacity: 1,
    isMandatory: true,
    assignmentTiming: "AT_BOOKING" as const,
    hardBlockIfUnfulfilled: true,
    resourceType: {
      id: "resource-type-service-bay",
      code: "SERVICE_BAY",
      name: "Service Bay",
      kind: "SERVICE_BAY" as const
    },
    reservations: [
      {
        id: "reservation-held",
        status: "HELD",
        resourceId: "resource-bay-1",
        createdAt: new Date("2026-07-06T15:05:00.000Z"),
        resource: {
          id: "resource-bay-1",
          code: "BAY_1",
          name: "Service Bay 1"
        }
      }
    ]
  };
  const committedRequirement = {
    ...heldRequirement,
    reservations: [
      {
        ...heldRequirement.reservations[0],
        id: "reservation-committed",
        status: "COMMITTED",
        resourceId: "resource-bay-1"
      }
    ]
  };

  function appointmentWithHeldReservation(
    overrides: Partial<AppointmentResourcePlanningAppointmentRecord> = {}
  ): AppointmentResourcePlanningAppointmentRecord {
    return appointment({
      bookingStatus: "DRAFT",
      resourceRequirements: [heldRequirement],
      ...overrides
    });
  }

  function database(input?: {
    appointment?: AppointmentResourcePlanningAppointmentRecord | null;
    access?: AppointmentResourcePlanningLocationAccessRecord | null;
    resource?: AppointmentResourcePlanningResourceRecord | null;
    replacementReservations?: Array<{
      id: string;
      appointmentId: string;
      status: string;
      startsAt: Date;
      endsAt: Date;
      capacityUnits: number;
      bufferBeforeMinutes: number;
      bufferAfterMinutes: number;
    }>;
    appointmentUpdateCount?: number;
    releaseUpdateCount?: number;
    cancelledCount?: number;
  }) {
    const createdReservations: unknown[] = [];
    const createdHistory: unknown[] = [];
    const updatedReservations: unknown[] = [];

    return {
      createdReservations,
      createdHistory,
      updatedReservations,
      database: {
        appointment: {
          async findUnique() {
            return input?.appointment === undefined
              ? appointmentWithHeldReservation()
              : input.appointment;
          }
        },
        userLocationAccess: {
          async findFirst() {
            return input?.access === undefined ? access() : input.access;
          }
        },
        schedulableResourceType: {
          async findFirst() {
            return resourceType();
          }
        },
        schedulableResource: {
          async findFirst() {
            const selectedResource =
              input?.resource === undefined
                ? resource({
                    id: "resource-bay-2",
                    code: "BAY_2",
                    name: "Service Bay 2"
                  })
                : input.resource;

            return selectedResource
              ? {
                  ...selectedResource,
                  effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
                  effectiveTo: null,
                  operatingWindows: [
                    {
                      businessDay: "MONDAY",
                      opensAtMinute: 9 * 60,
                      closesAtMinute: 18 * 60,
                      capacityOverride: null,
                      validFrom: new Date("2026-01-01T00:00:00.000Z"),
                      validTo: null
                    }
                  ],
                  unavailability: [],
                  reservations: input?.replacementReservations ?? []
                }
              : null;
          },
          async findMany() {
            return [];
          }
        },
        async $transaction(operation: (tx: unknown) => Promise<unknown>) {
          let reservationUpdateCall = 0;

          return operation({
            appointment: {
              async updateMany() {
                return {
                  count: input?.appointmentUpdateCount ?? 1
                };
              }
            },
            appointmentResourceReservation: {
              async updateMany(updateInput: { data: unknown }) {
                reservationUpdateCall += 1;
                updatedReservations.push(updateInput.data);

                return {
                  count:
                    reservationUpdateCall === 1
                      ? input?.releaseUpdateCount ?? 1
                      : input?.cancelledCount ?? 0
                };
              },
              async create(createInput: { data: unknown }) {
                createdReservations.push(createInput.data);
                const data = createInput.data as {
                  status?: string;
                };

                return {
                  id: "reservation-replacement",
                  appointmentId: "appointment-1",
                  requirementId: "requirement-1",
                  resourceId: "resource-bay-2",
                  status: data.status ?? "PROPOSED",
                  startsAt: new Date("2026-07-06T15:00:00.000Z"),
                  endsAt: new Date("2026-07-06T16:00:00.000Z"),
                  capacityUnits: 1
                };
              }
            },
            appointmentHistoryEvent: {
              async create(createInput: { data: unknown }) {
                createdHistory.push(createInput.data);
              }
            }
          });
        }
      }
    };
  }

  it("releases a held reservation and creates a replacement proposal atomically", async () => {
    const harness = database({
      cancelledCount: 1
    });

    const result = await replaceAppointmentResourceReservation(
      managerUser,
      "appointment-1",
      {
        reservationId: "reservation-held",
        resourceId: "resource-bay-2",
        expectedAppointmentVersion: 3,
        reasonCode: "RESOURCE_RESERVATION_REPLACED",
        reasonNotes: "Move from Bay 1 to Bay 2 before scheduling.",
        correlationId: "correlation-replace-1"
      },
      harness.database,
      now
    );

    expect(result).toMatchObject({
      id: "reservation-replacement",
      resourceId: "resource-bay-2",
      resourceName: "Service Bay 2",
      status: "PROPOSED",
      releasedReservationId: "reservation-held",
      releasedResourceName: "Service Bay 1",
      releasedPriorStatus: "HELD",
      cancelledPriorProposalCount: 1,
      appointmentVersion: 4
    });
    expect(harness.updatedReservations).toEqual([
      {
        status: "RELEASED"
      },
      {
        status: "CANCELLED"
      }
    ]);
    expect(harness.createdReservations).toHaveLength(1);
    expect(harness.createdHistory).toHaveLength(1);
  });

  it("releases a committed scheduled reservation and creates a committed replacement atomically", async () => {
    const harness = database({
      appointment: appointmentWithHeldReservation({
        bookingStatus: "SCHEDULED",
        resourceRequirements: [committedRequirement]
      })
    });

    const result = await replaceAppointmentResourceReservation(
      managerUser,
      "appointment-1",
      {
        reservationId: "reservation-committed",
        resourceId: "resource-bay-2",
        expectedAppointmentVersion: 3,
        reasonCode: "RESOURCE_RESERVATION_REPLACED",
        reasonNotes: "Swap committed bay after lift became unavailable.",
        correlationId: "correlation-replace-committed"
      },
      harness.database,
      now
    );

    expect(result).toMatchObject({
      id: "reservation-replacement",
      resourceId: "resource-bay-2",
      resourceName: "Service Bay 2",
      status: "COMMITTED",
      releasedReservationId: "reservation-committed",
      releasedResourceName: "Service Bay 1",
      releasedPriorStatus: "COMMITTED",
      cancelledPriorProposalCount: 0,
      appointmentVersion: 4
    });
    expect(harness.updatedReservations).toEqual([
      {
        status: "RELEASED"
      },
      {
        status: "CANCELLED"
      }
    ]);
    expect(harness.createdReservations).toEqual([
      expect.objectContaining({
        status: "COMMITTED",
        resourceId: "resource-bay-2"
      })
    ]);
    expect(harness.createdHistory).toHaveLength(1);
  });

  it("allows warning-level committed scheduled replacement with documented manager reason", async () => {
    const overlappingReservation = {
      id: "reservation-overlap",
      appointmentId: "appointment-2",
      status: "COMMITTED",
      startsAt: new Date("2026-07-06T15:00:00.000Z"),
      endsAt: new Date("2026-07-06T16:00:00.000Z"),
      capacityUnits: 1,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0
    };
    const harness = database({
      appointment: appointmentWithHeldReservation({
        bookingStatus: "SCHEDULED",
        resourceRequirements: [committedRequirement]
      }),
      resource: resource({
        id: "resource-bay-2",
        code: "BAY_2",
        name: "Service Bay 2",
        conflictPolicy: "WARNING"
      }),
      replacementReservations: [overlappingReservation]
    });

    const result = await replaceAppointmentResourceReservation(
      managerUser,
      "appointment-1",
      {
        reservationId: "reservation-committed",
        resourceId: "resource-bay-2",
        expectedAppointmentVersion: 3,
        reasonCode: "RESOURCE_RESERVATION_REPLACED",
        reasonNotes: "Manager accepts temporary bay overlap because jobs are staggered.",
        correlationId: "correlation-replace-committed-warning"
      },
      harness.database,
      now
    );

    expect(result).toMatchObject({
      status: "COMMITTED",
      availabilityStatus: "WARNING",
      warningReasons: expect.arrayContaining([
        "Resource capacity is already reserved during the candidate window.",
        "Resource does not have enough available capacity."
      ]),
      releasedPriorStatus: "COMMITTED"
    });
    expect(harness.createdReservations).toEqual([
      expect.objectContaining({
        status: "COMMITTED",
        resourceId: "resource-bay-2"
      })
    ]);
    expect(harness.createdHistory).toEqual([
      expect.objectContaining({
        newValue: expect.objectContaining({
          availability: expect.objectContaining({
            status: "WARNING",
            warningOverrideAccepted: true
          })
        }),
        metadata: expect.objectContaining({
          availabilityStatus: "WARNING",
          warningOverrideAccepted: true
        })
      })
    ]);
  });

  it("rejects hard-block committed scheduled replacement conflicts", async () => {
    const harness = database({
      appointment: appointmentWithHeldReservation({
        bookingStatus: "SCHEDULED",
        resourceRequirements: [committedRequirement]
      }),
      resource: resource({
        id: "resource-bay-2",
        code: "BAY_2",
        name: "Service Bay 2",
        conflictPolicy: "HARD_BLOCK"
      }),
      replacementReservations: [
        {
          id: "reservation-overlap",
          appointmentId: "appointment-2",
          status: "COMMITTED",
          startsAt: new Date("2026-07-06T15:00:00.000Z"),
          endsAt: new Date("2026-07-06T16:00:00.000Z"),
          capacityUnits: 1,
          bufferBeforeMinutes: 0,
          bufferAfterMinutes: 0
        }
      ]
    });

    await expect(
      replaceAppointmentResourceReservation(
        managerUser,
        "appointment-1",
        {
          reservationId: "reservation-committed",
          resourceId: "resource-bay-2",
          expectedAppointmentVersion: 3,
          reasonCode: "RESOURCE_RESERVATION_REPLACED",
          reasonNotes: "Attempt hard-blocked bay swap."
        },
        harness.database,
        now
      )
    ).rejects.toThrow("Replacement resource candidate is not available");

    expect(harness.createdReservations).toHaveLength(0);
    expect(harness.createdHistory).toHaveLength(0);
  });

  it("requires a different replacement resource", async () => {
    const harness = database();

    await expect(
      replaceAppointmentResourceReservation(
        managerUser,
        "appointment-1",
        {
          reservationId: "reservation-held",
          resourceId: "resource-bay-1",
          expectedAppointmentVersion: 3,
          reasonCode: "RESOURCE_RESERVATION_REPLACED",
          reasonNotes: "Attempt same resource."
        },
        harness.database,
        now
      )
    ).rejects.toThrow("Replacement resource candidate must be different");

    expect(harness.createdReservations).toHaveLength(0);
    expect(harness.createdHistory).toHaveLength(0);
  });

  it("rejects stale appointment versions before replacement side effects", async () => {
    const harness = database({
      appointmentUpdateCount: 0
    });

    await expect(
      replaceAppointmentResourceReservation(
        managerUser,
        "appointment-1",
        {
          reservationId: "reservation-held",
          resourceId: "resource-bay-2",
          expectedAppointmentVersion: 2,
          reasonCode: "RESOURCE_RESERVATION_REPLACED",
          reasonNotes: "Move from Bay 1 to Bay 2 before scheduling."
        },
        harness.database,
        now
      )
    ).rejects.toThrow("Appointment version is stale.");

    expect(harness.updatedReservations).toHaveLength(0);
    expect(harness.createdReservations).toHaveLength(0);
    expect(harness.createdHistory).toHaveLength(0);
  });
});
