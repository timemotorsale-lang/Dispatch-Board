import { BusinessDay } from "@prisma/client";

export const APP_SETTINGS_ID = "global";

export const DEFAULT_APP_SETTINGS = {
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
} as const;

const businessDayValues = new Set(Object.values(BusinessDay));
const dailyGenerationTimePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

export type AppSettingsInput = {
  dailyGenerationTime: string;
  timezone: string;
  businessDays: readonly string[];
};

export type NormalizedAppSettings = {
  dailyGenerationTime: string;
  timezone: string;
  businessDays: BusinessDay[];
};

export function normalizeAppSettings(input: AppSettingsInput): NormalizedAppSettings {
  const dailyGenerationTime = input.dailyGenerationTime.trim();

  if (!dailyGenerationTimePattern.test(dailyGenerationTime)) {
    throw new Error("App settings require a valid daily generation time in HH:mm format.");
  }

  const timezone = input.timezone.trim();

  if (!timezone) {
    throw new Error("App settings require a timezone.");
  }

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
  } catch {
    throw new Error(`App settings require a valid timezone. Received "${input.timezone}".`);
  }

  const businessDays = Array.from(
    new Set(
      input.businessDays.map((day) => {
        if (!businessDayValues.has(day as BusinessDay)) {
          throw new Error(`App settings contain an invalid business day value: "${day}".`);
        }

        return day as BusinessDay;
      })
    )
  );

  if (businessDays.length === 0) {
    throw new Error("App settings require at least one business day.");
  }

  return {
    dailyGenerationTime,
    timezone,
    businessDays
  };
}

export function getDefaultAppSettings() {
  return {
    id: DEFAULT_APP_SETTINGS.id,
    dailyGenerationTime: DEFAULT_APP_SETTINGS.dailyGenerationTime,
    timezone: DEFAULT_APP_SETTINGS.timezone,
    businessDays: [...DEFAULT_APP_SETTINGS.businessDays]
  };
}
