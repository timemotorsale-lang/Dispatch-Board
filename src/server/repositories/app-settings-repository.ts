import type { AppSetting, PrismaClient } from "@prisma/client";

import { prisma } from "@/server/db/client";
import {
  getDefaultAppSettings,
  type NormalizedAppSettings
} from "@/server/validation/app-settings";

type AppSettingsDatabase = Pick<PrismaClient, "appSetting">;

export function createAppSettingsRepository(database: AppSettingsDatabase = prisma) {
  return {
    async findAppSettings() {
      return database.appSetting.findUnique({
        where: { id: getDefaultAppSettings().id }
      });
    },

    async getOrCreateAppSettings(): Promise<AppSetting> {
      const defaults = getDefaultAppSettings();

      return database.appSetting.upsert({
        where: { id: defaults.id },
        update: {},
        create: defaults
      });
    },

    async updateAppSettings(input: NormalizedAppSettings): Promise<AppSetting> {
      const defaults = getDefaultAppSettings();

      return database.appSetting.upsert({
        where: { id: defaults.id },
        update: input,
        create: {
          id: defaults.id,
          ...input
        }
      });
    }
  };
}
