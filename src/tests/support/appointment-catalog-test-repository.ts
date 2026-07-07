import type {
  AppointmentCatalogAutomationAdminRepository,
  AppointmentCatalogChangeEventSummary,
  AppointmentCatalogUsageMetrics
} from "@/server/services/appointment-catalog-automation-admin";

type VersionRecord = Awaited<
  ReturnType<AppointmentCatalogAutomationAdminRepository["getDraftVersion"]>
>;

type ChangeEventRecord = {
  id: string;
  catalogVersionId: string;
  action: AppointmentCatalogChangeEventSummary["action"];
  reason: string;
  actorUserId: string | null;
  occurredAt: Date;
};

export function createMemoryAppointmentCatalogRepository(input?: {
  usageMetrics?: AppointmentCatalogUsageMetrics;
}) {
  let activeVersion: VersionRecord = null;
  let draftVersion: VersionRecord = null;
  let latestVersion = 0;
  const changeEvents: ChangeEventRecord[] = [];

  function now() {
    return new Date("2026-07-06T18:00:00.000Z");
  }

  function pushChange(input: {
    catalogVersionId: string;
    action: ChangeEventRecord["action"];
    reason: string;
    actorUserId: string | null;
  }) {
    changeEvents.unshift({
      id: `change-${changeEvents.length + 1}`,
      catalogVersionId: input.catalogVersionId,
      action: input.action,
      reason: input.reason,
      actorUserId: input.actorUserId,
      occurredAt: now()
    });
  }

  const repository: AppointmentCatalogAutomationAdminRepository = {
    async getActiveVersion() {
      return activeVersion;
    },
    async getDraftVersion() {
      return draftVersion;
    },
    async getLatestVersionNumber() {
      return latestVersion;
    },
    async listRecentChanges(_organizationId, limit) {
      return changeEvents.slice(0, limit);
    },
    ...(input?.usageMetrics
      ? {
          async getUsageMetrics() {
            return input.usageMetrics;
          }
        }
      : {}),
    async createDraftVersion(input) {
      latestVersion = Math.max(latestVersion, input.version);
      draftVersion = {
        id: `catalog-version-${input.version}`,
        organizationId: input.organizationId,
        version: input.version,
        status: "DRAFT",
        title: input.title,
        description: input.description,
        reason: input.reason,
        catalogSnapshot: input.catalogSnapshot,
        validationSnapshot: input.validationSnapshot,
        createdByUserId: input.actorUserId,
        activatedByUserId: null,
        activatedAt: null,
        retiredAt: null,
        createdAt: now(),
        updatedAt: now()
      };
      pushChange({
        catalogVersionId: draftVersion.id,
        action: input.action,
        reason: input.reason,
        actorUserId: input.actorUserId
      });

      return draftVersion;
    },
    async updateDraftVersion(input) {
      if (!draftVersion || draftVersion.id !== input.draftVersionId) {
        throw new Error("Draft not found.");
      }

      draftVersion = {
        ...draftVersion,
        title: input.title,
        description: input.description,
        reason: input.reason,
        catalogSnapshot: input.catalogSnapshot,
        validationSnapshot: input.validationSnapshot,
        updatedAt: now()
      };
      pushChange({
        catalogVersionId: draftVersion.id,
        action: "DRAFT_UPDATED",
        reason: input.reason,
        actorUserId: input.actorUserId
      });

      return draftVersion;
    },
    async activateDraftVersion(input) {
      if (!draftVersion || draftVersion.id !== input.draftVersionId) {
        throw new Error("Draft not found.");
      }

      if (activeVersion) {
        activeVersion = {
          ...activeVersion,
          status: "RETIRED",
          retiredAt: now(),
          updatedAt: now()
        };
      }

      activeVersion = {
        ...draftVersion,
        status: "ACTIVE",
        reason: input.reason,
        activatedByUserId: input.actorUserId,
        activatedAt: now(),
        catalogSnapshot: input.catalogSnapshot,
        validationSnapshot: input.validationSnapshot,
        updatedAt: now()
      };
      draftVersion = null;
      pushChange({
        catalogVersionId: activeVersion.id,
        action: "ACTIVATED",
        reason: input.reason,
        actorUserId: input.actorUserId
      });

      return activeVersion;
    }
  };

  return {
    repository,
    get activeVersion() {
      return activeVersion;
    },
    get draftVersion() {
      return draftVersion;
    },
    get changeEvents() {
      return changeEvents;
    }
  };
}
