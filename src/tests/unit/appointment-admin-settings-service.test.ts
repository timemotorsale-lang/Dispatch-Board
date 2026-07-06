import { BusinessDay, LocationSchedulingStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  type AppointmentAdminSettingsRepository,
  getAppointmentBoardSettings,
  normalizeAppointmentAdminSettingsInput,
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
  let lastUpdate:
    | Parameters<AppointmentAdminSettingsRepository["updateLocationAndHours"]>[0]
    | null = null;

  const repository: AppointmentAdminSettingsRepository = {
    async getLocation() {
      return location;
    },
    async listResourceTypes() {
      return [
        {
          id: "rt-staff",
          code: "STAFF",
          name: "Staff member",
          kind: "STAFF",
          defaultCapacityMode: "UNIT",
          defaultCapacity: 1,
          defaultConflictPolicy: "BLOCK",
          isActive: true
        }
      ];
    },
    async listResources() {
      return [
        {
          id: "res-abdi",
          code: "STAFF-ABDI",
          name: "Abdi Farah",
          status: "ACTIVE",
          capacityMode: "UNIT",
          capacity: 1,
          conflictPolicy: "BLOCK",
          userId: "user-abdi",
          vehicleId: null,
          resourceType: {
            code: "STAFF",
            name: "Staff member",
            kind: "STAFF"
          }
        }
      ];
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
