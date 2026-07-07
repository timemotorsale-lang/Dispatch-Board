import {
  BusinessDay,
  LocationClosureType,
  LocationSchedulingStatus,
  ResourceCapacityMode,
  ResourceConflictPolicy,
  ResourceUnavailabilityType,
  SchedulableResourceStatus
} from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  type AppointmentAdminSettingsRepository,
  createAppointmentLocationClosureForManager,
  createAppointmentResourceUnavailabilityForManager,
  deleteAppointmentLocationClosureForManager,
  getAppointmentBoardSettings,
  normalizeAppointmentAdminSettingsInput,
  normalizeAppointmentResourceUnavailabilityInput,
  updateAppointmentLocationClosureForManager,
  updateAppointmentResourceForManager,
  updateAppointmentAdminSettings
} from "@/server/services/appointment-admin-settings";
import { createTestAuthStore } from "@/tests/support/auth-test-store";

function createLocation(overrides: Record<string, unknown> = {}) {
  return {
    id: "loc-time-motor-sales-minneapolis",
    organizationId: "org-time-motor-sales",
    code: "TMS-MSP-01",
    name: "Time Motor Sales — Minneapolis",
    timezone: "America/Chicago",
    addressLine1: "1101 E. Lake Street",
    addressLine2: null,
    city: "Minneapolis",
    region: "MN",
    postalCode: "55407",
    phoneNumber: "612 724 3631",
    countryCode: "US",
    schedulingStatus: LocationSchedulingStatus.ACTIVE,
    organization: {
      id: "org-time-motor-sales",
      code: "TIME",
      name: "Time Motor Sales"
    },
    operatingWindows: [
      {
        businessDay: BusinessDay.MONDAY,
        opensAtMinute: 540,
        closesAtMinute: 1080,
        validFrom: new Date("2026-07-05T00:00:00.000Z"),
        validTo: null
      }
    ],
    ...overrides
  };
}

function createRepository() {
  let location = createLocation();
  let closures: Awaited<ReturnType<AppointmentAdminSettingsRepository["listLocationClosures"]>> = [];
  let resources: Awaited<ReturnType<AppointmentAdminSettingsRepository["listResources"]>> = [
    {
      id: "res-abdi",
      code: "STAFF-ABDI",
      name: "Abdi Farah",
      status: SchedulableResourceStatus.ACTIVE,
      capacityMode: ResourceCapacityMode.EXCLUSIVE,
      capacity: 1,
      conflictPolicy: ResourceConflictPolicy.HARD_BLOCK,
      userId: "user-abdi",
      vehicleId: null,
      resourceType: {
        code: "STAFF",
        name: "Staff member",
        kind: "STAFF"
      },
      unavailability: []
    }
  ];
  let lastUpdate:
    | Parameters<AppointmentAdminSettingsRepository["updateLocationAndHours"]>[0]
    | null = null;

  const repository: AppointmentAdminSettingsRepository = {
    async getLocation() {
      return location;
    },
    async listLocationClosures() {
      return closures;
    },
    async listResourceTypes() {
      return [
        {
          id: "rt-staff",
          code: "STAFF",
          name: "Staff member",
          kind: "STAFF",
          defaultCapacityMode: ResourceCapacityMode.EXCLUSIVE,
          defaultCapacity: 1,
          defaultConflictPolicy: ResourceConflictPolicy.HARD_BLOCK,
          isActive: true
        }
      ];
    },
    async listResources() {
      return resources;
    },
    async createLocationClosure(input) {
      const closure = {
        id: `closure-${closures.length + 1}`,
        type: input.type,
        name: input.name,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        reason: input.reason,
        createdByUserId: input.createdByUserId,
        createdAt: new Date("2026-07-06T19:00:00.000Z")
      };
      closures = [...closures, closure];

      return closure;
    },
    async updateLocationClosure(input) {
      closures = closures.map((closure) =>
        closure.id === input.closureId
          ? {
              ...closure,
              type: input.type,
              name: input.name,
              startsAt: input.startsAt,
              endsAt: input.endsAt,
              reason: input.reason
            }
          : closure
      );

      return closures.find((closure) => closure.id === input.closureId)!;
    },
    async deleteLocationClosure(input) {
      closures = closures.filter((closure) => closure.id !== input.closureId);
    },
    async updateResource(input) {
      resources = resources.map((resource) =>
        resource.id === input.resourceId
          ? {
              ...resource,
              status: input.status,
              capacityMode: input.capacityMode,
              capacity: input.capacity,
              conflictPolicy: input.conflictPolicy
            }
          : resource
      );

      return resources.find((resource) => resource.id === input.resourceId)!;
    },
    async createResourceUnavailability(input) {
      const entry = {
        id: `unavailability-${resources[0].unavailability.length + 1}`,
        type: input.type,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        capacityReduction: input.capacityReduction,
        reason: input.reason,
        createdByUserId: input.createdByUserId,
        createdAt: new Date("2026-07-06T19:00:00.000Z")
      };
      resources = resources.map((resource) =>
        resource.id === input.resourceId
          ? {
              ...resource,
              unavailability: [...resource.unavailability, entry]
            }
          : resource
      );

      return entry;
    },
    async updateLocationAndHours(input) {
      lastUpdate = input;
      location = {
        ...location,
        ...input.location,
        operatingWindows: input.operatingWindows
          .filter((window) => window.isOpen && window.opensAtMinute !== null && window.closesAtMinute !== null)
          .map((window) => ({
            businessDay: window.businessDay,
            opensAtMinute: window.opensAtMinute!,
            closesAtMinute: window.closesAtMinute!,
            validFrom: new Date("2026-07-05T00:00:00.000Z"),
            validTo: null
          }))
      };

      return location;
    }
  };

  return {
    repository,
    getLastUpdate() {
      return lastUpdate;
    }
  };
}

describe("appointment admin settings service", () => {
  it("normalizes dealership profile and appointment operating windows", () => {
    const normalized = normalizeAppointmentAdminSettingsInput({
      location: {
        name: " Time Motor Sales ",
        timezone: " America/Chicago ",
        addressLine1: " 1101 E. Lake Street ",
        city: " Minneapolis ",
        region: " MN ",
        postalCode: " 55407 ",
        phoneNumber: " 612 724 3631 ",
        schedulingStatus: LocationSchedulingStatus.ACTIVE
      },
      operatingWindows: [
        {
          businessDay: BusinessDay.MONDAY,
          isOpen: true,
          opensAt: "09:00",
          closesAt: "18:00"
        },
        {
          businessDay: BusinessDay.SATURDAY,
          isOpen: false
        }
      ]
    });

    expect(normalized.location).toMatchObject({
      name: "Time Motor Sales",
      timezone: "America/Chicago",
      addressLine1: "1101 E. Lake Street",
      city: "Minneapolis",
      region: "MN",
      postalCode: "55407",
      phoneNumber: "612 724 3631"
    });
    expect(normalized.operatingWindows.find((window) => window.businessDay === BusinessDay.MONDAY)).toMatchObject({
      isOpen: true,
      opensAtMinute: 540,
      closesAtMinute: 1080
    });
    expect(normalized.operatingWindows.find((window) => window.businessDay === BusinessDay.SATURDAY)).toMatchObject({
      isOpen: false,
      opensAtMinute: null,
      closesAtMinute: null
    });
  });

  it("rejects invalid timezone and backwards hours", () => {
    expect(() =>
      normalizeAppointmentAdminSettingsInput({
        location: {
          name: "Time Motor Sales",
          timezone: "Mars/Olympus",
          city: "Minneapolis",
          region: "MN",
          schedulingStatus: LocationSchedulingStatus.ACTIVE
        },
        operatingWindows: [
          {
            businessDay: BusinessDay.MONDAY,
            isOpen: true,
            opensAt: "09:00",
            closesAt: "18:00"
          }
        ]
      })
    ).toThrow(/valid timezone/);

    expect(() =>
      normalizeAppointmentAdminSettingsInput({
        location: {
          name: "Time Motor Sales",
          timezone: "America/Chicago",
          city: "Minneapolis",
          region: "MN",
          schedulingStatus: LocationSchedulingStatus.ACTIVE
        },
        operatingWindows: [
          {
            businessDay: BusinessDay.MONDAY,
            isOpen: true,
            opensAt: "18:00",
            closesAt: "09:00"
          }
        ]
      })
    ).toThrow(/after opening time/);
  });

  it("allows managers to update appointment admin settings", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const manager = usersByEmail.get("morgan.manager@local.test") ?? null;
    const { repository, getLastUpdate } = createRepository();

    const settings = await updateAppointmentAdminSettings(
      manager,
      {
        location: {
          name: "Time Motor Sales — Minneapolis",
          timezone: "America/Chicago",
          addressLine1: "1101 E. Lake Street",
          city: "Minneapolis",
          region: "MN",
          postalCode: "55407",
          phoneNumber: "612 724 3631",
          schedulingStatus: LocationSchedulingStatus.ACTIVE
        },
        operatingWindows: [
          {
            businessDay: BusinessDay.MONDAY,
            isOpen: true,
            opensAt: "09:00",
            closesAt: "18:00"
          },
          {
            businessDay: BusinessDay.FRIDAY,
            isOpen: true,
            opensAt: "09:00",
            closesAt: "18:00"
          }
        ]
      },
      repository
    );

    expect(settings.location.displayAddress).toContain("1101 E. Lake Street");
    expect(settings.location.displayPhone).toBe("(612) 724-3631");
    expect(settings.location.businessHoursLabel).toBe("9:00 AM - 6:00 PM");
    expect(getLastUpdate()?.operatingWindows.filter((window) => window.isOpen)).toHaveLength(2);
  });

  it("rejects staff users who try to update appointment admin settings", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const staffUser = usersByEmail.get("jordan.sales@local.test") ?? null;
    const { repository } = createRepository();

    await expect(
      updateAppointmentAdminSettings(
        staffUser,
        {
          location: {
            name: "Time Motor Sales",
            timezone: "America/Chicago",
            city: "Minneapolis",
            region: "MN",
            schedulingStatus: LocationSchedulingStatus.ACTIVE
          },
          operatingWindows: [
            {
              businessDay: BusinessDay.MONDAY,
              isOpen: true,
              opensAt: "09:00",
              closesAt: "18:00"
            }
          ]
        },
        repository
      )
    ).rejects.toThrow(/Manager access required/);
  });

  it("allows managers to create location closures", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const manager = usersByEmail.get("morgan.manager@local.test") ?? null;
    const { repository } = createRepository();

    const settings = await createAppointmentLocationClosureForManager(
      manager,
      {
        type: LocationClosureType.HOLIDAY,
        name: "Independence Day",
        startsAt: "2026-07-04T14:00:00.000Z",
        endsAt: "2026-07-05T00:00:00.000Z",
        reason: "Dealership holiday closure."
      },
      repository
    );

    expect(settings.closures).toEqual([
      expect.objectContaining({
        type: LocationClosureType.HOLIDAY,
        name: "Independence Day",
        reason: "Dealership holiday closure."
      })
    ]);
    expect(settings.specialHoursCalendar.summary.upcomingClosureCount).toBe(1);
    expect(settings.specialHoursCalendar.days.some((day) => day.status === "CLOSED")).toBe(true);
  });

  it("allows managers to edit and delete location closures", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const manager = usersByEmail.get("morgan.manager@local.test") ?? null;
    const { repository } = createRepository();

    const created = await createAppointmentLocationClosureForManager(
      manager,
      {
        type: LocationClosureType.PLANNED,
        name: "Morning service closure",
        startsAt: "2026-07-10T14:00:00.000Z",
        endsAt: "2026-07-10T16:00:00.000Z",
        reason: "Team training."
      },
      repository
    );
    const closureId = created.closures[0].id;

    const updated = await updateAppointmentLocationClosureForManager(
      manager,
      closureId,
      {
        type: LocationClosureType.PLANNED,
        name: "Extended service training",
        startsAt: "2026-07-10T14:00:00.000Z",
        endsAt: "2026-07-10T18:00:00.000Z",
        reason: "Training window was extended."
      },
      repository
    );

    expect(updated.closures[0]).toMatchObject({
      id: closureId,
      name: "Extended service training",
      reason: "Training window was extended."
    });

    const deleted = await deleteAppointmentLocationClosureForManager(
      manager,
      closureId,
      repository
    );

    expect(deleted.closures).toEqual([]);
  });

  it("allows managers to update resource capacity and conflict policy", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const manager = usersByEmail.get("morgan.manager@local.test") ?? null;
    const { repository } = createRepository();

    const settings = await updateAppointmentResourceForManager(
      manager,
      {
        resourceId: "res-abdi",
        status: SchedulableResourceStatus.ACTIVE,
        capacityMode: ResourceCapacityMode.CAPACITY,
        capacity: 2,
        conflictPolicy: ResourceConflictPolicy.WARNING
      },
      repository
    );

    expect(settings.resources[0]).toMatchObject({
      id: "res-abdi",
      capacityMode: ResourceCapacityMode.CAPACITY,
      capacity: 2,
      conflictPolicy: ResourceConflictPolicy.WARNING
    });
  });

  it("allows managers to create resource capacity reductions", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const manager = usersByEmail.get("morgan.manager@local.test") ?? null;
    const { repository } = createRepository();

    const settings = await createAppointmentResourceUnavailabilityForManager(
      manager,
      {
        resourceId: "res-abdi",
        type: ResourceUnavailabilityType.CAPACITY_REDUCTION,
        startsAt: "2026-07-08T14:00:00.000Z",
        endsAt: "2026-07-08T18:00:00.000Z",
        capacityReduction: 1,
        reason: "Partial staffing coverage."
      },
      repository
    );

    expect(settings.resources[0].unavailability).toEqual([
      expect.objectContaining({
        type: ResourceUnavailabilityType.CAPACITY_REDUCTION,
        capacityReduction: 1,
        reason: "Partial staffing coverage."
      })
    ]);
    expect(settings.specialHoursCalendar.summary.upcomingResourceImpactCount).toBe(1);
    expect(settings.specialHoursCalendar.days.some((day) => day.status === "RESOURCE_IMPACT")).toBe(
      true
    );
  });

  it("rejects malformed resource unavailability windows", () => {
    expect(() =>
      normalizeAppointmentResourceUnavailabilityInput({
        locationId: "loc-time-motor-sales-minneapolis",
        resourceId: "res-abdi",
        userId: "user-manager",
        unavailability: {
          resourceId: "res-abdi",
          type: ResourceUnavailabilityType.CAPACITY_REDUCTION,
          startsAt: "2026-07-08T14:00:00.000Z",
          endsAt: "2026-07-08T18:00:00.000Z",
          reason: "Missing reduction amount."
        }
      })
    ).toThrow(/requires a positive reduction/);

    expect(() =>
      normalizeAppointmentResourceUnavailabilityInput({
        locationId: "loc-time-motor-sales-minneapolis",
        resourceId: "res-abdi",
        userId: "user-manager",
        unavailability: {
          resourceId: "res-abdi",
          type: ResourceUnavailabilityType.OUTAGE,
          startsAt: "2026-07-08T18:00:00.000Z",
          endsAt: "2026-07-08T14:00:00.000Z",
          reason: "Backwards window."
        }
      })
    ).toThrow(/end after/);
  });

  it("exposes board-safe settings for the Appointment Board shell", async () => {
    const { repository } = createRepository();

    await expect(getAppointmentBoardSettings(repository)).resolves.toEqual({
      organizationId: "org-time-motor-sales",
      locationId: "loc-time-motor-sales-minneapolis",
      locationName: "Time Motor Sales — Minneapolis",
      timezone: "America/Chicago",
      addressLine: "1101 E. Lake Street, Minneapolis MN 55407",
      phoneNumber: "(612) 724-3631",
      businessHoursLabel: "9:00 AM - 6:00 PM"
    });
  });
});
