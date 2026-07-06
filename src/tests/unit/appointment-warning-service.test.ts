import { BusinessDay, LocationSchedulingStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  evaluateAppointmentHardConflicts,
  type AppointmentHardConflictEvaluationInput
} from "@/server/appointments/appointment-hard-conflict-service";
import { getInitialAppointmentTemplateDefinition } from "@/server/appointments/appointment-template-domain";
import {
  evaluateAppointmentWarnings,
  type AppointmentWarningSignal
} from "@/server/appointments/appointment-warning-service";
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
import type { AuthenticatedUser } from "@/server/auth/store";

const timezone = "America/Chicago";
const locationId = "loc-time-motor-sales-minneapolis";

const manager: AuthenticatedUser = {
  id: "user-manager",
  name: "Abdi Farah",
  email: "abdi@example.com",
  isActive: true,
  roles: ["General Manager"],
  duties: {
    direct: [],
    roleDefaults: [],
    all: []
  }
};

const ownerActor: AuthenticatedUser = {
  id: "user-brock",
  name: "Brock Peterson",
  email: "brock@example.com",
  isActive: true,
  roles: ["Service Advisor"],
  duties: {
    direct: [],
    roleDefaults: [],
    all: []
  }
};

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
  id: ownerActor.id,
  name: ownerActor.name,
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

const managerAccess: StaffLocationAccess = {
  ...ownerAccess,
  userId: manager.id,
  canManageAppointments: true
};

const ownerStaffResource: StaffResource = {
  id: "resource-staff-brock",
  locationId,
  resourceKind: "STAFF",
  userId: owner.id,
  name: owner.name,
  status: "ACTIVE",
  capacityMode: "CAPACITY",
  capacity: 2,
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

function getTemplate() {
  const template = getInitialAppointmentTemplateDefinition("APT-TEST-DRIVE");

  if (!template) {
    throw new Error("Missing test-drive template fixture.");
  }

  return template;
}

function baseInput(
  overrides: Partial<AppointmentHardConflictEvaluationInput> = {}
): AppointmentHardConflictEvaluationInput {
  return {
    template: getTemplate(),
    location: activeLocation,
    locationOperatingWindows: [mondayWindow],
    locationClosures: [],
    startsAt: localInstant("2026-07-06", 10),
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
        role: "OWNER",
        staff: owner,
        locationAccess: ownerAccess,
        staffResource: ownerStaffResource,
        operatingWindows: [mondayWindow],
        unavailability: [],
        reservations: []
      }
    ],
    ...overrides
  };
}

function staffOverlapInput() {
  const staffReservation: ResourceAvailabilityReservation = {
    appointmentId: "appointment-existing",
    status: "COMMITTED",
    startsAt: localInstant("2026-07-06", 10),
    endsAt: localInstant("2026-07-06", 11),
    capacityUnits: 2
  };

  return baseInput({
    staff: [
      {
        role: "OWNER",
        staff: owner,
        locationAccess: ownerAccess,
        staffResource: ownerStaffResource,
        operatingWindows: [mondayWindow],
        unavailability: [],
        reservations: [staffReservation]
      }
    ]
  });
}

describe("appointment warning service", () => {
  it("turns warning-only staff availability into unresolved manager-required warnings", () => {
    const hardConflictResult = evaluateAppointmentHardConflicts(staffOverlapInput());
    const warningResult = evaluateAppointmentWarnings({ hardConflictResult });

    expect(hardConflictResult.canCommit).toBe(true);
    expect(warningResult).toMatchObject({
      canCommit: false,
      hasHardConflicts: false
    });
    expect(warningResult.warnings).toHaveLength(2);
    expect(warningResult.unresolvedWarnings).toHaveLength(2);
    expect(warningResult.warnings[0]).toMatchObject({
      code: "STAFF_OVERLAP",
      source: "STAFF",
      staffUserId: owner.id,
      managerOverrideRequired: true
    });
  });

  it("rejects warning overrides from appointment owners", () => {
    const hardConflictResult = evaluateAppointmentHardConflicts(staffOverlapInput());
    const warningKey = evaluateAppointmentWarnings({ hardConflictResult }).warnings[0]
      ?.warningKey;

    expect(warningKey).toBeDefined();

    expect(() =>
      evaluateAppointmentWarnings({
        hardConflictResult,
        overrideRequests: [
          {
            warningKey: warningKey as string,
            actor: ownerActor,
            locationAccess: ownerAccess,
            reasonCode: "ACCEPTABLE_OVERLAP",
            reasonNotes: "Owner confirmed they can handle this appointment."
          }
        ]
      })
    ).toThrow(/authorized manager/i);
  });

  it("requires manager override reason code and notes", () => {
    const hardConflictResult = evaluateAppointmentHardConflicts(staffOverlapInput());
    const warningKey = evaluateAppointmentWarnings({ hardConflictResult }).warnings[0]
      ?.warningKey;

    expect(warningKey).toBeDefined();

    expect(() =>
      evaluateAppointmentWarnings({
        hardConflictResult,
        overrideRequests: [
          {
            warningKey: warningKey as string,
            actor: manager,
            locationAccess: managerAccess,
            reasonCode: "ACCEPTABLE_OVERLAP"
          }
        ]
      })
    ).toThrow(/reason notes/i);
  });

  it("creates auditable manager override records for selected warnings", () => {
    const hardConflictResult = evaluateAppointmentHardConflicts(staffOverlapInput());
    const initialWarningResult = evaluateAppointmentWarnings({ hardConflictResult });
    const occurredAt = new Date("2026-07-06T14:30:00.000Z");
    const warningResult = evaluateAppointmentWarnings({
      hardConflictResult,
      overrideRequests: initialWarningResult.warnings.map((warning) => ({
        warningKey: warning.warningKey,
        actor: manager,
        locationAccess: managerAccess,
        reasonCode: "MANAGER_ACCEPTED_CAPACITY",
        reasonNotes: "Manager confirmed Brock can cover both commitments.",
        occurredAt
      }))
    });

    expect(warningResult.canCommit).toBe(true);
    expect(warningResult.unresolvedWarnings).toEqual([]);
    expect(warningResult.overrideRecords).toHaveLength(2);
    expect(warningResult.overrideRecords[0]).toMatchObject({
      warningCode: "STAFF_OVERLAP",
      overriddenByUserId: manager.id,
      reasonCode: "MANAGER_ACCEPTED_CAPACITY",
      reasonNotes: "Manager confirmed Brock can cover both commitments.",
      occurredAt,
      newValue: {
        status: "OVERRIDDEN"
      }
    });
    expect(warningResult.overrideRecords[0]?.priorValue.warning.warningKey).toBe(
      initialWarningResult.warnings[0]?.warningKey
    );
  });

  it("does not block commitment for non-override informational warnings", () => {
    const hardConflictResult = evaluateAppointmentHardConflicts(baseInput());
    const confirmationWarning: AppointmentWarningSignal = {
      code: "CONFIRMATION_PENDING",
      source: "CONFIRMATION",
      message: "Customer confirmation is still pending near the appointment start.",
      managerOverrideRequired: false
    };
    const warningResult = evaluateAppointmentWarnings({
      hardConflictResult,
      warningSignals: [confirmationWarning]
    });

    expect(warningResult.canCommit).toBe(true);
    expect(warningResult.unresolvedWarnings).toEqual([]);

    expect(() =>
      evaluateAppointmentWarnings({
        hardConflictResult,
        warningSignals: [confirmationWarning],
        overrideRequests: [
          {
            warningKey: warningResult.warnings[0]?.warningKey ?? "",
            actor: manager,
            locationAccess: managerAccess,
            reasonCode: "ACKNOWLEDGED",
            reasonNotes: "Not a manager override warning."
          }
        ]
      })
    ).toThrow(/does not require a manager override/i);
  });

  it("surfaces duration overrides that require manager approval as warnings", () => {
    const hardConflictResult = evaluateAppointmentHardConflicts(
      baseInput({
        template: {
          ...getTemplate(),
          approvalMode: "MANAGER_REQUIRED"
        },
        durationOverride: {
          durationMinutes: 60,
          reasonCode: "CUSTOMER_COMPLEXITY"
        },
        durationOverrideActor: "OWNER"
      })
    );
    const warningResult = evaluateAppointmentWarnings({ hardConflictResult });

    expect(hardConflictResult.canCommit).toBe(true);
    expect(warningResult.canCommit).toBe(false);
    expect(warningResult.warnings).toEqual([
      expect.objectContaining({
        code: "DURATION_OVERRIDE_REQUIRES_MANAGER_APPROVAL",
        source: "DURATION",
        managerOverrideRequired: true
      })
    ]);
  });

  it("cannot turn a hard-blocked candidate into a committable one", () => {
    const hardConflictResult = evaluateAppointmentHardConflicts(
      baseInput({
        startsAt: localInstant("2026-07-06", 17, 30)
      })
    );
    const warningResult = evaluateAppointmentWarnings({
      hardConflictResult,
      warningSignals: [
        {
          code: "OWNER_WORKLOAD_THRESHOLD",
          source: "STAFF",
          message: "Owner workload exceeds the configured warning threshold.",
          managerOverrideRequired: true
        }
      ]
    });

    expect(hardConflictResult.canCommit).toBe(false);
    expect(warningResult.hasHardConflicts).toBe(true);
    expect(warningResult.canCommit).toBe(false);
  });
});
