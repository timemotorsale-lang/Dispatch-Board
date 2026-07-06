import { BusinessDay } from "@prisma/client";
import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import { locationLocalDateMinuteToInstant } from "@/server/appointments/location-time-service";
import {
  holdAppointmentResourceCandidate,
  overrideAppointmentResourceWarning,
  previewAppointmentResourceCandidateAvailability,
  releaseAppointmentResourceReservation,
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
    version: 3,
    bookingStatus: "DRAFT",
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

function warningAppointment(): AppointmentResourceCandidateAvailabilityAppointmentRecord {
  const baseAppointment = appointment();
  const baseRequirement = baseAppointment.resourceRequirements[0];
  const baseReservation = baseRequirement.reservations[0];

  return {
    ...baseAppointment,
    resourceRequirements: [
      {
        ...baseRequirement,
        reservations: [
          {
            ...baseReservation,
            resource: {
              ...baseReservation.resource,
              conflictPolicy: "WARNING",
              reservations: [
                {
                  id: "reservation-committed",
                  appointmentId: "appointment-2",
                  status: "COMMITTED",
                  startsAt: baseReservation.startsAt,
                  endsAt: baseReservation.endsAt,
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
  };
}

function repository(input?: {
  appointment?: AppointmentResourceCandidateAvailabilityAppointmentRecord | null;
  access?: AppointmentResourceCandidateAvailabilityLocationAccessRecord | null;
  warningOverrideKeys?: string[];
}): AppointmentResourceCandidateAvailabilityRepository {
  return {
    async findAppointmentById() {
      return input?.appointment === undefined ? appointment() : input.appointment;
    },
    async findActiveLocationAccess() {
      return input?.access === undefined ? access() : input.access;
    },
    async findResourceWarningOverrideKeys() {
      return input?.warningOverrideKeys ?? [];
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

  it("evaluates missing-time draft candidates against a proposed scheduling window", async () => {
    const unscheduledAppointment = appointment({
      startsAt: null,
      endsAt: null
    });
    const requirement = unscheduledAppointment.resourceRequirements[0];
    const proposedReservation = requirement.reservations[0];

    const availability = await previewAppointmentResourceCandidateAvailability(
      managerUser,
      "appointment-1",
      repository({
        appointment: {
          ...unscheduledAppointment,
          resourceRequirements: [
            {
              ...requirement,
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
      now,
      {
        proposedStartsAt: localInstant("2026-07-06", 11),
        proposedEndsAt: localInstant("2026-07-06", 12),
        proposedSchedulingTimezone: timezone
      }
    );

    expect(availability).toMatchObject({
      status: "READY",
      canProceedToHold: true,
      proposals: [
        {
          reservationId: "reservation-proposed",
          status: "READY",
          reasons: []
        }
      ]
    });
  });

  it("requires warning override before warning-level candidates can proceed to hold", async () => {
    const availability = await previewAppointmentResourceCandidateAvailability(
      managerUser,
      "appointment-1",
      repository({
        appointment: warningAppointment()
      }),
      now
    );

    expect(availability).toMatchObject({
      status: "WARNING",
      canProceedToHold: false,
      proposals: [
        {
          status: "WARNING",
          canProceedToHold: false,
          warningOverrideRequired: true,
          warningOverrideSatisfied: false,
          warningKey: expect.stringContaining("RESOURCE|RESOURCE_WARNING|appointment-1")
        }
      ]
    });
  });

  it("surfaces persisted warning overrides in candidate availability", async () => {
    const previewWithoutOverride = await previewAppointmentResourceCandidateAvailability(
      managerUser,
      "appointment-1",
      repository({
        appointment: warningAppointment()
      }),
      now
    );
    const warningKey = previewWithoutOverride.proposals[0].warningKey;

    const availability = await previewAppointmentResourceCandidateAvailability(
      managerUser,
      "appointment-1",
      repository({
        appointment: warningAppointment(),
        warningOverrideKeys: warningKey ? [warningKey] : []
      }),
      now
    );

    expect(availability).toMatchObject({
      status: "WARNING",
      canProceedToHold: true,
      proposals: [
        {
          status: "WARNING",
          canProceedToHold: true,
          warningOverrideRequired: true,
          warningOverrideSatisfied: true,
          warningKey
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

describe("appointment resource candidate hold service", () => {
  function database(input?: {
    appointment?: AppointmentResourceCandidateAvailabilityAppointmentRecord | null;
    access?: AppointmentResourceCandidateAvailabilityLocationAccessRecord | null;
    appointmentUpdateCount?: number;
    reservationUpdateCount?: number;
    warningOverrideExists?: boolean;
  }) {
    const createdHistory: unknown[] = [];
    const updatedReservations: unknown[] = [];

    return {
      createdHistory,
      updatedReservations,
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
        appointmentHistoryEvent: {
          async findFirst() {
            return input?.warningOverrideExists ? { id: "history-warning-override" } : null;
          }
        },
        async $transaction(operation: (tx: unknown) => Promise<unknown>) {
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
                updatedReservations.push(updateInput.data);

                return {
                  count: input?.reservationUpdateCount ?? 1
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

  it("holds a proposed resource candidate after rechecking availability", async () => {
    const harness = database();

    const result = await holdAppointmentResourceCandidate(
      managerUser,
      "appointment-1",
      {
        reservationId: "reservation-proposed",
        expectedAppointmentVersion: 3,
        reasonCode: "RESOURCE_CANDIDATE_HELD",
        reasonNotes: "Hold Bay 1 before scheduling.",
        correlationId: "correlation-1"
      },
      harness.database,
      now
    );

    expect(result).toMatchObject({
      id: "reservation-proposed",
      resourceName: "Service Bay 1",
      status: "HELD",
      appointmentVersion: 4,
      availabilityStatus: "READY",
      warningReasons: []
    });
    expect(harness.updatedReservations).toEqual([
      {
        status: "HELD"
      }
    ]);
    expect(harness.createdHistory).toHaveLength(1);
  });

  it("holds missing-time draft candidates using the proposed reservation window", async () => {
    const proposedAppointment = appointment({
      startsAt: null,
      endsAt: null
    });
    const harness = database({
      appointment: proposedAppointment
    });

    const result = await holdAppointmentResourceCandidate(
      managerUser,
      "appointment-1",
      {
        reservationId: "reservation-proposed",
        expectedAppointmentVersion: 3,
        reasonCode: "RESOURCE_CANDIDATE_HELD",
        reasonNotes: "Hold Bay 1 for the selected draft slot."
      },
      harness.database,
      now
    );

    expect(result).toMatchObject({
      id: "reservation-proposed",
      status: "HELD",
      startsAt: proposedAppointment.resourceRequirements[0].reservations[0].startsAt,
      endsAt: proposedAppointment.resourceRequirements[0].reservations[0].endsAt,
      availabilityStatus: "READY"
    });
    expect(harness.updatedReservations).toEqual([
      {
        status: "HELD"
      }
    ]);
  });

  it("blocks holds when the candidate became unavailable", async () => {
    const proposedAppointment = appointment();
    const proposedReservation =
      proposedAppointment.resourceRequirements[0].reservations[0];
    const harness = database({
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
    });

    await expect(
      holdAppointmentResourceCandidate(
        managerUser,
        "appointment-1",
        {
          reservationId: "reservation-proposed",
          expectedAppointmentVersion: 3,
          reasonCode: "RESOURCE_CANDIDATE_HELD",
          reasonNotes: "Hold Bay 1 before scheduling."
        },
        harness.database,
        now
      )
    ).rejects.toThrow("Resource candidate is no longer available to hold.");

    expect(harness.updatedReservations).toHaveLength(0);
    expect(harness.createdHistory).toHaveLength(0);
  });

  it("requires a manager warning override before holding warning-level candidates", async () => {
    const harness = database({
      appointment: warningAppointment()
    });

    await expect(
      holdAppointmentResourceCandidate(
        managerUser,
        "appointment-1",
        {
          reservationId: "reservation-proposed",
          expectedAppointmentVersion: 3,
          reasonCode: "RESOURCE_CANDIDATE_HELD",
          reasonNotes: "Hold Bay 1 before scheduling."
        },
        harness.database,
        now
      )
    ).rejects.toThrow("Resource warning must be overridden before this candidate can be held.");

    expect(harness.updatedReservations).toHaveLength(0);
    expect(harness.createdHistory).toHaveLength(0);
  });

  it("holds warning-level candidates after a matching manager override exists", async () => {
    const harness = database({
      appointment: warningAppointment(),
      warningOverrideExists: true
    });

    const result = await holdAppointmentResourceCandidate(
      managerUser,
      "appointment-1",
      {
        reservationId: "reservation-proposed",
        expectedAppointmentVersion: 3,
        reasonCode: "RESOURCE_CANDIDATE_HELD",
        reasonNotes: "Hold Bay 1 after manager warning override."
      },
      harness.database,
      now
    );

    expect(result).toMatchObject({
      status: "HELD",
      availabilityStatus: "WARNING",
      warningReasons: expect.arrayContaining([
        "Resource capacity is already reserved during the candidate window."
      ])
    });
    expect(harness.updatedReservations).toEqual([
      {
        status: "HELD"
      }
    ]);
    expect(harness.createdHistory).toHaveLength(1);
  });

  it("rejects stale appointment versions before holding the proposal", async () => {
    const harness = database({
      appointmentUpdateCount: 0
    });

    await expect(
      holdAppointmentResourceCandidate(
        managerUser,
        "appointment-1",
        {
          reservationId: "reservation-proposed",
          expectedAppointmentVersion: 2,
          reasonCode: "RESOURCE_CANDIDATE_HELD",
          reasonNotes: "Hold Bay 1 before scheduling."
        },
        harness.database,
        now
      )
    ).rejects.toThrow("Appointment version is stale.");

    expect(harness.updatedReservations).toHaveLength(0);
    expect(harness.createdHistory).toHaveLength(0);
  });
});

describe("appointment resource reservation release service", () => {
  function appointmentWithReleasableReservation(
    status: "HELD" | "COMMITTED" = "HELD"
  ): AppointmentResourceCandidateAvailabilityAppointmentRecord {
    const baseAppointment = appointment();
    const baseRequirement = baseAppointment.resourceRequirements[0];
    const baseReservation = baseRequirement.reservations[0];

    return {
      ...baseAppointment,
      bookingStatus: status === "COMMITTED" ? "SCHEDULED" : "DRAFT",
      resourceRequirements: [
        {
          ...baseRequirement,
          reservations: [
            {
              ...baseReservation,
              id: `reservation-${status.toLowerCase()}`,
              status
            }
          ]
        }
      ]
    };
  }

  function database(input?: {
    appointment?: AppointmentResourceCandidateAvailabilityAppointmentRecord | null;
    access?: AppointmentResourceCandidateAvailabilityLocationAccessRecord | null;
    appointmentUpdateCount?: number;
    reservationUpdateCount?: number;
  }) {
    const createdHistory: unknown[] = [];
    const updatedReservations: unknown[] = [];

    return {
      createdHistory,
      updatedReservations,
      database: {
        appointment: {
          async findUnique() {
            return input?.appointment === undefined
              ? appointmentWithReleasableReservation()
              : input.appointment;
          }
        },
        userLocationAccess: {
          async findFirst() {
            return input?.access === undefined ? access() : input.access;
          }
        },
        appointmentHistoryEvent: {
          async findFirst() {
            return null;
          }
        },
        async $transaction(operation: (tx: unknown) => Promise<unknown>) {
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
                updatedReservations.push(updateInput.data);

                return {
                  count: input?.reservationUpdateCount ?? 1
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

  it("releases a held reservation with version guard and history", async () => {
    const harness = database();

    const result = await releaseAppointmentResourceReservation(
      managerUser,
      "appointment-1",
      {
        reservationId: "reservation-held",
        expectedAppointmentVersion: 3,
        reasonCode: "RESOURCE_RESERVATION_RELEASED",
        reasonNotes: "Release Bay 1 after customer changed timing.",
        correlationId: "correlation-release-1"
      },
      harness.database,
      now
    );

    expect(result).toMatchObject({
      id: "reservation-held",
      resourceName: "Service Bay 1",
      priorStatus: "HELD",
      status: "RELEASED",
      appointmentVersion: 4
    });
    expect(harness.updatedReservations).toEqual([
      {
        status: "RELEASED"
      }
    ]);
    expect(harness.createdHistory).toHaveLength(1);
  });

  it("releases a committed reservation from a scheduled appointment", async () => {
    const harness = database({
      appointment: appointmentWithReleasableReservation("COMMITTED")
    });

    const result = await releaseAppointmentResourceReservation(
      managerUser,
      "appointment-1",
      {
        reservationId: "reservation-committed",
        expectedAppointmentVersion: 3,
        reasonCode: "RESOURCE_RESERVATION_RELEASED",
        reasonNotes: "Release committed Bay 1 after manager reassignment."
      },
      harness.database,
      now
    );

    expect(result).toMatchObject({
      id: "reservation-committed",
      priorStatus: "COMMITTED",
      status: "RELEASED"
    });
    expect(harness.createdHistory).toHaveLength(1);
  });

  it("rejects stale appointment versions before release", async () => {
    const harness = database({
      appointmentUpdateCount: 0
    });

    await expect(
      releaseAppointmentResourceReservation(
        managerUser,
        "appointment-1",
        {
          reservationId: "reservation-held",
          expectedAppointmentVersion: 2,
          reasonCode: "RESOURCE_RESERVATION_RELEASED",
          reasonNotes: "Release Bay 1 after customer changed timing."
        },
        harness.database,
        now
      )
    ).rejects.toThrow("Appointment version is stale.");

    expect(harness.updatedReservations).toHaveLength(0);
    expect(harness.createdHistory).toHaveLength(0);
  });
});

describe("appointment resource warning override service", () => {
  function database(input?: {
    appointment?: AppointmentResourceCandidateAvailabilityAppointmentRecord | null;
    access?: AppointmentResourceCandidateAvailabilityLocationAccessRecord | null;
    appointmentUpdateCount?: number;
  }) {
    const createdHistory: Array<{ eventType?: string; priorValue?: unknown; newValue?: unknown }> = [];

    return {
      createdHistory,
      database: {
        appointment: {
          async findUnique() {
            return input?.appointment === undefined ? warningAppointment() : input.appointment;
          }
        },
        userLocationAccess: {
          async findFirst() {
            return input?.access === undefined ? access() : input.access;
          }
        },
        appointmentHistoryEvent: {
          async findFirst() {
            return null;
          }
        },
        async $transaction(operation: (tx: unknown) => Promise<unknown>) {
          return operation({
            appointment: {
              async updateMany() {
                return {
                  count: input?.appointmentUpdateCount ?? 1
                };
              }
            },
            appointmentHistoryEvent: {
              async create(createInput: { data: { eventType?: string; priorValue?: unknown; newValue?: unknown } }) {
                createdHistory.push(createInput.data);
              }
            }
          });
        }
      }
    };
  }

  it("records a manager override for a warning-level resource candidate", async () => {
    const harness = database();

    const result = await overrideAppointmentResourceWarning(
      managerUser,
      "appointment-1",
      {
        reservationId: "reservation-proposed",
        expectedAppointmentVersion: 3,
        reasonCode: "RESOURCE_WARNING_OVERRIDDEN",
        reasonNotes: "Manager accepts the warning because the customer will wait.",
        correlationId: "correlation-warning-1"
      },
      harness.database,
      now
    );

    expect(result).toMatchObject({
      appointmentId: "appointment-1",
      reservationId: "reservation-proposed",
      resourceName: "Service Bay 1",
      status: "OVERRIDDEN",
      warningCode: "RESOURCE_WARNING",
      appointmentVersion: 4,
      reasons: expect.arrayContaining([
        "Resource capacity is already reserved during the candidate window.",
        "Resource does not have enough available capacity."
      ])
    });
    expect(harness.createdHistory).toHaveLength(1);
    expect(harness.createdHistory[0]).toMatchObject({
      eventType: "WARNING_OVERRIDDEN",
      newValue: {
        status: "OVERRIDDEN"
      }
    });
  });

  it("does not override hard-blocked resource candidates", async () => {
    const baseAppointment = appointment();
    const baseRequirement = baseAppointment.resourceRequirements[0];
    const baseReservation = baseRequirement.reservations[0];
    const harness = database({
      appointment: {
        ...baseAppointment,
        resourceRequirements: [
          {
            ...baseRequirement,
            reservations: [
              {
                ...baseReservation,
                resource: {
                  ...baseReservation.resource,
                  reservations: [
                    {
                      id: "reservation-committed",
                      appointmentId: "appointment-2",
                      status: "COMMITTED",
                      startsAt: baseReservation.startsAt,
                      endsAt: baseReservation.endsAt,
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
    });

    await expect(
      overrideAppointmentResourceWarning(
        managerUser,
        "appointment-1",
        {
          reservationId: "reservation-proposed",
          expectedAppointmentVersion: 3,
          reasonCode: "RESOURCE_WARNING_OVERRIDDEN",
          reasonNotes: "Attempt to override hard block."
        },
        harness.database,
        now
      )
    ).rejects.toThrow("Resource hard blocks cannot be overridden.");

    expect(harness.createdHistory).toHaveLength(0);
  });

  it("rejects non-manager warning overrides", async () => {
    const harness = database({
      access: access({
        canManageAppointments: false
      })
    });

    await expect(
      overrideAppointmentResourceWarning(
        managerUser,
        "appointment-1",
        {
          reservationId: "reservation-proposed",
          expectedAppointmentVersion: 3,
          reasonCode: "RESOURCE_WARNING_OVERRIDDEN",
          reasonNotes: "Owner accepts warning without manager rights."
        },
        harness.database,
        now
      )
    ).rejects.toThrow("Only an authorized manager can override appointment warnings.");

    expect(harness.createdHistory).toHaveLength(0);
  });

  it("rejects stale appointment versions before writing override history", async () => {
    const harness = database({
      appointmentUpdateCount: 0
    });

    await expect(
      overrideAppointmentResourceWarning(
        managerUser,
        "appointment-1",
        {
          reservationId: "reservation-proposed",
          expectedAppointmentVersion: 2,
          reasonCode: "RESOURCE_WARNING_OVERRIDDEN",
          reasonNotes: "Stale manager override attempt."
        },
        harness.database,
        now
      )
    ).rejects.toThrow("Appointment version is stale.");

    expect(harness.createdHistory).toHaveLength(0);
  });
});
