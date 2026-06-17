import { BusinessDay } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { getGenerationSettings } from "@/server/services/app-settings-service";
import {
  APP_SETTINGS_ID,
  DEFAULT_APP_SETTINGS,
  getDefaultAppSettings,
  normalizeAppSettings
} from "@/server/validation/app-settings";

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
        return {
          id: APP_SETTINGS_ID,
          dailyGenerationTime: " 10:30 ",
          timezone: " America/Chicago ",
          businessDays: [BusinessDay.MONDAY, BusinessDay.FRIDAY, BusinessDay.MONDAY],
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }
    });

    expect(settings).toEqual({
      dailyGenerationTime: "10:30",
      timezone: "America/Chicago",
      businessDays: [BusinessDay.MONDAY, BusinessDay.FRIDAY]
    });
  });
});
