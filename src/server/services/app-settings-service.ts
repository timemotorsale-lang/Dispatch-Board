import type { AppSetting } from "@prisma/client";

import { createAppSettingsRepository } from "@/server/repositories/app-settings-repository";
import { normalizeAppSettings } from "@/server/validation/app-settings";

export type AppSettingsRepository = {
  getOrCreateAppSettings(): Promise<AppSetting>;
};

export type GenerationSettings = ReturnType<typeof normalizeAppSettings>;

export async function getGenerationSettings(
  repository: AppSettingsRepository = createAppSettingsRepository()
): Promise<GenerationSettings> {
  const settings = await repository.getOrCreateAppSettings();

  return normalizeAppSettings({
    dailyGenerationTime: settings.dailyGenerationTime,
    timezone: settings.timezone,
    businessDays: settings.businessDays
  });
}
