import { BusinessDay } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  commitAppointmentResourceReservationsAtomically,
  releaseAppointmentResourceReservationsAtomically,
  type AppointmentCommittedResourceReservation,
  type AppointmentReservationCommitCandidate,
  type AppointmentReservationCommitRepository,
  type AppointmentReservationReleaseCandidate,
  type CreateAppointmentResourceReservationInput,
  type ReleaseAppointmentResourceReservationsInput
} from "@/server/appointments/appointment-reservation-commit-service";
import { locationLocalDateMinuteToInstant } from "@/server/appointments/location-time-service";
import type {
  ResourceAvailabilityOperatingWindow,
  ResourceAvailabilityReservation,
  ResourceAvailabilityResource
} from "@/server/appointments/resource-availability-service";

const timezone = "America/Chicago";
const locationId = "loc-time-motor-sales-minneapolis";

const mondayWindow: ResourceAvailabilityOperatingWindow = {
  businessDay: BusinessDay.MONDAY,
  opensAtMinute: 9 * 60,
  closesAtMinute: 18 * 60,
  capacityOverride: null,
  validFrom: new Date("2026-01-01T00:00:00.000Z"),
  validTo: null
};

const vehicleResource: ResourceAvailabilityResource = {
  id: "resource-vehicle-camry",
  name: "2018 Toyota Camry",
  status: "ACTIVE",
  capacityMode: "EXCLUSIVE",
  capacity: 1,
  conflictPolicy: "HARD_BLOCK",
  effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
  effectiveTo: null
};

const bayResource: ResourceAvailabilityResource = {
  id: "resource-service-bay-1",
  name: "Service Bay 1",
  status: "ACTIVE",
  capacityMode: "EXCLUSIVE",
  capacity: 1,
  conflictPolicy: "HARD_BLOCK",
  effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
  effectiveTo: null
};

const warningStaffResource: ResourceAvailabilityResource = {
  id: "resource-staff-brock",
  name: "Brock Peterson",
  status: "ACTIVE",
  capacityMode: "CAPACITY",
  capacity: 1,
  conflictPolicy: "WARNING",
  effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
  effectiveTo: null
};

function localInstant(localDate: string, hour: number, minute = 0) {
  return locationLocalDateMinuteToInstant({
    localDate,
    minuteOfDay: hour * 60 + minute,
    timezone
  });
}

function overlaps(leftStart: Date, leftEnd: Date, rightStart: Date, rightEnd: Date) {
  return leftStart < rightEnd && rightStart < leftEnd;
}

function addMinutes(value: Date, minutes: number) {
  return new Date(value.getTime() + minutes * 60 * 1000);
}

function bufferedReservationWindow(reservation: ResourceAvailabilityReservation) {
  return {
    startsAt: addMinutes(reservation.startsAt, -(reservation.bufferBeforeMinutes ?? 0)),
    endsAt: addMinutes(reservation.endsAt, reservation.bufferAfterMinutes ?? 0)
  };
}

function createRepositoryHarness(existing: ResourceAvailabilityReservation[] = []) {
  const lockCalls: string[][] = [];
  const createdInputs: CreateAppointmentResourceReservationInput[][] = [];
  const releasedInputs: ReleaseAppointmentResourceReservationsInput[] = [];
  const storedReservations: ResourceAvailabilityReservation[] = [...existing];

  const repository: AppointmentReservationCommitRepository = {
    async withResourceReservationTransaction(resourceIds, operation) {
      lockCalls.push(resourceIds);

      return operation({
        async findReservationsForResource(input) {
          return storedReservations.filter((reservation) => {
            if (reservation.resourceId !== input.resourceId) {
              return false;
            }

            const window = bufferedReservationWindow(reservation);
            return overlaps(input.startsAt, input.endsAt, window.startsAt, window.endsAt);
          });
        },
        async createResourceReservations(inputs) {
          createdInputs.push(inputs);

          const now = new Date("2026-07-06T15:00:00.000Z");
          const records: AppointmentCommittedResourceReservation[] = inputs.map(
            (input, index) => ({
              id: `reservation-created-${storedReservations.length + index + 1}`,
              ...input,
              createdAt: now,
              updatedAt: now
            })
          );

          storedReservations.push(...records);
          return records;
        },
        async releaseResourceReservations(input) {
          releasedInputs.push(input);

          return input.reservationIds.map((id) => {
            const reservation = storedReservations.find((entry) => entry.id === id);

            if (!reservation) {
              throw new Error(`Missing reservation fixture ${id}.`);
            }

            reservation.status = input.status;

            return {
              id,
              resourceId: reservation.resourceId,
              status: input.status,
              releasedAt: input.releasedAt,
              releasedByUserId: input.releasedByUserId,
              reasonCode: input.reasonCode,
              reasonNotes: input.reasonNotes
            };
          });
        }
      });
    }
  };

  return {
    createdInputs,
    lockCalls,
    releasedInputs,
    repository,
    storedReservations
  };
}

function candidate(
  resource: ResourceAvailabilityResource,
  overrides: Partial<AppointmentReservationCommitCandidate> = {}
): AppointmentReservationCommitCandidate {
  return {
    appointmentId: "appointment-1",
    appointmentLocationId: locationId,
    requirementCode: resource.id.includes("bay") ? "SERVICE_BAY" : "VEHICLE",
    resource,
    resourceLocationId: locationId,
    operatingWindows: [mondayWindow],
    unavailability: [],
    startsAt: localInstant("2026-07-06", 10),
    endsAt: localInstant("2026-07-06", 11),
    capacityUnits: 1,
    bufferBeforeMinutes: 15,
    bufferAfterMinutes: 15,
    ...overrides
  };
}

describe("appointment reservation commit service", () => {
  it("locks resources deterministically and creates reservations only after evaluation passes", async () => {
    const harness = createRepositoryHarness();
    const result = await commitAppointmentResourceReservationsAtomically({
      repository: harness.repository,
      timezone,
      candidates: [candidate(vehicleResource), candidate(bayResource)]
    });

    expect(result.committed).toBe(true);
    expect(result.conflicts).toEqual([]);
    expect(result.reservations).toHaveLength(2);
    expect(harness.lockCalls).toEqual([
      ["resource-service-bay-1", "resource-vehicle-camry"]
    ]);
    expect(harness.createdInputs).toHaveLength(1);
    expect(harness.createdInputs[0]).toEqual([
      expect.objectContaining({
        appointmentId: "appointment-1",
        resourceId: "resource-vehicle-camry",
        status: "COMMITTED",
        bufferBeforeMinutes: 15,
        bufferAfterMinutes: 15
      }),
      expect.objectContaining({
        appointmentId: "appointment-1",
        resourceId: "resource-service-bay-1",
        status: "COMMITTED"
      })
    ]);
  });

  it("prevents a second commit from overbooking an exclusive resource", async () => {
    const harness = createRepositoryHarness();
    const first = await commitAppointmentResourceReservationsAtomically({
      repository: harness.repository,
      timezone,
      candidates: [candidate(vehicleResource)]
    });
    const second = await commitAppointmentResourceReservationsAtomically({
      repository: harness.repository,
      timezone,
      candidates: [
        candidate(vehicleResource, {
          appointmentId: "appointment-2"
        })
      ]
    });

    expect(first.committed).toBe(true);
    expect(second).toMatchObject({
      committed: false,
      reservations: [],
      conflicts: [
        {
          code: "RESOURCE_CAPACITY_UNAVAILABLE",
          appointmentId: "appointment-2",
          requirementCode: "VEHICLE",
          resourceId: vehicleResource.id,
          message: "Resource capacity is unavailable for reservation commitment."
        }
      ]
    });
    expect(harness.createdInputs).toHaveLength(1);
  });

  it("treats held reservations as capacity-consuming during commitment", async () => {
    const heldReservation: ResourceAvailabilityReservation = {
      id: "reservation-held",
      appointmentId: "appointment-existing",
      resourceId: vehicleResource.id,
      status: "HELD",
      startsAt: localInstant("2026-07-06", 10),
      endsAt: localInstant("2026-07-06", 11),
      capacityUnits: 1
    };
    const harness = createRepositoryHarness([heldReservation]);
    const result = await commitAppointmentResourceReservationsAtomically({
      repository: harness.repository,
      timezone,
      candidates: [candidate(vehicleResource)]
    });

    expect(result.committed).toBe(false);
    expect(result.conflicts[0]?.reasons).toEqual([
      "Resource capacity is already reserved during the candidate window.",
      "Resource does not have enough available capacity."
    ]);
    expect(harness.createdInputs).toEqual([]);
  });

  it("does not create partial reservations when one candidate fails", async () => {
    const existingBayReservation: ResourceAvailabilityReservation = {
      id: "reservation-bay",
      appointmentId: "appointment-existing",
      resourceId: bayResource.id,
      status: "COMMITTED",
      startsAt: localInstant("2026-07-06", 10),
      endsAt: localInstant("2026-07-06", 11),
      capacityUnits: 1
    };
    const harness = createRepositoryHarness([existingBayReservation]);
    const result = await commitAppointmentResourceReservationsAtomically({
      repository: harness.repository,
      timezone,
      candidates: [candidate(vehicleResource), candidate(bayResource)]
    });

    expect(result.committed).toBe(false);
    expect(result.reservations).toEqual([]);
    expect(result.conflicts).toHaveLength(1);
    expect(harness.createdInputs).toEqual([]);
  });

  it("blocks warning resources by default but permits them when warning commitment is allowed", async () => {
    const staffReservation: ResourceAvailabilityReservation = {
      id: "reservation-staff",
      appointmentId: "appointment-existing",
      resourceId: warningStaffResource.id,
      status: "COMMITTED",
      startsAt: localInstant("2026-07-06", 10),
      endsAt: localInstant("2026-07-06", 11),
      capacityUnits: 1
    };
    const blockedHarness = createRepositoryHarness([staffReservation]);
    const allowedHarness = createRepositoryHarness([staffReservation]);
    const staffCandidate = candidate(warningStaffResource, {
      requirementCode: "OWNER_STAFF"
    });
    const blocked = await commitAppointmentResourceReservationsAtomically({
      repository: blockedHarness.repository,
      timezone,
      candidates: [staffCandidate]
    });
    const allowed = await commitAppointmentResourceReservationsAtomically({
      repository: allowedHarness.repository,
      timezone,
      candidates: [staffCandidate],
      allowWarningCommit: true
    });

    expect(blocked).toMatchObject({
      committed: false,
      conflicts: [
        {
          code: "RESOURCE_WARNING_NOT_ALLOWED",
          resourceId: warningStaffResource.id
        }
      ]
    });
    expect(allowed.committed).toBe(true);
    expect(allowed.reservations).toHaveLength(1);
  });

  it("releases only held or committed reservations with a documented reason", async () => {
    const releaseAt = new Date("2026-07-06T20:00:00.000Z");
    const releasable: AppointmentReservationReleaseCandidate = {
      id: "reservation-committed",
      resourceId: vehicleResource.id,
      status: "COMMITTED"
    };
    const alreadyReleased: AppointmentReservationReleaseCandidate = {
      id: "reservation-released",
      resourceId: bayResource.id,
      status: "RELEASED"
    };
    const harness = createRepositoryHarness([
      {
        ...releasable,
        appointmentId: "appointment-1",
        startsAt: localInstant("2026-07-06", 10),
        endsAt: localInstant("2026-07-06", 11),
        capacityUnits: 1
      },
      {
        ...alreadyReleased,
        appointmentId: "appointment-1",
        startsAt: localInstant("2026-07-06", 10),
        endsAt: localInstant("2026-07-06", 11),
        capacityUnits: 1
      }
    ]);

    await expect(
      releaseAppointmentResourceReservationsAtomically({
        repository: harness.repository,
        reservations: [releasable],
        releasedAt: releaseAt,
        reasonCode: " ",
        reasonNotes: "Customer cancelled."
      })
    ).rejects.toThrow(/reason code/i);

    const released = await releaseAppointmentResourceReservationsAtomically({
      repository: harness.repository,
      reservations: [alreadyReleased, releasable],
      releasedAt: releaseAt,
      releasedByUserId: "user-manager",
      reasonCode: "CUSTOMER_CANCELLED",
      reasonNotes: "Customer cancelled and resources should be released."
    });

    expect(harness.lockCalls.at(-1)).toEqual([
      "resource-service-bay-1",
      "resource-vehicle-camry"
    ]);
    expect(released).toEqual([
      {
        id: "reservation-committed",
        resourceId: vehicleResource.id,
        status: "RELEASED",
        releasedAt: releaseAt,
        releasedByUserId: "user-manager",
        reasonCode: "CUSTOMER_CANCELLED",
        reasonNotes: "Customer cancelled and resources should be released."
      }
    ]);
    expect(harness.releasedInputs).toEqual([
      {
        reservationIds: ["reservation-committed"],
        status: "RELEASED",
        releasedAt: releaseAt,
        releasedByUserId: "user-manager",
        reasonCode: "CUSTOMER_CANCELLED",
        reasonNotes: "Customer cancelled and resources should be released."
      }
    ]);
  });
});
