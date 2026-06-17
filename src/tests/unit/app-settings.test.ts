import { BusinessDay } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  getGenerationSettings,
  getGenerationSettingsForManager,
  updateGenerationSettings
} from "@/server/services/app-settings-service";
import { createTestAuthStore } from "@/tests/support/auth-test-store";
import {
  APP_SETTINGS_ID,
  DEFAULT_APP_SETTINGS,
  getDefaultAppSettings,
  normalizeAppSettings
} from "@/server/validation/app-settings";

function createStoredSettings(
  overrides: Partial<{
    dailyGenerationTime: string;
    timezone: string;
    businessDays: BusinessDay[];
  }> = {}
) {
  return {
    id: APP_SETTINGS_ID,
    dailyGenerationTime: "09:00",
    timezone: "America/Chicago",
    businessDays: [
      BusinessDay.MONDAY,
      BusinessDay.TUESDAY,
      BusinessDay.WEDNESDAY,
      BusinessDay.THURSDAY,
      BusinessDay.FRIDAY,
      BusinessDay.SATURDAY
    ],
    createdAt: new Date("2026-06-16T00:00:00.000Z"),
    updatedAt: new Date("2026-06-16T00:00:00.000Z"),
    ...overrides
  };
}

function createSettingsRepository(initialSettings = createStoredSettings()) {
  let currentSettings = initialSettings;

  return {
    repository: {
      async getOrCreateAppSettings() {
        return currentSettings;
      },
      async updateAppSettings(input: {
        dailyGenerationTime: string;
        timezone: string;
        businessDays: BusinessDay[];
      }) {
        currentSettings = {
          ...currentSettings,
          ...input,
          updatedAt: new Date("2026-06-16T01:00:00.000Z")
        };

        return currentSettings;
      }
    },
    readCurrentSettings() {
      return currentSettings;
    }
  };
}

describe("app settings", () => {
  it("exposes the expected seeded defaults", () => {
    const defaults = getDefaultAppSettings();

    expect(defaults).toEqual({
      id: APP_SETTINGS_ID,
      dailyGenerationTime: "09:00",
      timezone: "America/Chicago",
      businessDays: [
        BusinessDay.MONDAY,
        BusinessDay.TUESDAY,
        BusinessDay.WEDNESDAY,
        BusinessDay.THURSDAY,
        BusinessDay.FRIDAY,
        BusinessDay.SATURDAY
      ]
    });
    expect(defaults.businessDays).not.toBe(DEFAULT_APP_SETTINGS.businessDays);
  });

  it("normalizes valid settings and removes duplicate business days", () => {
    expect(
      normalizeAppSettings({
        dailyGenerationTime: " 09:15 ",
        timezone: " America/Chicago ",
        businessDays: [BusinessDay.MONDAY, BusinessDay.WEDNESDAY, BusinessDay.MONDAY]
      })
    ).toEqual({
      dailyGenerationTime: "09:15",
      timezone: "America/Chicago",
      businessDays: [BusinessDay.MONDAY, BusinessDay.WEDNESDAY]
    });
  });

  it("rejects invalid daily generation times", () => {
    expect(() =>
      normalizeAppSettings({
        dailyGenerationTime: "9:15",
        timezone: "America/Chicago",
        businessDays: [BusinessDay.MONDAY]
      })
    ).toThrow(/HH:mm/);
  });

  it("rejects blank or invalid timezones", () => {
    expect(() =>
      normalizeAppSettings({
        dailyGenerationTime: "09:15",
        timezone: "   ",
        businessDays: [BusinessDay.MONDAY]
      })
    ).toThrow(/timezone/);

    expect(() =>
      normalizeAppSettings({
        dailyGenerationTime: "09:15",
        timezone: "Mars/Olympus",
        businessDays: [BusinessDay.MONDAY]
      })
    ).toThrow(/valid timezone/);
  });

  it("rejects empty or invalid business day lists", () => {
    expect(() =>
      normalizeAppSettings({
        dailyGenerationTime: "09:15",
        timezone: "America/Chicago",
        businessDays: []
      })
    ).toThrow(/at least one business day/);

    expect(() =>
      normalizeAppSettings({
        dailyGenerationTime: "09:15",
        timezone: "America/Chicago",
        businessDays: ["FUNDAY"]
      })
    ).toThrow(/invalid business day/);
  });

  it("validates persisted settings before returning generation settings", async () => {
    const settings = await getGenerationSettings({
      async getOrCreateAppSettings() {
        return createStoredSettings({
          dailyGenerationTime: " 10:30 ",
          timezone: " America/Chicago ",
          businessDays: [BusinessDay.MONDAY, BusinessDay.FRIDAY, BusinessDay.MONDAY]
        });
      },
      async updateAppSettings(input) {
        return createStoredSettings(input);
      }
    });

    expect(settings).toEqual({
      dailyGenerationTime: "10:30",
      timezone: "America/Chicago",
      businessDays: [BusinessDay.MONDAY, BusinessDay.FRIDAY]
    });
  });

  it("allows a manager to read the current settings", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const manager = usersByEmail.get("morgan.manager@local.test") ?? null;
    const { repository } = createSettingsRepository(
      createStoredSettings({
        dailyGenerationTime: "11:45",
        businessDays: [BusinessDay.MONDAY, BusinessDay.SATURDAY]
      })
    );

    const settings = await getGenerationSettingsForManager(manager, repository);

    expect(settings).toEqual({
      dailyGenerationTime: "11:45",
      timezone: "America/Chicago",
      businessDays: [BusinessDay.MONDAY, BusinessDay.SATURDAY]
    });
  });

  it("allows a manager to update settings through the protected service path", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const manager = usersByEmail.get("morgan.manager@local.test") ?? null;
    const { repository, readCurrentSettings } = createSettingsRepository();

    const settings = await updateGenerationSettings(
      manager,
      {
        dailyGenerationTime: " 10:30 ",
        timezone: " America/Denver ",
        businessDays: [BusinessDay.MONDAY, BusinessDay.FRIDAY, BusinessDay.MONDAY]
      },
      repository
    );

    expect(settings).toEqual({
      dailyGenerationTime: "10:30",
      timezone: "America/Denver",
      businessDays: [BusinessDay.MONDAY, BusinessDay.FRIDAY]
    });
    expect(readCurrentSettings()).toMatchObject({
      dailyGenerationTime: "10:30",
      timezone: "America/Denver",
      businessDays: [BusinessDay.MONDAY, BusinessDay.FRIDAY]
    });
  });

  it("rejects staff users who try to update settings", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const staffUser = usersByEmail.get("jordan.sales@local.test") ?? null;
    const { repository } = createSettingsRepository();

    await expect(
      updateGenerationSettings(
        staffUser,
        {
          dailyGenerationTime: "09:15",
          timezone: "America/Chicago",
          businessDays: [BusinessDay.MONDAY]
        },
        repository
      )
    ).rejects.toThrow(/Manager access required/);
  });

  it("rejects invalid generation times during manager updates", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const manager = usersByEmail.get("morgan.manager@local.test") ?? null;
    const { repository } = createSettingsRepository();

    await expect(
      updateGenerationSettings(
        manager,
        {
          dailyGenerationTime: "9:15",
          timezone: "America/Chicago",
          businessDays: [BusinessDay.MONDAY]
        },
        repository
      )
    ).rejects.toThrow(/HH:mm/);
  });

  it("rejects invalid business days during manager updates", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const manager = usersByEmail.get("morgan.manager@local.test") ?? null;
    const { repository } = createSettingsRepository();

    await expect(
      updateGenerationSettings(
        manager,
        {
          dailyGenerationTime: "09:15",
          timezone: "America/Chicago",
          businessDays: ["FUNDAY"]
        },
        repository
      )
    ).rejects.toThrow(/invalid business day/);
  });
});
