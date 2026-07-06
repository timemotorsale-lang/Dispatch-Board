import { BusinessDay, LocationSchedulingStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { APPOINTMENT_OPERATIONAL_BASELINE } from "@/server/appointments/operational-assumptions";
import { searchAppointmentAvailability } from "@/server/appointments/appointment-availability-search-service";
import { dryRunBulkReschedule } from "@/server/appointments/appointment-bulk-reschedule-service";
import {
  commitAppointmentResourceReservationsAtomically,
  type AppointmentCommittedResourceReservation,
  type AppointmentReservationCommitCandidate,
  type AppointmentReservationCommitRepository
} from "@/server/appointments/appointment-reservation-commit-service";
import {
  getInitialAppointmentTemplateDefinition,
  type AppointmentTemplateDefinition
} from "@/server/appointments/appointment-template-domain";
import { locationLocalDateMinuteToInstant } from "@/server/appointments/location-time-service";
import type {
  ResourceAvailabilityOperatingWindow,
  ResourceAvailabilityReservation,
  ResourceAvailabilityResource
} from "@/server/appointments/resource-availability-service";
import type {
  StaffAvailabilityUser,
  StaffLocationAccess,
  StaffResource
} from "@/server/appointments/staff-availability-service";

const timezone = "America/Chicago";
const locationId = "loc-time-motor-sales-minneapolis";

const activeLocation = {
  id: locationId,
  timezone,
  schedulingStatus: LocationSchedulingStatus.ACTIVE
};

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

const owner: StaffAvailabilityUser = {
  id: "user-brock",
  name: "Brock Peterson",
  isActive: true
};

const ownerAccess: StaffLocationAccess = {
  userId: owner.id,
  locationId,
  canViewSchedule: true,
  canParticipate: true,
  canOwnAppointments: true,
  canManageAppointments: false,
  canViewLimitedData: true,
  validFrom: new Date("2026-01-01T00:00:00.000Z"),
  validTo: null
};

const ownerStaffResource: StaffResource = {
  id: "resource-staff-brock",
  locationId,
  resourceKind: "STAFF",
  userId: owner.id,
  name: owner.name,
  status: "ACTIVE",
  capacityMode: "CAPACITY",
  capacity: 50,
  conflictPolicy: "WARNING",
  effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
  effectiveTo: null
};

function getTemplate(): AppointmentTemplateDefinition {
  const template = getInitialAppointmentTemplateDefinition("APT-TEST-DRIVE");

  if (!template) {
    throw new Error("Missing test-drive template fixture.");
  }

  return template;
}

function localInstant(localDate: string, hour: number, minute = 0) {
  return locationLocalDateMinuteToInstant({
    localDate,
    minuteOfDay: hour * 60 + minute,
    timezone
  });
}

function addMinutes(value: Date, minutes: number) {
  return new Date(value.getTime() + minutes * 60 * 1000);
}

function overlaps(leftStart: Date, leftEnd: Date, rightStart: Date, rightEnd: Date) {
  return leftStart < rightEnd && rightStart < leftEnd;
}

function bufferedReservationWindow(reservation: ResourceAvailabilityReservation) {
  return {
    startsAt: addMinutes(reservation.startsAt, -(reservation.bufferBeforeMinutes ?? 0)),
    endsAt: addMinutes(reservation.endsAt, reservation.bufferAfterMinutes ?? 0)
  };
}

function createTransactionalRepositoryHarness(input?: {
  existing?: ResourceAvailabilityReservation[];
  failCreate?: boolean;
}) {
  let queue = Promise.resolve();
  const lockCalls: string[][] = [];
  const storedReservations: ResourceAvailabilityReservation[] = [...(input?.existing ?? [])];

  const repository: AppointmentReservationCommitRepository = {
    async withResourceReservationTransaction(resourceIds, operation) {
      const run = queue.then(async () => {
        lockCalls.push(resourceIds);

        const stagedReservations: ResourceAvailabilityReservation[] = [];
        const result = await operation({
          async findReservationsForResource(search) {
            return [...storedReservations, ...stagedReservations].filter((reservation) => {
              if (reservation.resourceId !== search.resourceId) {
                return false;
              }

              const window = bufferedReservationWindow(reservation);
              return overlaps(search.startsAt, search.endsAt, window.startsAt, window.endsAt);
            });
          },
          async createResourceReservations(reservations) {
            if (input?.failCreate) {
              throw new Error("Simulated database write failure.");
            }

            const now = new Date("2026-07-06T15:00:00.000Z");
            const records: AppointmentCommittedResourceReservation[] = reservations.map(
              (reservation, index) => ({
                id: `reservation-${storedReservations.length + stagedReservations.length + index + 1}`,
                ...reservation,
                createdAt: now,
                updatedAt: now
              })
            );

            stagedReservations.push(...records);
            return records;
          },
          async releaseResourceReservations(inputToRelease) {
            const records = inputToRelease.reservationIds.map((id) => {
              const reservation = [...storedReservations, ...stagedReservations].find(
                (candidate) => candidate.id === id
              );

              if (!reservation) {
                throw new Error(`Missing reservation fixture ${id}.`);
              }

              reservation.status = inputToRelease.status;

              return {
                id,
                resourceId: reservation.resourceId,
                status: inputToRelease.status,
                releasedAt: inputToRelease.releasedAt,
                releasedByUserId: inputToRelease.releasedByUserId,
                reasonCode: inputToRelease.reasonCode,
                reasonNotes: inputToRelease.reasonNotes
              };
            });

            return records;
          }
        });

        storedReservations.push(...stagedReservations);
        return result;
      });

      queue = run.then(
        () => undefined,
        () => undefined
      );

      return run;
    }
  };

  return {
    lockCalls,
    repository,
    storedReservations
  };
}

function reservationCandidate(
  appointmentId: string
): AppointmentReservationCommitCandidate {
  return {
    appointmentId,
    appointmentLocationId: locationId,
    requirementCode: "VEHICLE",
    resource: vehicleResource,
    resourceLocationId: locationId,
    operatingWindows: [mondayWindow],
    unavailability: [],
    startsAt: localInstant("2026-07-06", 10),
    endsAt: localInstant("2026-07-06", 11),
    capacityUnits: 1,
    bufferBeforeMinutes: 15,
    bufferAfterMinutes: 15
  };
}

function searchInput() {
  return {
    template: getTemplate(),
    location: activeLocation,
    locationOperatingWindows: [mondayWindow],
    locationClosures: [],
    windowStartLocalDate: "2026-07-06",
    windowEndLocalDate: "2026-07-06",
    earliestStartMinuteOfDay: 9 * 60 + 15,
    latestStartMinuteOfDay:
      9 * 60 + 15 + (APPOINTMENT_OPERATIONAL_BASELINE.volume.peakAppointmentsPerHour - 1) * 15,
    maximumResults: APPOINTMENT_OPERATIONAL_BASELINE.volume.peakAppointmentsPerHour,
    providedContextFields: [
      "customer",
      "vehicle",
      "owner",
      "driverEligibility",
      "location"
    ],
    resources: [
      {
        requirementCode: "VEHICLE",
        resource: {
          ...vehicleResource,
          capacityMode: "CAPACITY" as const,
          capacity: APPOINTMENT_OPERATIONAL_BASELINE.volume.peakAppointmentsPerHour
        },
        operatingWindows: [mondayWindow],
        unavailability: [],
        reservations: [],
        requiredCapacity: 1
      }
    ],
    staff: [
      {
        role: "OWNER" as const,
        staff: owner,
        locationAccess: ownerAccess,
        staffResource: ownerStaffResource,
        operatingWindows: [mondayWindow],
        unavailability: [],
        reservations: []
      }
    ]
  };
}

function bulkTarget(index: number) {
  return {
    itemId: `item-${index}`,
    current: {
      appointmentId: `appointment-${index}`,
      startsAt: localInstant("2026-07-06", 10),
      endsAt: localInstant("2026-07-06", 10, 45),
      reservations: []
    },
    proposedStartsAt: localInstant("2026-07-06", 11),
    candidate: {
      ...searchInput(),
      windowStartLocalDate: undefined,
      windowEndLocalDate: undefined,
      earliestStartMinuteOfDay: undefined,
      latestStartMinuteOfDay: undefined,
      maximumResults: undefined
    },
    permission: {
      canReschedule: true
    }
  };
}

describe("appointment scheduling engine E2 quality gate", () => {
  it("covers the approved scheduling production profile with explicit baseline values", () => {
    expect(APPOINTMENT_OPERATIONAL_BASELINE.volume).toMatchObject({
      peakAppointmentsPerBusinessDay: 125,
      peakAppointmentsPerHour: 24,
      concurrentCommandCenterUsers: 20,
      schedulableResources: 50,
      bulkOperationAppointmentLimit: 500
    });
    expect(APPOINTMENT_OPERATIONAL_BASELINE.performance.availabilitySearchP95Ms).toBe(1500);
  });

  it("searches the approved peak-hour appointment profile under the p95 target", () => {
    const startedAt = performance.now();
    const result = searchAppointmentAvailability(searchInput());
    const elapsedMs = performance.now() - startedAt;

    expect(result.availableSlots).toHaveLength(
      APPOINTMENT_OPERATIONAL_BASELINE.volume.peakAppointmentsPerHour
    );
    expect(result.blockedSlotCount).toBe(0);
    expect(result.warningSlots).toEqual([]);
    expect(elapsedMs).toBeLessThan(
      APPOINTMENT_OPERATIONAL_BASELINE.performance.availabilitySearchP95Ms
    );
  });

  it("allows exactly one concurrent exclusive-resource commitment to succeed", async () => {
    const harness = createTransactionalRepositoryHarness();
    const [first, second] = await Promise.all([
      commitAppointmentResourceReservationsAtomically({
        repository: harness.repository,
        timezone,
        candidates: [reservationCandidate("appointment-1")]
      }),
      commitAppointmentResourceReservationsAtomically({
        repository: harness.repository,
        timezone,
        candidates: [reservationCandidate("appointment-2")]
      })
    ]);

    const committedResults = [first, second].filter((result) => result.committed);
    const blockedResults = [first, second].filter((result) => !result.committed);

    expect(committedResults).toHaveLength(1);
    expect(blockedResults).toHaveLength(1);
    expect(blockedResults[0]?.conflicts[0]).toMatchObject({
      code: "RESOURCE_CAPACITY_UNAVAILABLE",
      resourceId: vehicleResource.id
    });
    expect(harness.storedReservations).toHaveLength(1);
    expect(harness.lockCalls).toEqual([[vehicleResource.id], [vehicleResource.id]]);
  });

  it("does not leave partial reservations when the transaction adapter fails", async () => {
    const harness = createTransactionalRepositoryHarness({ failCreate: true });

    await expect(
      commitAppointmentResourceReservationsAtomically({
        repository: harness.repository,
        timezone,
        candidates: [reservationCandidate("appointment-failure")]
      })
    ).rejects.toThrow(/database write failure/i);

    expect(harness.storedReservations).toEqual([]);
  });

  it("dry-runs the approved bulk-operation limit without executing any mutation", () => {
    const targets = Array.from(
      { length: APPOINTMENT_OPERATIONAL_BASELINE.volume.bulkOperationAppointmentLimit },
      (_, index) => bulkTarget(index + 1)
    );
    const dryRun = dryRunBulkReschedule({
      operationId: "bulk-quality-gate-500",
      atomicityPolicy: "ALL_OR_NOTHING",
      targets
    });

    expect(dryRun.summary).toMatchObject({
      total: APPOINTMENT_OPERATIONAL_BASELINE.volume.bulkOperationAppointmentLimit,
      ready: APPOINTMENT_OPERATIONAL_BASELINE.volume.bulkOperationAppointmentLimit,
      blocked: 0,
      unauthorized: 0,
      warning: 0
    });
    expect(dryRun.canExecute).toBe(true);
    expect(dryRun.previewToken).toMatch(/^sha256:/);
  });
});
