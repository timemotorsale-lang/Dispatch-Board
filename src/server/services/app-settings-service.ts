import type { AppSetting } from "@prisma/client";

import type { AuthenticatedUser } from "@/server/auth/store";
import { canManageSettings } from "@/server/policies/access";
import { createAppSettingsRepository } from "@/server/repositories/app-settings-repository";
import { normalizeAppSettings, type AppSettingsInput } from "@/server/validation/app-settings";

export type AppSettingsRepository = {
  getOrCreateAppSettings(): Promise<AppSetting>;
  updateAppSettings(input: ReturnType<typeof normalizeAppSettings>): Promise<AppSetting>;
};

export type GenerationSettings = ReturnType<typeof normalizeAppSettings>;

function toGenerationSettings(settings: Pick<AppSetting, "dailyGenerationTime" | "timezone" | "businessDays">) {
  return normalizeAppSettings({
    dailyGenerationTime: settings.dailyGenerationTime,
    timezone: settings.timezone,
    businessDays: settings.businessDays
  });
}

export function assertCanManageGenerationSettings(user: AuthenticatedUser | null) {
  if (!user) {
    throw new Error("Authentication required.");
  }

  if (!canManageSettings(user)) {
    throw new Error("Manager access required.");
  }

  return user;
}

export async function getGenerationSettings(
  repository: AppSettingsRepository = createAppSettingsRepository()
): Promise<GenerationSettings> {
  const settings = await repository.getOrCreateAppSettings();

  return toGenerationSettings(settings);
}

export async function getGenerationSettingsForManager(
  user: AuthenticatedUser | null,
  repository: AppSettingsRepository = createAppSettingsRepository()
): Promise<GenerationSettings> {
  assertCanManageGenerationSettings(user);

  return getGenerationSettings(repository);
}

export async function updateGenerationSettings(
  user: AuthenticatedUser | null,
  input: AppSettingsInput,
  repository: AppSettingsRepository = createAppSettingsRepository()
): Promise<GenerationSettings> {
  assertCanManageGenerationSettings(user);

  const normalizedInput = normalizeAppSettings(input);
  const settings = await repository.updateAppSettings(normalizedInput);

  return toGenerationSettings(settings);
}
