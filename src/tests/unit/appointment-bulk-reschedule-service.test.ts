import { BusinessDay, LocationSchedulingStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  dryRunBulkReschedule,
  executeBulkReschedule,
  type AppointmentBulkRescheduleExecutionRepository,
  type AppointmentBulkRescheduleStoredOperation,
  type AppointmentBulkRescheduleTarget
} from "@/server/appointments/appointment-bulk-reschedule-service";
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

function getTemplate(): AppointmentTemplateDefinition {
  const template = getInitialAppointmentTemplateDefinition("APT-TEST-DRIVE");

  if (!template) {
    throw new Error("Missing test-drive template fixture.");
  }

  return template;
}

function baseTarget(overrides: Partial<AppointmentBulkRescheduleTarget> = {}) {
  const appointmentId = overrides.current?.appointmentId ?? "appointment-1";

  return {
    itemId: `item-${appointmentId}`,
    current: {
      appointmentId,
      startsAt: localInstant("2026-07-06", 10),
      endsAt: localInstant("2026-07-06", 10, 45),
      reservations: [
        {
          id: `reservation-${appointmentId}`,
          requirementCode: "VEHICLE",
          resourceId: vehicleResource.id,
          status: "COMMITTED" as const,
          startsAt: localInstant("2026-07-06", 10),
          endsAt: localInstant("2026-07-06", 10, 45),
          capacityUnits: 1,
          bufferBeforeMinutes: 15,
          bufferAfterMinutes: 15
        }
      ]
    },
    proposedStartsAt: localInstant("2026-07-06", 11),
    candidate: {
      template: getTemplate(),
      location: activeLocation,
      locationOperatingWindows: [mondayWindow],
      locationClosures: [],
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
          resource: vehicleResource,
          operatingWindows: [mondayWindow],
          unavailability: [],
          reservations: []
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
    },
    permission: {
      canReschedule: true
    },
    ...overrides
  } satisfies AppointmentBulkRescheduleTarget;
}

function createRepository(existing?: AppointmentBulkRescheduleStoredOperation | null) {
  let stored = existing ?? null;
  const saved: AppointmentBulkRescheduleStoredOperation[] = [];

  const repository: AppointmentBulkRescheduleExecutionRepository = {
    async findBulkRescheduleOperation() {
      return stored;
    },
    async saveBulkRescheduleOperation(operation) {
      stored = operation;
      saved.push(operation);
    }
  };

  return {
    repository,
    saved
  };
}

describe("appointment bulk reschedule service", () => {
  it("dry-runs targets into ready, warning, blocked, and unauthorized classifications", () => {
    const blockingReservation: ResourceAvailabilityReservation = {
      id: "reservation-blocking",
      appointmentId: "appointment-existing",
      resourceId: vehicleResource.id,
      status: "COMMITTED",
      startsAt: localInstant("2026-07-06", 11),
      endsAt: localInstant("2026-07-06", 12),
      capacityUnits: 1
    };
    const warningReservation: ResourceAvailabilityReservation = {
      id: "reservation-warning",
      appointmentId: "appointment-existing",
      resourceId: ownerStaffResource.id,
      status: "COMMITTED",
      startsAt: localInstant("2026-07-06", 11),
      endsAt: localInstant("2026-07-06", 12),
      capacityUnits: 1
    };
    const dryRun = dryRunBulkReschedule({
      operationId: "bulk-20260706-1",
      atomicityPolicy: "PARTIAL_ALLOWED",
      targets: [
        baseTarget({
          current: {
            ...baseTarget().current,
            appointmentId: "appointment-ready"
          }
        }),
        baseTarget({
          current: {
            ...baseTarget().current,
            appointmentId: "appointment-warning"
          },
          candidate: {
            ...baseTarget().candidate,
            staff: [
              {
                role: "OWNER",
                staff: owner,
                locationAccess: ownerAccess,
                staffResource: ownerStaffResource,
                operatingWindows: [mondayWindow],
                unavailability: [],
                reservations: [warningReservation]
              }
            ]
          }
        }),
        baseTarget({
          current: {
            ...baseTarget().current,
            appointmentId: "appointment-blocked"
          },
          candidate: {
            ...baseTarget().candidate,
            resources: [
              {
                requirementCode: "VEHICLE",
                resource: vehicleResource,
                operatingWindows: [mondayWindow],
                unavailability: [],
                reservations: [blockingReservation]
              }
            ]
          }
        }),
        baseTarget({
          current: {
            ...baseTarget().current,
            appointmentId: "appointment-unauthorized"
          },
          permission: {
            canReschedule: false,
            reason: "Appointment belongs to another location."
          }
        })
      ]
    });

    expect(dryRun.canExecute).toBe(true);
    expect(dryRun.previewToken).toMatch(/^sha256:/);
    expect(dryRun.summary).toMatchObject({
      total: 4,
      ready: 1,
      warning: 1,
      blocked: 1,
      unauthorized: 1
    });
    expect(dryRun.items.map((item) => item.status)).toEqual([
      "READY",
      "WARNING",
      "BLOCKED",
      "UNAUTHORIZED"
    ]);
    expect(dryRun.items[3]?.reasons).toEqual(["Appointment belongs to another location."]);
  });

  it("blocks all-or-nothing execution when any target is not ready", () => {
    const dryRun = dryRunBulkReschedule({
      operationId: "bulk-all-or-nothing",
      atomicityPolicy: "ALL_OR_NOTHING",
      targets: [
        baseTarget(),
        baseTarget({
          current: {
            ...baseTarget().current,
            appointmentId: "appointment-denied"
          },
          permission: {
            canReschedule: false
          }
        })
      ]
    });

    expect(dryRun.canExecute).toBe(false);
    expect(dryRun.summary).toMatchObject({
      ready: 1,
      unauthorized: 1
    });
  });

  it("executes only ready items for partial bulk reschedules and records skipped items", async () => {
    const dryRun = dryRunBulkReschedule({
      operationId: "bulk-partial-execute",
      atomicityPolicy: "PARTIAL_ALLOWED",
      targets: [
        baseTarget({
          current: {
            ...baseTarget().current,
            appointmentId: "appointment-ready"
          }
        }),
        baseTarget({
          current: {
            ...baseTarget().current,
            appointmentId: "appointment-skipped"
          },
          permission: {
            canReschedule: false,
            reason: "No access."
          }
        })
      ]
    });
    const executed: string[] = [];
    const harness = createRepository();
    const result = await executeBulkReschedule({
      dryRun,
      reasonCode: "LOCATION_CLOSURE",
      reasonNotes: "Snow closure requires moving appointments.",
      repository: harness.repository,
      async executor(item) {
        executed.push(item.appointmentId);
        return { message: "Rescheduled in command layer." };
      }
    });

    expect(executed).toEqual(["appointment-ready"]);
    expect(result).toMatchObject({
      duplicate: false,
      reasonCode: "LOCATION_CLOSURE",
      canRetryFailedItems: false,
      summary: {
        total: 2,
        skipped: 1,
        succeeded: 1,
        failed: 0
      }
    });
    expect(result.items.map((item) => item.status)).toEqual(["SUCCEEDED", "SKIPPED"]);
    expect(harness.saved).toHaveLength(1);
  });

  it("requires a reason before controlled execution", async () => {
    const dryRun = dryRunBulkReschedule({
      operationId: "bulk-reason-required",
      atomicityPolicy: "PARTIAL_ALLOWED",
      targets: [baseTarget()]
    });
    const harness = createRepository();

    await expect(
      executeBulkReschedule({
        dryRun,
        reasonCode: "",
        reasonNotes: "Moving appointments.",
        repository: harness.repository,
        async executor() {
          return undefined;
        }
      })
    ).rejects.toThrow(/reason code/i);
  });

  it("returns an idempotent duplicate result for the same operation and preview token", async () => {
    const dryRun = dryRunBulkReschedule({
      operationId: "bulk-idempotent",
      atomicityPolicy: "PARTIAL_ALLOWED",
      targets: [baseTarget()]
    });
    const harness = createRepository();
    const first = await executeBulkReschedule({
      dryRun,
      reasonCode: "STAFF_ABSENCE",
      reasonNotes: "Owner is unavailable.",
      repository: harness.repository,
      async executor() {
        return { message: "Applied once." };
      }
    });
    let secondExecutorCalled = false;
    const second = await executeBulkReschedule({
      dryRun,
      reasonCode: "STAFF_ABSENCE",
      reasonNotes: "Owner is unavailable.",
      repository: harness.repository,
      async executor() {
        secondExecutorCalled = true;
        return { message: "Should not run." };
      }
    });

    expect(first.duplicate).toBe(false);
    expect(second.duplicate).toBe(true);
    expect(second.items).toEqual(first.items);
    expect(secondExecutorCalled).toBe(false);
    expect(harness.saved).toHaveLength(1);
  });

  it("rejects operation ID reuse for a different dry run", async () => {
    const dryRun = dryRunBulkReschedule({
      operationId: "bulk-reused",
      atomicityPolicy: "PARTIAL_ALLOWED",
      targets: [baseTarget()]
    });
    const conflictingDryRun = dryRunBulkReschedule({
      operationId: "bulk-reused",
      atomicityPolicy: "PARTIAL_ALLOWED",
      targets: [
        baseTarget({
          proposedStartsAt: localInstant("2026-07-06", 12)
        })
      ]
    });
    const harness = createRepository({
      operationId: dryRun.operationId,
      previewToken: dryRun.previewToken,
      result: {
        operationId: dryRun.operationId,
        previewToken: dryRun.previewToken,
        duplicate: false,
        atomicityPolicy: "PARTIAL_ALLOWED",
        reasonCode: "FIRST",
        reasonNotes: "First operation.",
        canRetryFailedItems: false,
        items: [],
        summary: {
          total: 0,
          ready: 0,
          warning: 0,
          blocked: 0,
          unauthorized: 0,
          skipped: 0,
          succeeded: 0,
          failed: 0
        }
      }
    });

    await expect(
      executeBulkReschedule({
        dryRun: conflictingDryRun,
        reasonCode: "SECOND",
        reasonNotes: "Second operation.",
        repository: harness.repository,
        async executor() {
          return undefined;
        }
      })
    ).rejects.toThrow(/different dry run/i);
  });
});
