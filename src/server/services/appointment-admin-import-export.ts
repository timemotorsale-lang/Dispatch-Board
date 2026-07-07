import { canManageSettings } from "@/server/policies/access";
import {
  getAppointmentAdminSettingsForManager,
  type AppointmentAdminSettings
} from "@/server/services/appointment-admin-settings";
import {
  getAppointmentCatalogAutomationAdminForManager,
  type AppointmentCatalogAutomationAdmin
} from "@/server/services/appointment-catalog-automation-admin";
import type { AuthenticatedUser } from "@/server/auth/store";

const configurationSchemaVersion = "appointment-admin-configuration/v1" as const;
const portableRedactionMarker = "REDACTED_FOR_PORTABLE_EXPORT";

type JsonRecord = Record<string, unknown>;

export type AppointmentAdminConfigurationExport = {
  schemaVersion: typeof configurationSchemaVersion;
  exportedAt: string;
  exportedByUserId: string;
  packageType: "APPOINTMENT_ADMIN_CONFIGURATION";
  portabilityMode: "PREVIEW_SAFE";
  organization: {
    id: string;
    code: string;
    name: string;
  };
  location: {
    id: string;
    code: string;
    name: string;
    timezone: string;
  };
  contents: {
    settings: AppointmentAdminSettings;
    catalog: AppointmentCatalogAutomationAdmin;
  };
  redaction: {
    mode: "PORTABLE_SAFE";
    redactedFieldCount: number;
    redactedFields: string[];
    notes: string[];
  };
  manifest: {
    purposeCount: number;
    outcomeCodeCount: number;
    followUpDispositionCodeCount: number;
    reasonCodeCount: number;
    operatingWindowCount: number;
    closureCount: number;
    resourceCount: number;
    automationRuleCount: number;
  };
};

export type AppointmentAdminConfigurationImportPreviewInput = {
  packageSnapshot: unknown;
  reason: string;
};

export type AppointmentAdminConfigurationImportPreview = {
  schemaVersion: string | null;
  previewedAt: string;
  previewedByUserId: string;
  canApply: false;
  applySupported: false;
  summary: {
    organizationName: string | null;
    locationName: string | null;
    purposeCount: number;
    operatingWindowCount: number;
    closureCount: number;
    resourceCount: number;
    automationRuleCount: number;
    redactedFieldCount: number;
  };
  validation: {
    isValidPackage: boolean;
    errors: string[];
    warnings: string[];
    blockedReasons: string[];
  };
  reviewChecklist: string[];
};

function assertCanManageAppointmentConfiguration(user: AuthenticatedUser | null): asserts user is AuthenticatedUser {
  if (!user) {
    throw new Error("Authentication required.");
  }

  if (!canManageSettings(user)) {
    throw new Error("Manager access required.");
  }
}

function normalizeReason(reason: unknown) {
  const normalized = typeof reason === "string" ? reason.trim() : "";

  if (normalized.length < 8) {
    throw new Error("Import preview reason must document the reason in at least 8 characters.");
  }

  return normalized;
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function redactPortableSnapshot<T>(value: T) {
  const redactedFields: string[] = [];
  const snapshot = cloneJson(value);

  function visit(candidate: unknown, path: string) {
    if (!candidate || typeof candidate !== "object") {
      return;
    }

    if (Array.isArray(candidate)) {
      candidate.forEach((item, index) => visit(item, `${path}[${index}]`));
      return;
    }

    const record = candidate as JsonRecord;

    for (const key of Object.keys(record)) {
      const fieldPath = path ? `${path}.${key}` : key;

      if (
        [
          "createdByUserId",
          "actorUserId",
          "reviewedByUserId",
          "activatedByUserId",
          "userId",
          "vehicleId"
        ].includes(key) &&
        record[key] !== null &&
        record[key] !== undefined
      ) {
        record[key] = portableRedactionMarker;
        redactedFields.push(fieldPath);
        continue;
      }

      visit(record[key], fieldPath);
    }
  }

  visit(snapshot, "");

  return {
    snapshot,
    redactedFields
  };
}

function countRedactionMarkers(value: unknown): number {
  if (value === portableRedactionMarker) {
    return 1;
  }

  if (!value || typeof value !== "object") {
    return 0;
  }

  if (Array.isArray(value)) {
    return value.reduce((total, item) => total + countRedactionMarkers(item), 0);
  }

  return Object.values(value).reduce((total, item) => total + countRedactionMarkers(item), 0);
}

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function getNestedRecord(value: JsonRecord | null, key: string) {
  return asRecord(value?.[key]);
}

function countArray(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function createAppointmentAdminConfigurationExportForManager(
  user: AuthenticatedUser | null,
  loaders: {
    getSettings?: typeof getAppointmentAdminSettingsForManager;
    getCatalog?: typeof getAppointmentCatalogAutomationAdminForManager;
  } = {}
): Promise<AppointmentAdminConfigurationExport> {
  assertCanManageAppointmentConfiguration(user);

  const [settings, catalog] = await Promise.all([
    (loaders.getSettings ?? getAppointmentAdminSettingsForManager)(user),
    (loaders.getCatalog ?? getAppointmentCatalogAutomationAdminForManager)(user)
  ]);
  const contents = {
    settings,
    catalog
  };
  const redacted = redactPortableSnapshot(contents);
  const redactedContents = redacted.snapshot as {
    settings: AppointmentAdminSettings;
    catalog: AppointmentCatalogAutomationAdmin;
  };

  return {
    schemaVersion: configurationSchemaVersion,
    exportedAt: new Date().toISOString(),
    exportedByUserId: user.id,
    packageType: "APPOINTMENT_ADMIN_CONFIGURATION",
    portabilityMode: "PREVIEW_SAFE",
    organization: settings.organization,
    location: {
      id: settings.location.id,
      code: settings.location.code,
      name: settings.location.name,
      timezone: settings.location.timezone
    },
    contents: redactedContents,
    redaction: {
      mode: "PORTABLE_SAFE",
      redactedFieldCount: redacted.redactedFields.length,
      redactedFields: redacted.redactedFields,
      notes: [
        "User, vehicle, actor, reviewer, and creator identifiers are redacted for portable export.",
        "This package is safe for preview and review; import apply is intentionally not enabled in this foundation."
      ]
    },
    manifest: {
      purposeCount: catalog.purposes.length,
      outcomeCodeCount: catalog.catalogs.outcomeCodes.length,
      followUpDispositionCodeCount: catalog.catalogs.followUpDispositionCodes.length,
      reasonCodeCount: catalog.catalogs.reasonCodes.length,
      operatingWindowCount: settings.operatingWindows.length,
      closureCount: settings.closures.length,
      resourceCount: settings.resources.length,
      automationRuleCount: catalog.automationRules.length
    }
  };
}

export async function previewAppointmentAdminConfigurationImportForManager(
  user: AuthenticatedUser | null,
  input: AppointmentAdminConfigurationImportPreviewInput
): Promise<AppointmentAdminConfigurationImportPreview> {
  assertCanManageAppointmentConfiguration(user);
  normalizeReason(input.reason);

  const packageRecord = asRecord(input.packageSnapshot);
  const contents = getNestedRecord(packageRecord, "contents");
  const settings = getNestedRecord(contents, "settings");
  const catalog = getNestedRecord(contents, "catalog");
  const settingsLocation = getNestedRecord(settings, "location");
  const location = getNestedRecord(packageRecord, "location");
  const organization = getNestedRecord(packageRecord, "organization");
  const catalogs = getNestedRecord(catalog, "catalogs");
  const redaction = getNestedRecord(packageRecord, "redaction");
  const schemaVersion = readString(packageRecord?.schemaVersion);
  const errors = [
    packageRecord ? null : "Import package must be a JSON object.",
    schemaVersion === configurationSchemaVersion
      ? null
      : `Unsupported or missing schemaVersion. Expected ${configurationSchemaVersion}.`,
    contents ? null : "Import package must include contents.",
    settings ? null : "Import package must include contents.settings.",
    catalog ? null : "Import package must include contents.catalog.",
    Array.isArray(settings?.operatingWindows)
      ? null
      : "Import settings must include operatingWindows.",
    Array.isArray(catalog?.purposes) ? null : "Import catalog must include purposes.",
    catalogs && Array.isArray(catalogs.reasonCodes)
      ? null
      : "Import catalog must include reason code catalog."
  ].filter((error): error is string => Boolean(error));
  const redactedFieldCount =
    typeof redaction?.redactedFieldCount === "number"
      ? redaction.redactedFieldCount
      : countRedactionMarkers(input.packageSnapshot);
  const warnings = [
    redactedFieldCount === 0
      ? "No redaction markers were found; verify this package did not include staff, actor, vehicle, or user identifiers."
      : null,
    "Import apply is not enabled yet. This preview is for manager review and validation only."
  ].filter((warning): warning is string => Boolean(warning));

  return {
    schemaVersion,
    previewedAt: new Date().toISOString(),
    previewedByUserId: user.id,
    canApply: false,
    applySupported: false,
    summary: {
      organizationName: readString(organization?.name),
      locationName: readString(location?.name) ?? readString(settingsLocation?.name),
      purposeCount: countArray(catalog?.purposes),
      operatingWindowCount: countArray(settings?.operatingWindows),
      closureCount: countArray(settings?.closures),
      resourceCount: countArray(settings?.resources),
      automationRuleCount: countArray(catalog?.automationRules),
      redactedFieldCount
    },
    validation: {
      isValidPackage: errors.length === 0,
      errors,
      warnings,
      blockedReasons: [
        "Import apply is intentionally blocked in this foundation branch.",
        "A later branch must add manager approval, diff confirmation, rollback, and activation controls before imported settings can be applied."
      ]
    },
    reviewChecklist: [
      "Confirm organization and location identity before applying in a future release.",
      "Review operating hours, closures, resource capacity, and conflict policies.",
      "Review purpose templates, outcome codes, reason codes, automation hooks, and validation warnings.",
      "Keep the exported package attached to the change ticket or manager approval record."
    ]
  };
}
