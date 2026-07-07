"use client";

import { useState, useTransition } from "react";

import type {
  AppointmentAdminConfigurationExport,
  AppointmentAdminConfigurationImportPreview
} from "@/server/services/appointment-admin-import-export";
import type {
  AppointmentAdminSettings,
  AppointmentAdminSettingsInput,
  AppointmentLocationClosureInput,
  AppointmentOperatingWindowInput,
  AppointmentResourceTypeCreateInput,
  AppointmentResourceTypeUpdateInput,
  AppointmentResourceUnavailabilityInput,
  AppointmentResourceUpdateInput
} from "@/server/services/appointment-admin-settings";

const businessDayOptions = [
  { value: "MONDAY", label: "Monday" },
  { value: "TUESDAY", label: "Tuesday" },
  { value: "WEDNESDAY", label: "Wednesday" },
  { value: "THURSDAY", label: "Thursday" },
  { value: "FRIDAY", label: "Friday" },
  { value: "SATURDAY", label: "Saturday" },
  { value: "SUNDAY", label: "Sunday" }
] as const;

const schedulingStatuses = [
  { value: "DRAFT", label: "Draft", hint: "Safe setup mode while settings are being prepared." },
  { value: "ACTIVE", label: "Active", hint: "Appointments can be scheduled against this location." },
  { value: "SUSPENDED", label: "Suspended", hint: "Temporarily pause scheduling without losing history." },
  { value: "RETIRED", label: "Retired", hint: "Keep historical data but stop future use." }
] as const;

const closureTypes = [
  { value: "HOLIDAY", label: "Holiday" },
  { value: "PLANNED", label: "Planned closure" },
  { value: "EMERGENCY", label: "Emergency closure" },
  { value: "OTHER", label: "Other closure" }
] as const;

const resourceStatuses = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "OUT_OF_SERVICE", label: "Out of service" },
  { value: "RETIRED", label: "Retired" }
] as const;

const capacityModes = [
  { value: "EXCLUSIVE", label: "Exclusive" },
  { value: "CAPACITY", label: "Capacity" }
] as const;

const conflictPolicies = [
  { value: "HARD_BLOCK", label: "Hard block" },
  { value: "WARNING", label: "Warning" },
  { value: "INFORMATION", label: "Information" }
] as const;

const unavailabilityTypes = [
  { value: "ABSENCE", label: "Absence" },
  { value: "OUTAGE", label: "Outage" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "CAPACITY_REDUCTION", label: "Capacity reduction" },
  { value: "OTHER", label: "Other" }
] as const;

const resourceKindOptions = [
  { value: "STAFF", label: "Staff" },
  { value: "VEHICLE", label: "Vehicle" },
  { value: "SERVICE_BAY", label: "Service bay" },
  { value: "ROOM", label: "Room" },
  { value: "EQUIPMENT", label: "Equipment" },
  { value: "POOL", label: "Pool" },
  { value: "LOCATION", label: "Location" },
  { value: "OTHER", label: "Other" }
] as const;

const visibilityClassOptions = [
  { value: "OPERATIONAL", label: "Operational" },
  { value: "LIMITED", label: "Limited" },
  { value: "RESTRICTED", label: "Restricted" }
] as const;

type AppointmentAdminSettingsPanelProps = {
  initialSettings: AppointmentAdminSettings;
};

type AppointmentLocationFormState = AppointmentAdminSettingsInput["location"];

type AppointmentSettingsFormState = {
  location: AppointmentLocationFormState;
  operatingWindows: AppointmentOperatingWindowInput[];
};

type ResourceFormState = Record<string, Omit<AppointmentResourceUpdateInput, "resourceId">>;
type ResourceTypeFormState = Record<string, Omit<AppointmentResourceTypeUpdateInput, "resourceTypeId">>;
type ClosureEditDraft = AppointmentLocationClosureInput & {
  id: string;
};

const defaultClosureDraft: AppointmentLocationClosureInput = {
  type: "PLANNED",
  name: "",
  startsAt: "2026-07-07T09:00",
  endsAt: "2026-07-07T18:00",
  reason: ""
};

const defaultUnavailabilityDraft: AppointmentResourceUnavailabilityInput = {
  resourceId: "",
  type: "OUTAGE",
  startsAt: "2026-07-07T09:00",
  endsAt: "2026-07-07T18:00",
  capacityReduction: null,
  reason: ""
};

const defaultResourceTypeDraft: AppointmentResourceTypeCreateInput = {
  code: "",
  name: "",
  kind: "OTHER",
  defaultCapacityMode: "EXCLUSIVE",
  defaultCapacity: 1,
  defaultConflictPolicy: "HARD_BLOCK",
  visibilityClass: "OPERATIONAL"
};

function toFormState(settings: AppointmentAdminSettings): AppointmentSettingsFormState {
  return {
    location: {
      name: settings.location.name,
      timezone: settings.location.timezone,
      addressLine1: settings.location.addressLine1 ?? "",
      addressLine2: settings.location.addressLine2 ?? "",
      city: settings.location.city,
      region: settings.location.region,
      postalCode: settings.location.postalCode ?? "",
      phoneNumber: settings.location.phoneNumber ?? "",
      schedulingStatus: settings.location.schedulingStatus
    },
    operatingWindows: settings.operatingWindows.map((window) => ({
      businessDay: window.businessDay,
      isOpen: window.isOpen,
      opensAt: window.opensAt ?? "09:00",
      closesAt: window.closesAt ?? "18:00"
    }))
  };
}

function formatKind(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function countByKind<T extends { kind?: string; resourceType?: { kind: string } }>(items: T[]) {
  return items.reduce<Record<string, number>>((counts, item) => {
    const kind = item.kind ?? item.resourceType?.kind ?? "OTHER";
    counts[kind] = (counts[kind] ?? 0) + 1;

    return counts;
  }, {});
}

function toResourceFormState(settings: AppointmentAdminSettings): ResourceFormState {
  return Object.fromEntries(
    settings.resources.map((resource) => [
      resource.id,
      {
        status: resource.status,
        capacityMode: resource.capacityMode,
        capacity: resource.capacity,
        conflictPolicy: resource.conflictPolicy
      }
    ])
  );
}

function toResourceTypeFormState(settings: AppointmentAdminSettings): ResourceTypeFormState {
  return Object.fromEntries(
    settings.resourceTypes.map((resourceType) => [
      resourceType.id,
      {
        name: resourceType.name,
        defaultCapacityMode: resourceType.defaultCapacityMode,
        defaultCapacity: resourceType.defaultCapacity,
        defaultConflictPolicy: resourceType.defaultConflictPolicy,
        isActive: resourceType.isActive
      }
    ])
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function toApiDateTime(value: string) {
  return new Date(value).toISOString();
}

function toDateTimeLocal(value: string) {
  const date = new Date(value);
  const offsetMs = date.getTimezoneOffset() * 60_000;

  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

export function AppointmentAdminSettingsPanel({
  initialSettings
}: AppointmentAdminSettingsPanelProps) {
  const [settings, setSettings] = useState(initialSettings);
  const [formState, setFormState] = useState(() => toFormState(initialSettings));
  const [closureDraft, setClosureDraft] = useState(defaultClosureDraft);
  const [editingClosure, setEditingClosure] = useState<ClosureEditDraft | null>(null);
  const [resourceDrafts, setResourceDrafts] = useState(() => toResourceFormState(initialSettings));
  const [resourceTypeDrafts, setResourceTypeDrafts] = useState(() =>
    toResourceTypeFormState(initialSettings)
  );
  const [resourceTypeCreateDraft, setResourceTypeCreateDraft] =
    useState<AppointmentResourceTypeCreateInput>(defaultResourceTypeDraft);
  const [unavailabilityDraft, setUnavailabilityDraft] = useState<AppointmentResourceUnavailabilityInput>({
    ...defaultUnavailabilityDraft,
    resourceId: initialSettings.resources[0]?.id ?? ""
  });
  const [configurationExport, setConfigurationExport] =
    useState<AppointmentAdminConfigurationExport | null>(null);
  const [configurationExportText, setConfigurationExportText] = useState("");
  const [configurationImportText, setConfigurationImportText] = useState("");
  const [configurationImportReason, setConfigurationImportReason] = useState("");
  const [configurationImportPreview, setConfigurationImportPreview] =
    useState<AppointmentAdminConfigurationImportPreview | null>(null);
  const [recurringTemplateReasons, setRecurringTemplateReasons] = useState<Record<string, string>>(
    {}
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const resourceTypesByKind = countByKind(settings.resourceTypes);
  const resourcesByKind = countByKind(settings.resources);
  const selectedStatus = schedulingStatuses.find(
    (status) => status.value === formState.location.schedulingStatus
  );

  function updateLocationField<K extends keyof AppointmentLocationFormState>(
    field: K,
    value: AppointmentLocationFormState[K]
  ) {
    setFormState((current) => ({
      ...current,
      location: {
        ...current.location,
        [field]: value
      }
    }));
  }

  function updateOperatingWindow(
    businessDay: string,
    updater: (window: AppointmentOperatingWindowInput) => AppointmentOperatingWindowInput
  ) {
    setFormState((current) => ({
      ...current,
      operatingWindows: current.operatingWindows.map((window) =>
        window.businessDay === businessDay ? updater(window) : window
      )
    }));
  }

  function applySettingsSnapshot(nextSettings: AppointmentAdminSettings) {
    setSettings(nextSettings);
    setFormState(toFormState(nextSettings));
    setResourceDrafts(toResourceFormState(nextSettings));
    setResourceTypeDrafts(toResourceTypeFormState(nextSettings));
    setUnavailabilityDraft((current) => ({
      ...current,
      resourceId: nextSettings.resources.some((resource) => resource.id === current.resourceId)
        ? current.resourceId
        : nextSettings.resources[0]?.id ?? ""
    }));
  }

  function generateConfigurationExport() {
    setErrorMessage("");
    setSuccessMessage("");

    startTransition(async () => {
      const response = await fetch("/api/settings/appointments/configuration/export");
      const payload = (await response.json().catch(() => null)) as {
        exportPackage?: AppointmentAdminConfigurationExport;
        error?: string;
      } | null;

      if (!response.ok || !payload?.exportPackage) {
        setErrorMessage(payload?.error ?? "Unable to generate appointment configuration export.");
        return;
      }

      setConfigurationExport(payload.exportPackage);
      setConfigurationExportText(JSON.stringify(payload.exportPackage, null, 2));
      setConfigurationImportText(JSON.stringify(payload.exportPackage, null, 2));
      setSuccessMessage("Preview-safe appointment configuration export generated.");
    });
  }

  function previewConfigurationImport() {
    setErrorMessage("");
    setSuccessMessage("");
    setConfigurationImportPreview(null);

    let packageSnapshot: unknown;

    try {
      packageSnapshot = JSON.parse(configurationImportText);
    } catch {
      setErrorMessage("Import preview requires a valid JSON configuration package.");
      return;
    }

    startTransition(async () => {
      const response = await fetch("/api/settings/appointments/configuration/import-preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          packageSnapshot,
          reason: configurationImportReason
        })
      });
      const payload = (await response.json().catch(() => null)) as {
        preview?: AppointmentAdminConfigurationImportPreview;
        error?: string;
      } | null;

      if (!response.ok || !payload?.preview) {
        setErrorMessage(payload?.error ?? "Unable to preview appointment configuration import.");
        return;
      }

      setConfigurationImportPreview(payload.preview);
      setSuccessMessage("Import preview generated. Apply remains intentionally disabled.");
    });
  }

  async function mutateAppointmentSettings(
    url: string,
    options: {
      body?: unknown;
      method?: "POST" | "PATCH" | "DELETE";
      successMessage: string;
      onSuccess?: () => void;
    }
  ) {
    setErrorMessage("");
    setSuccessMessage("");

    const response = await fetch(url, {
      method: options.method ?? "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });
    const payload = (await response.json().catch(() => null)) as
      | {
          error?: string;
          settings?: AppointmentAdminSettings;
        }
      | null;

    if (!response.ok || !payload?.settings) {
      setErrorMessage(payload?.error ?? "Unable to save appointment admin change right now.");
      return;
    }

    applySettingsSnapshot(payload.settings);
    options.onSuccess?.();
    setSuccessMessage(options.successMessage);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    startTransition(async () => {
      const response = await fetch("/api/settings/appointments", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formState)
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string;
            settings?: AppointmentAdminSettings;
          }
        | null;

      if (!response.ok || !payload?.settings) {
        setErrorMessage(payload?.error ?? "Unable to save appointment settings right now.");
        return;
      }

      applySettingsSnapshot(payload.settings);
      setSuccessMessage("Appointment settings saved. The Appointment Board will read these details.");
    });
  }

  function submitClosure(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      await mutateAppointmentSettings("/api/settings/appointments/closures", {
        body: {
          ...closureDraft,
          startsAt: toApiDateTime(closureDraft.startsAt),
          endsAt: toApiDateTime(closureDraft.endsAt)
        },
        successMessage: "Closure saved. Scheduling checks can now honor this appointment closure.",
        onSuccess: () => setClosureDraft(defaultClosureDraft)
      });
    });
  }

  function beginEditClosure(closure: AppointmentAdminSettings["closures"][number]) {
    setEditingClosure({
      id: closure.id,
      type: closure.type,
      name: closure.name,
      startsAt: toDateTimeLocal(closure.startsAtIso),
      endsAt: toDateTimeLocal(closure.endsAtIso),
      reason: closure.reason
    });
    setErrorMessage("");
    setSuccessMessage("");
  }

  function submitClosureEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingClosure) {
      return;
    }

    startTransition(async () => {
      await mutateAppointmentSettings(
        `/api/settings/appointments/closures/${encodeURIComponent(editingClosure.id)}`,
        {
          method: "PATCH",
          body: {
            type: editingClosure.type,
            name: editingClosure.name,
            startsAt: toApiDateTime(editingClosure.startsAt),
            endsAt: toApiDateTime(editingClosure.endsAt),
            reason: editingClosure.reason
          },
          successMessage: "Closure updated.",
          onSuccess: () => setEditingClosure(null)
        }
      );
    });
  }

  function deleteClosure(closureId: string) {
    startTransition(async () => {
      await mutateAppointmentSettings(
        `/api/settings/appointments/closures/${encodeURIComponent(closureId)}`,
        {
          method: "DELETE",
          successMessage: "Closure deleted.",
          onSuccess: () =>
            setEditingClosure((current) => (current?.id === closureId ? null : current))
        }
      );
    });
  }

  function submitResourceUpdate(resourceId: string) {
    const draft = resourceDrafts[resourceId];

    if (!draft) {
      setErrorMessage("Resource settings could not be found.");
      return;
    }

    startTransition(async () => {
      await mutateAppointmentSettings(`/api/settings/appointments/resources/${encodeURIComponent(resourceId)}`, {
        method: "PATCH",
        body: draft,
        successMessage: "Resource settings saved."
      });
    });
  }

  function updateResourceTypeDraft<K extends keyof Omit<AppointmentResourceTypeUpdateInput, "resourceTypeId">>(
    resourceTypeId: string,
    field: K,
    value: Omit<AppointmentResourceTypeUpdateInput, "resourceTypeId">[K]
  ) {
    setResourceTypeDrafts((current) => ({
      ...current,
      [resourceTypeId]: {
        ...current[resourceTypeId],
        [field]: value
      }
    }));
  }

  function updateResourceTypeCreateDraft<K extends keyof AppointmentResourceTypeCreateInput>(
    field: K,
    value: AppointmentResourceTypeCreateInput[K]
  ) {
    setResourceTypeCreateDraft((current) => ({
      ...current,
      [field]: value
    }));
  }

  function submitResourceTypeCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      await mutateAppointmentSettings("/api/settings/appointments/resource-types", {
        body: resourceTypeCreateDraft,
        successMessage: "Resource type created.",
        onSuccess: () => setResourceTypeCreateDraft(defaultResourceTypeDraft)
      });
    });
  }

  function submitResourceTypeUpdate(resourceTypeId: string) {
    const draft = resourceTypeDrafts[resourceTypeId];

    if (!draft) {
      setErrorMessage("Resource type settings could not be found.");
      return;
    }

    startTransition(async () => {
      await mutateAppointmentSettings(
        `/api/settings/appointments/resource-types/${encodeURIComponent(resourceTypeId)}`,
        {
          method: "PATCH",
          body: draft,
          successMessage: "Resource type settings saved."
        }
      );
    });
  }

  function submitResourceUnavailability(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!unavailabilityDraft.resourceId) {
      setErrorMessage("Choose a resource before creating an unavailability window.");
      return;
    }

    startTransition(async () => {
      await mutateAppointmentSettings(
        `/api/settings/appointments/resources/${encodeURIComponent(unavailabilityDraft.resourceId)}/unavailability`,
        {
          body: {
            ...unavailabilityDraft,
            startsAt: toApiDateTime(unavailabilityDraft.startsAt),
            endsAt: toApiDateTime(unavailabilityDraft.endsAt),
            capacityReduction:
              unavailabilityDraft.type === "CAPACITY_REDUCTION"
                ? unavailabilityDraft.capacityReduction
                : null
          },
          successMessage:
            "Resource unavailability saved. Resource availability checks can now use this window.",
          onSuccess: () =>
            setUnavailabilityDraft({
              ...defaultUnavailabilityDraft,
              resourceId: unavailabilityDraft.resourceId
            })
        }
      );
    });
  }

  function applyRecurringTemplate(
    template: AppointmentAdminSettings["availabilityConfiguration"]["recurringTemplates"][number]
  ) {
    if (!template.suggestedDateIso || template.action !== "CREATE_CLOSURE_DRAFT") {
      setErrorMessage("This recurring template needs manager review before it can create a closure.");
      setSuccessMessage("");
      return;
    }

    const reason =
      recurringTemplateReasons[template.code]?.trim() ||
      `Manager applied ${template.name} from recurring appointment availability templates.`;

    startTransition(async () => {
      await mutateAppointmentSettings(
        `/api/settings/appointments/recurring-templates/${encodeURIComponent(template.code)}/closure`,
        {
          body: {
            dateIso: template.suggestedDateIso,
            reason
          },
          successMessage: `${template.name} closure created from recurring template.`,
          onSuccess: () =>
            setRecurringTemplateReasons((current) => ({
              ...current,
              [template.code]: ""
            }))
        }
      );
    });
  }

  function loadCapacityOverrideDraft(
    draft: AppointmentAdminSettings["availabilityConfiguration"]["capacityOverrideReadiness"]["quickDrafts"][number]
  ) {
    setUnavailabilityDraft({
      resourceId: draft.resourceId,
      type: "CAPACITY_REDUCTION",
      startsAt: toDateTimeLocal(draft.startsAtIso),
      endsAt: toDateTimeLocal(draft.endsAtIso),
      capacityReduction: draft.suggestedReduction,
      reason: draft.reasonTemplate
    });
    setErrorMessage("");
    setSuccessMessage(
      `Capacity override draft loaded for ${draft.resourceName}. Review it below, then add the resource window.`
    );
  }

  return (
    <div className="appointment-admin-stack">
      <form className="settings-form" onSubmit={handleSubmit}>
        <article className="panel-card settings-main-card">
          <strong>Appointment location</strong>
          <h2>Dealership profile</h2>
          <p>
            These details become the source of truth for the Appointment Board header, scheduling
            timezone, and future integrations.
          </p>

          <div className="settings-grid">
            <label className="field">
              <span>Location name</span>
              <input
                value={formState.location.name}
                onChange={(event) => updateLocationField("name", event.target.value)}
                required
              />
            </label>

            <label className="field">
              <span>Scheduling status</span>
              <select
                value={formState.location.schedulingStatus}
                onChange={(event) =>
                  updateLocationField(
                    "schedulingStatus",
                    event.target.value as AppointmentLocationFormState["schedulingStatus"]
                  )
                }
              >
                {schedulingStatuses.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
              <small className="field-hint">{selectedStatus?.hint}</small>
            </label>

            <label className="field">
              <span>Timezone</span>
              <input
                value={formState.location.timezone}
                onChange={(event) => updateLocationField("timezone", event.target.value)}
                placeholder="America/Chicago"
                required
              />
            </label>

            <label className="field">
              <span>Phone</span>
              <input
                value={formState.location.phoneNumber ?? ""}
                onChange={(event) => updateLocationField("phoneNumber", event.target.value)}
                placeholder="612 724 3631"
              />
            </label>

            <label className="field">
              <span>Address line 1</span>
              <input
                value={formState.location.addressLine1 ?? ""}
                onChange={(event) => updateLocationField("addressLine1", event.target.value)}
                required
              />
            </label>

            <label className="field">
              <span>Address line 2</span>
              <input
                value={formState.location.addressLine2 ?? ""}
                onChange={(event) => updateLocationField("addressLine2", event.target.value)}
                placeholder="Suite, building, or notes"
              />
            </label>

            <label className="field">
              <span>City</span>
              <input
                value={formState.location.city}
                onChange={(event) => updateLocationField("city", event.target.value)}
                required
              />
            </label>

            <label className="field">
              <span>State</span>
              <input
                value={formState.location.region}
                onChange={(event) => updateLocationField("region", event.target.value)}
                required
              />
            </label>

            <label className="field">
              <span>Postal code</span>
              <input
                value={formState.location.postalCode ?? ""}
                onChange={(event) => updateLocationField("postalCode", event.target.value)}
              />
            </label>
          </div>
        </article>

        <article className="panel-card settings-main-card">
          <strong>Operating windows</strong>
          <h2>Appointment scheduling hours</h2>
          <p>
            These are the hours the board uses for location-level scheduling. Staff resource hours
            are mirrored from this foundation for now.
          </p>

          <div className="appointment-admin-hours-grid">
            {businessDayOptions.map((day) => {
              const window =
                formState.operatingWindows.find((candidate) => candidate.businessDay === day.value) ??
                {
                  businessDay: day.value,
                  isOpen: false,
                  opensAt: "09:00",
                  closesAt: "18:00"
                };

              return (
                <div className="appointment-admin-hour-row" key={day.value}>
                  <label className="checkbox-item">
                    <input
                      checked={window.isOpen}
                      type="checkbox"
                      onChange={(event) =>
                        updateOperatingWindow(day.value, (current) => ({
                          ...current,
                          isOpen: event.target.checked,
                          opensAt: current.opensAt ?? "09:00",
                          closesAt: current.closesAt ?? "18:00"
                        }))
                      }
                    />
                    <span>{day.label}</span>
                  </label>

                  <label className="field">
                    <span>Open</span>
                    <input
                      disabled={!window.isOpen}
                      type="time"
                      value={window.opensAt ?? "09:00"}
                      onChange={(event) =>
                        updateOperatingWindow(day.value, (current) => ({
                          ...current,
                          opensAt: event.target.value
                        }))
                      }
                    />
                  </label>

                  <label className="field">
                    <span>Close</span>
                    <input
                      disabled={!window.isOpen}
                      type="time"
                      value={window.closesAt ?? "18:00"}
                      onChange={(event) =>
                        updateOperatingWindow(day.value, (current) => ({
                          ...current,
                          closesAt: event.target.value
                        }))
                      }
                    />
                  </label>
                </div>
              );
            })}
          </div>

          <div className="appointment-admin-preview">
            <span>Board preview</span>
            <strong>{settings.location.displayAddress || "No address configured"}</strong>
            <small>
              {settings.location.displayPhone} · {settings.location.businessHoursLabel}
            </small>
          </div>
        </article>

        {errorMessage ? (
          <div className="notice notice-danger" role="alert">
            <p>{errorMessage}</p>
          </div>
        ) : null}

        {successMessage ? (
          <div className="notice" role="status">
            <p>{successMessage}</p>
          </div>
        ) : null}

        <div className="form-actions">
          <button className="pill pill-primary" disabled={isPending} type="submit">
            {isPending ? "Saving..." : "Save appointment settings"}
          </button>
        </div>
      </form>

      <section className="panel-card settings-main-card">
        <strong>Special-hours calendar</strong>
        <h2>Closure and resource-impact preview</h2>
        <p>
          Review the next scheduling horizon generated from weekly operating hours, location
          closures, and resource outage/capacity windows before managers create more appointments.
        </p>

        <div className="appointment-catalog-detail-grid">
          <div>
            <span>Open days</span>
            <strong>{settings.specialHoursCalendar.summary.openDayCount}</strong>
            <small>
              {settings.specialHoursCalendar.horizonStartIso} through{" "}
              {settings.specialHoursCalendar.horizonEndIso}
            </small>
          </div>
          <div>
            <span>Closed days</span>
            <strong>{settings.specialHoursCalendar.summary.closedDayCount}</strong>
            <small>
              {settings.specialHoursCalendar.summary.nextClosureName ?? "No upcoming closure"}
            </small>
          </div>
          <div>
            <span>Resource-impact days</span>
            <strong>{settings.specialHoursCalendar.summary.resourceImpactDayCount}</strong>
            <small>
              {settings.specialHoursCalendar.summary.upcomingResourceImpactCount} resource windows
            </small>
          </div>
        </div>

        <div className="appointment-admin-record-list">
          {settings.specialHoursCalendar.days.slice(0, 14).map((day) => (
            <div className="appointment-admin-record" key={day.dateIso}>
              <span>
                {formatKind(day.businessDay)} • {formatKind(day.status)}
              </span>
              <strong>{day.dateIso}</strong>
              <small>
                {day.opensAt && day.closesAt
                  ? `${day.opensAt} - ${day.closesAt}`
                  : "No open hours"}
                {day.closureNames.length > 0 ? ` • ${day.closureNames.join(", ")}` : ""}
                {day.resourceImpactNames.length > 0
                  ? ` • ${day.resourceImpactNames.join(", ")}`
                  : ""}
              </small>
              {day.warnings.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className="panel-card settings-main-card">
        <strong>Availability configuration</strong>
        <h2>Enterprise readiness for hours, resources, and capacity</h2>
        <p>
          Review recurring closure templates, resource availability, capacity override readiness,
          and resource-type editor safety before managers activate deeper scheduling controls.
        </p>

        <div className="appointment-catalog-detail-grid">
          <div>
            <span>Templates ready</span>
            <strong>
              {
                settings.availabilityConfiguration.recurringTemplates.filter(
                  (template) => template.readiness === "READY"
                ).length
              }
            </strong>
            <small>Recurring closure and operations templates prepared.</small>
          </div>
          <div>
            <span>Constrained resources</span>
            <strong>
              {settings.availabilityConfiguration.resourceAvailability.summary.constrainedResourceCount}
            </strong>
            <small>
              {settings.availabilityConfiguration.resourceAvailability.summary.blockedResourceCount} blocked
              resources
            </small>
          </div>
          <div>
            <span>Capacity-ready resources</span>
            <strong>
              {settings.availabilityConfiguration.capacityOverrideReadiness.readyResourceCount}
            </strong>
            <small>
              {
                settings.availabilityConfiguration.capacityOverrideReadiness
                  .needsConfigurationCount
              }{" "}
              need review
            </small>
          </div>
        </div>

        <div className="settings-grid">
          <div className="appointment-admin-record-list">
            <strong>Recurring templates</strong>
            {settings.availabilityConfiguration.recurringTemplates.map((template) => (
              <div className="appointment-admin-record" key={template.code}>
                <span>
                  {formatKind(template.category)} â€¢ {formatKind(template.readiness)}
                </span>
                <strong>{template.name}</strong>
                <small>
                  {template.recurrenceLabel}
                  {template.suggestedDateIso ? ` â€¢ next: ${template.suggestedDateIso}` : ""}
                </small>
                {template.notes.map((note) => (
                  <p key={note}>{note}</p>
                ))}
                {template.action === "CREATE_CLOSURE_DRAFT" && template.suggestedDateIso ? (
                  <div className="form-actions">
                    <label className="field appointment-admin-span">
                      <span>Manager reason</span>
                      <input
                        value={recurringTemplateReasons[template.code] ?? ""}
                        onChange={(event) =>
                          setRecurringTemplateReasons((current) => ({
                            ...current,
                            [template.code]: event.target.value
                          }))
                        }
                        placeholder={`Reason for applying ${template.name}`}
                      />
                    </label>
                    <button
                      className="pill pill-primary"
                      disabled={isPending}
                      onClick={() => applyRecurringTemplate(template)}
                      type="button"
                    >
                      Create closure
                    </button>
                  </div>
                ) : (
                  <p>Review this template before it can create a closure.</p>
                )}
              </div>
            ))}
          </div>

          <div className="appointment-admin-record-list">
            <strong>Resource availability</strong>
            {settings.availabilityConfiguration.resourceAvailability.resources.map((resource) => (
              <div className="appointment-admin-record" key={resource.resourceId}>
                <span>
                  {formatKind(resource.readiness)} â€¢ {formatKind(resource.resourceTypeKind)}
                </span>
                <strong>{resource.resourceName}</strong>
                <small>
                  {resource.capacityMode} capacity {resource.capacity} â€¢{" "}
                  {resource.impactedDayCount} impacted days
                  {resource.nextImpactIso ? ` â€¢ next: ${resource.nextImpactIso}` : ""}
                </small>
                {resource.warnings.map((warning) => (
                  <p key={warning}>{warning}</p>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="settings-grid">
          <div className="appointment-admin-record-list">
            <strong>Capacity override readiness</strong>
            <div className="appointment-admin-record">
              <span>Future manager control</span>
              <strong>
                {
                  settings.availabilityConfiguration.capacityOverrideReadiness
                    .hardBlockExclusiveCount
                }{" "}
                hard-block exclusive resources
              </strong>
              {settings.availabilityConfiguration.capacityOverrideReadiness.recommendations.map(
                (recommendation) => (
                  <p key={recommendation}>{recommendation}</p>
                )
              )}
              {settings.availabilityConfiguration.capacityOverrideReadiness.quickDrafts.length > 0 ? (
                <div className="appointment-admin-record-list">
                  <strong>Capacity override drafts</strong>
                  {settings.availabilityConfiguration.capacityOverrideReadiness.quickDrafts.map(
                    (draft) => (
                      <div className="appointment-admin-record" key={draft.resourceId}>
                        <span>Capacity reduction draft</span>
                        <strong>{draft.resourceName}</strong>
                        <small>
                          Reduce capacity by {draft.suggestedReduction} from{" "}
                          {formatDateTime(draft.startsAtIso)} to {formatDateTime(draft.endsAtIso)}
                        </small>
                        <div className="form-actions">
                          <button
                            className="pill pill-secondary"
                            disabled={isPending}
                            onClick={() => loadCapacityOverrideDraft(draft)}
                            type="button"
                          >
                            Use capacity override draft
                          </button>
                        </div>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <p>No capacity-mode resources are ready for override drafts yet.</p>
              )}
            </div>
          </div>

          <div className="appointment-admin-record-list">
            <strong>Resource type editor readiness</strong>
            <form className="appointment-admin-record" onSubmit={submitResourceTypeCreate}>
              <span>Create governed resource type</span>
              <strong>New appointment resource type</strong>
              <small>
                Codes and kinds are immutable after creation. Use inactive status instead of delete
                when a type has operational history.
              </small>

              <div className="settings-grid">
                <label className="field">
                  <span>Code</span>
                  <input
                    value={resourceTypeCreateDraft.code}
                    onChange={(event) => updateResourceTypeCreateDraft("code", event.target.value)}
                    placeholder="SERVICE_BAY"
                    required
                  />
                </label>

                <label className="field">
                  <span>Name</span>
                  <input
                    value={resourceTypeCreateDraft.name}
                    onChange={(event) => updateResourceTypeCreateDraft("name", event.target.value)}
                    placeholder="Service bay"
                    required
                  />
                </label>

                <label className="field">
                  <span>Kind</span>
                  <select
                    value={resourceTypeCreateDraft.kind}
                    onChange={(event) => updateResourceTypeCreateDraft("kind", event.target.value)}
                  >
                    {resourceKindOptions.map((kind) => (
                      <option key={kind.value} value={kind.value}>
                        {kind.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Default mode</span>
                  <select
                    value={resourceTypeCreateDraft.defaultCapacityMode}
                    onChange={(event) =>
                      updateResourceTypeCreateDraft("defaultCapacityMode", event.target.value)
                    }
                  >
                    {capacityModes.map((mode) => (
                      <option key={mode.value} value={mode.value}>
                        {mode.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Default capacity</span>
                  <input
                    min={1}
                    type="number"
                    value={resourceTypeCreateDraft.defaultCapacity}
                    onChange={(event) =>
                      updateResourceTypeCreateDraft("defaultCapacity", Number(event.target.value))
                    }
                  />
                </label>

                <label className="field">
                  <span>Default conflict policy</span>
                  <select
                    value={resourceTypeCreateDraft.defaultConflictPolicy}
                    onChange={(event) =>
                      updateResourceTypeCreateDraft("defaultConflictPolicy", event.target.value)
                    }
                  >
                    {conflictPolicies.map((policy) => (
                      <option key={policy.value} value={policy.value}>
                        {policy.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Visibility</span>
                  <select
                    value={resourceTypeCreateDraft.visibilityClass}
                    onChange={(event) =>
                      updateResourceTypeCreateDraft("visibilityClass", event.target.value)
                    }
                  >
                    {visibilityClassOptions.map((visibility) => (
                      <option key={visibility.value} value={visibility.value}>
                        {visibility.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="form-actions">
                <button className="pill pill-primary" disabled={isPending} type="submit">
                  Create resource type
                </button>
              </div>
            </form>
            {settings.availabilityConfiguration.resourceTypeEditorReadiness.types.map(
              (resourceType) => (
                <div className="appointment-admin-record" key={resourceType.typeId}>
                  <span>
                    {formatKind(resourceType.kind)} â€¢ {formatKind(resourceType.readiness)}
                  </span>
                  <strong>{resourceType.name}</strong>
                  <small>
                    {resourceType.resourceCount} resources â€¢ default capacity{" "}
                    {resourceType.defaultCapacity}
                  </small>
                  {resourceType.warnings.map((warning) => (
                    <p key={warning}>{warning}</p>
                  ))}
                  {resourceTypeDrafts[resourceType.typeId] ? (
                    <div className="settings-grid">
                      <label className="field">
                        <span>Type name</span>
                        <input
                          value={resourceTypeDrafts[resourceType.typeId].name}
                          onChange={(event) =>
                            updateResourceTypeDraft(
                              resourceType.typeId,
                              "name",
                              event.target.value
                            )
                          }
                        />
                      </label>

                      <label className="field">
                        <span>Default mode</span>
                        <select
                          value={resourceTypeDrafts[resourceType.typeId].defaultCapacityMode}
                          onChange={(event) =>
                            updateResourceTypeDraft(
                              resourceType.typeId,
                              "defaultCapacityMode",
                              event.target.value
                            )
                          }
                        >
                          {capacityModes.map((mode) => (
                            <option key={mode.value} value={mode.value}>
                              {mode.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="field">
                        <span>Default capacity</span>
                        <input
                          min={1}
                          type="number"
                          value={resourceTypeDrafts[resourceType.typeId].defaultCapacity}
                          onChange={(event) =>
                            updateResourceTypeDraft(
                              resourceType.typeId,
                              "defaultCapacity",
                              Number(event.target.value)
                            )
                          }
                        />
                      </label>

                      <label className="field">
                        <span>Default conflict policy</span>
                        <select
                          value={resourceTypeDrafts[resourceType.typeId].defaultConflictPolicy}
                          onChange={(event) =>
                            updateResourceTypeDraft(
                              resourceType.typeId,
                              "defaultConflictPolicy",
                              event.target.value
                            )
                          }
                        >
                          {conflictPolicies.map((policy) => (
                            <option key={policy.value} value={policy.value}>
                              {policy.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="field">
                        <span>Status</span>
                        <select
                          value={resourceTypeDrafts[resourceType.typeId].isActive ? "ACTIVE" : "INACTIVE"}
                          onChange={(event) =>
                            updateResourceTypeDraft(
                              resourceType.typeId,
                              "isActive",
                              event.target.value === "ACTIVE"
                            )
                          }
                        >
                          <option value="ACTIVE">Active</option>
                          <option value="INACTIVE">Inactive</option>
                        </select>
                      </label>

                      <div className="form-actions">
                        <button
                          className="pill pill-primary"
                          disabled={isPending}
                          onClick={() => submitResourceTypeUpdate(resourceType.typeId)}
                          type="button"
                        >
                          Save resource type
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              )
            )}
          </div>
        </div>
      </section>

      <section className="panel-card settings-main-card">
        <strong>Configuration portability</strong>
        <h2>Export and import preview foundation</h2>
        <p>
          Generate a preview-safe appointment admin configuration package for manager review,
          backup, or future import. Import apply is intentionally disabled until rollback,
          approval, and activation controls are added.
        </p>

        <div className="appointment-catalog-detail-grid">
          <div>
            <span>Export mode</span>
            <strong>Preview safe</strong>
            <small>Portable package with user and vehicle identifiers redacted.</small>
          </div>
          <div>
            <span>Last export</span>
            <strong>{configurationExport ? configurationExport.manifest.purposeCount : 0}</strong>
            <small>{configurationExport ? "purpose templates included" : "No export generated yet"}</small>
          </div>
          <div>
            <span>Import apply</span>
            <strong>Disabled</strong>
            <small>Preview and validation only in this foundation.</small>
          </div>
        </div>

        <div className="form-actions">
          <button
            className="pill pill-primary"
            disabled={isPending}
            onClick={generateConfigurationExport}
            type="button"
          >
            Generate export package
          </button>
        </div>

        {configurationExport ? (
          <div className="appointment-admin-record-list">
            <div className="appointment-admin-record">
              <span>Export manifest</span>
              <strong>{configurationExport.location.name}</strong>
              <small>
                {configurationExport.manifest.operatingWindowCount} operating windows •{" "}
                {configurationExport.manifest.resourceCount} resources •{" "}
                {configurationExport.manifest.automationRuleCount} automation rules
              </small>
              <p>
                Redacted {configurationExport.redaction.redactedFieldCount} sensitive identifier
                fields for portable review.
              </p>
            </div>
          </div>
        ) : null}

        <div className="settings-grid">
          <label className="field appointment-admin-span">
            <span>Export package JSON</span>
            <textarea
              value={configurationExportText}
              onChange={(event) => setConfigurationExportText(event.target.value)}
              placeholder="Generate an export to review the portable JSON package."
              rows={8}
            />
          </label>

          <label className="field appointment-admin-span">
            <span>Import preview JSON</span>
            <textarea
              value={configurationImportText}
              onChange={(event) => setConfigurationImportText(event.target.value)}
              placeholder="Paste an appointment admin configuration package to validate."
              rows={8}
            />
          </label>

          <label className="field appointment-admin-span">
            <span>Required import preview reason</span>
            <input
              value={configurationImportReason}
              onChange={(event) => setConfigurationImportReason(event.target.value)}
              placeholder="Document why this package is being reviewed"
            />
          </label>
        </div>

        <div className="form-actions">
          <button
            className="pill pill-secondary"
            disabled={isPending || !configurationImportText}
            onClick={previewConfigurationImport}
            type="button"
          >
            Preview import validation
          </button>
        </div>

        {configurationImportPreview ? (
          <div className="appointment-admin-record-list">
            <div className="appointment-admin-record">
              <span>Import preview</span>
              <strong>
                {configurationImportPreview.validation.isValidPackage
                  ? "Package structure valid"
                  : "Package has validation errors"}
              </strong>
              <small>
                {configurationImportPreview.summary.purposeCount} purposes •{" "}
                {configurationImportPreview.summary.resourceCount} resources •{" "}
                {configurationImportPreview.summary.redactedFieldCount} redactions
              </small>
              {configurationImportPreview.validation.errors.map((error) => (
                <p key={error}>Error: {error}</p>
              ))}
              {configurationImportPreview.validation.warnings.map((warning) => (
                <p key={warning}>Warning: {warning}</p>
              ))}
              {configurationImportPreview.reviewChecklist.map((item) => (
                <p key={item}>Checklist: {item}</p>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <section className="appointment-admin-ops-grid">
        <form className="panel-card settings-main-card" onSubmit={submitClosure}>
          <strong>Closures and special hours</strong>
          <h2>Location closure control</h2>
          <p>
            Record holidays, planned closures, emergency closures, and special operating exceptions
            with a documented reason.
          </p>

          <div className="settings-grid">
            <label className="field">
              <span>Closure type</span>
              <select
                value={closureDraft.type}
                onChange={(event) =>
                  setClosureDraft((current) => ({ ...current, type: event.target.value }))
                }
              >
                {closureTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Name</span>
              <input
                value={closureDraft.name}
                onChange={(event) =>
                  setClosureDraft((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="Independence Day closure"
                required
              />
            </label>

            <label className="field">
              <span>Starts</span>
              <input
                type="datetime-local"
                value={closureDraft.startsAt}
                onChange={(event) =>
                  setClosureDraft((current) => ({ ...current, startsAt: event.target.value }))
                }
                required
              />
            </label>

            <label className="field">
              <span>Ends</span>
              <input
                type="datetime-local"
                value={closureDraft.endsAt}
                onChange={(event) =>
                  setClosureDraft((current) => ({ ...current, endsAt: event.target.value }))
                }
                required
              />
            </label>

            <label className="field appointment-admin-span">
              <span>Reason</span>
              <textarea
                value={closureDraft.reason}
                onChange={(event) =>
                  setClosureDraft((current) => ({ ...current, reason: event.target.value }))
                }
                placeholder="Document why scheduling is closed during this window."
                required
              />
            </label>
          </div>

          <div className="form-actions">
            <button className="pill pill-primary" disabled={isPending} type="submit">
              {isPending ? "Saving..." : "Add closure"}
            </button>
          </div>

          <div className="appointment-admin-record-list">
            {settings.closures.length > 0 ? (
              settings.closures.map((closure) => (
                <div className="appointment-admin-record" key={closure.id}>
                  <span>{formatKind(closure.type)}</span>
                  <strong>{closure.name}</strong>
                  <small>
                    {formatDateTime(closure.startsAtIso)} – {formatDateTime(closure.endsAtIso)}
                  </small>
                  <p>{closure.reason}</p>
                  <div className="appointment-admin-record-actions">
                    <button
                      className="pill pill-secondary"
                      disabled={isPending}
                      onClick={() => beginEditClosure(closure)}
                      type="button"
                    >
                      Edit
                    </button>
                    <button
                      className="pill pill-secondary"
                      disabled={isPending}
                      onClick={() => deleteClosure(closure.id)}
                      type="button"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="field-hint">No upcoming closures configured yet.</p>
            )}
          </div>
        </form>

        {editingClosure ? (
          <form className="panel-card settings-main-card" onSubmit={submitClosureEdit}>
            <strong>Edit closure</strong>
            <h2>{editingClosure.name || "Selected closure"}</h2>
            <p>
              Adjust this closure or special-hours window. A documented reason remains required.
            </p>

            <div className="settings-grid">
              <label className="field">
                <span>Closure type</span>
                <select
                  value={editingClosure.type}
                  onChange={(event) =>
                    setEditingClosure((current) =>
                      current ? { ...current, type: event.target.value } : current
                    )
                  }
                >
                  {closureTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Name</span>
                <input
                  value={editingClosure.name}
                  onChange={(event) =>
                    setEditingClosure((current) =>
                      current ? { ...current, name: event.target.value } : current
                    )
                  }
                  required
                />
              </label>

              <label className="field">
                <span>Starts</span>
                <input
                  type="datetime-local"
                  value={editingClosure.startsAt}
                  onChange={(event) =>
                    setEditingClosure((current) =>
                      current ? { ...current, startsAt: event.target.value } : current
                    )
                  }
                  required
                />
              </label>

              <label className="field">
                <span>Ends</span>
                <input
                  type="datetime-local"
                  value={editingClosure.endsAt}
                  onChange={(event) =>
                    setEditingClosure((current) =>
                      current ? { ...current, endsAt: event.target.value } : current
                    )
                  }
                  required
                />
              </label>

              <label className="field appointment-admin-span">
                <span>Reason</span>
                <textarea
                  value={editingClosure.reason}
                  onChange={(event) =>
                    setEditingClosure((current) =>
                      current ? { ...current, reason: event.target.value } : current
                    )
                  }
                  required
                />
              </label>
            </div>

            <div className="form-actions">
              <button className="pill pill-primary" disabled={isPending} type="submit">
                {isPending ? "Saving..." : "Save closure"}
              </button>
              <button
                className="pill pill-secondary"
                disabled={isPending}
                onClick={() => setEditingClosure(null)}
                type="button"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : null}

        <form className="panel-card settings-main-card" onSubmit={submitResourceUnavailability}>
          <strong>Resource availability</strong>
          <h2>Outages and capacity reductions</h2>
          <p>
            Block a resource, mark maintenance, or reduce capacity during a specific time window.
          </p>

          <div className="settings-grid">
            <label className="field">
              <span>Resource</span>
              <select
                value={unavailabilityDraft.resourceId}
                onChange={(event) =>
                  setUnavailabilityDraft((current) => ({
                    ...current,
                    resourceId: event.target.value
                  }))
                }
                required
              >
                {settings.resources.map((resource) => (
                  <option key={resource.id} value={resource.id}>
                    {resource.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Type</span>
              <select
                value={unavailabilityDraft.type}
                onChange={(event) =>
                  setUnavailabilityDraft((current) => ({ ...current, type: event.target.value }))
                }
              >
                {unavailabilityTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Starts</span>
              <input
                type="datetime-local"
                value={unavailabilityDraft.startsAt}
                onChange={(event) =>
                  setUnavailabilityDraft((current) => ({ ...current, startsAt: event.target.value }))
                }
                required
              />
            </label>

            <label className="field">
              <span>Ends</span>
              <input
                type="datetime-local"
                value={unavailabilityDraft.endsAt}
                onChange={(event) =>
                  setUnavailabilityDraft((current) => ({ ...current, endsAt: event.target.value }))
                }
                required
              />
            </label>

            <label className="field">
              <span>Capacity reduction</span>
              <input
                disabled={unavailabilityDraft.type !== "CAPACITY_REDUCTION"}
                min={1}
                type="number"
                value={unavailabilityDraft.capacityReduction ?? ""}
                onChange={(event) =>
                  setUnavailabilityDraft((current) => ({
                    ...current,
                    capacityReduction: event.target.value ? Number(event.target.value) : null
                  }))
                }
              />
            </label>

            <label className="field appointment-admin-span">
              <span>Reason</span>
              <textarea
                value={unavailabilityDraft.reason}
                onChange={(event) =>
                  setUnavailabilityDraft((current) => ({ ...current, reason: event.target.value }))
                }
                placeholder="Document why this resource is unavailable or reduced."
                required
              />
            </label>
          </div>

          <div className="form-actions">
            <button className="pill pill-primary" disabled={isPending} type="submit">
              {isPending ? "Saving..." : "Add resource window"}
            </button>
          </div>
        </form>
      </section>

      <section className="panel-card settings-main-card">
        <strong>Resource administration</strong>
        <h2>Capacity, status, and conflict policy</h2>
        <p>
          Adjust resource capacity and conflict behavior without code changes. Exclusive resources
          must remain capacity 1.
        </p>

        <div className="appointment-admin-resource-grid">
          {settings.resources.map((resource) => {
            const draft = resourceDrafts[resource.id];

            return (
              <article className="appointment-admin-resource-card" key={resource.id}>
                <header>
                  <div>
                    <span>{resource.resourceType.name}</span>
                    <strong>{resource.name}</strong>
                    <small>{resource.code}</small>
                  </div>
                  <button
                    className="pill pill-secondary"
                    disabled={isPending}
                    onClick={() => submitResourceUpdate(resource.id)}
                    type="button"
                  >
                    Save resource
                  </button>
                </header>

                <div className="settings-grid">
                  <label className="field">
                    <span>Status</span>
                    <select
                      value={draft?.status ?? resource.status}
                      onChange={(event) =>
                        setResourceDrafts((current) => ({
                          ...current,
                          [resource.id]: {
                            ...(current[resource.id] ?? {
                              status: resource.status,
                              capacityMode: resource.capacityMode,
                              capacity: resource.capacity,
                              conflictPolicy: resource.conflictPolicy
                            }),
                            status: event.target.value
                          }
                        }))
                      }
                    >
                      {resourceStatuses.map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="field">
                    <span>Capacity mode</span>
                    <select
                      value={draft?.capacityMode ?? resource.capacityMode}
                      onChange={(event) =>
                        setResourceDrafts((current) => ({
                          ...current,
                          [resource.id]: {
                            ...(current[resource.id] ?? {
                              status: resource.status,
                              capacityMode: resource.capacityMode,
                              capacity: resource.capacity,
                              conflictPolicy: resource.conflictPolicy
                            }),
                            capacityMode: event.target.value,
                            capacity:
                              event.target.value === "EXCLUSIVE"
                                ? 1
                                : current[resource.id]?.capacity ?? resource.capacity
                          }
                        }))
                      }
                    >
                      {capacityModes.map((mode) => (
                        <option key={mode.value} value={mode.value}>
                          {mode.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="field">
                    <span>Capacity</span>
                    <input
                      min={1}
                      type="number"
                      value={draft?.capacity ?? resource.capacity}
                      onChange={(event) =>
                        setResourceDrafts((current) => ({
                          ...current,
                          [resource.id]: {
                            ...(current[resource.id] ?? {
                              status: resource.status,
                              capacityMode: resource.capacityMode,
                              capacity: resource.capacity,
                              conflictPolicy: resource.conflictPolicy
                            }),
                            capacity: Number(event.target.value)
                          }
                        }))
                      }
                    />
                  </label>

                  <label className="field">
                    <span>Conflict policy</span>
                    <select
                      value={draft?.conflictPolicy ?? resource.conflictPolicy}
                      onChange={(event) =>
                        setResourceDrafts((current) => ({
                          ...current,
                          [resource.id]: {
                            ...(current[resource.id] ?? {
                              status: resource.status,
                              capacityMode: resource.capacityMode,
                              capacity: resource.capacity,
                              conflictPolicy: resource.conflictPolicy
                            }),
                            conflictPolicy: event.target.value
                          }
                        }))
                      }
                    >
                      {conflictPolicies.map((policy) => (
                        <option key={policy.value} value={policy.value}>
                          {policy.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="appointment-admin-record-list">
                  {resource.unavailability.length > 0 ? (
                    resource.unavailability.map((entry) => (
                      <div className="appointment-admin-record" key={entry.id}>
                        <span>{formatKind(entry.type)}</span>
                        <strong>
                          {formatDateTime(entry.startsAtIso)} – {formatDateTime(entry.endsAtIso)}
                        </strong>
                        <small>
                          {entry.capacityReduction
                            ? `Capacity reduction: ${entry.capacityReduction}`
                            : "Full resource impact"}
                        </small>
                        <p>{entry.reason}</p>
                      </div>
                    ))
                  ) : (
                    <p className="field-hint">No active outage or capacity-reduction windows.</p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="appointment-admin-summary-grid">
        <article className="panel-card settings-callout-card">
          <strong>Resources</strong>
          <h2>Scheduling resources</h2>
          <p>
            Staff, vehicles, bays, and vendor-style resources stay governed here so conflicts can
            warn or block from one foundation.
          </p>
          <div className="settings-summary-grid">
            <div className="settings-summary-card">
              <span>Types</span>
              <strong>{settings.resourceTypes.length}</strong>
              <small>resource definitions</small>
            </div>
            <div className="settings-summary-card">
              <span>Resources</span>
              <strong>{settings.resources.length}</strong>
              <small>active scheduling assets</small>
            </div>
          </div>
          <div className="appointment-admin-pill-list">
            {Object.entries(resourceTypesByKind).map(([kind, count]) => (
              <span key={kind}>
                {formatKind(kind)} types: {count}
              </span>
            ))}
            {Object.entries(resourcesByKind).map(([kind, count]) => (
              <span key={kind}>
                {formatKind(kind)} resources: {count}
              </span>
            ))}
          </div>
        </article>

        <article className="panel-card settings-callout-card">
          <strong>Catalogs</strong>
          <h2>Appointment categories</h2>
          <p>
            Enterprise templates define approved appointment purposes, outcomes, follow-up
            dispositions, and documented reason codes.
          </p>
          <div className="appointment-admin-code-list">
            {settings.catalogs.purposes.map((purpose) => (
              <span key={purpose.code}>
                {purpose.name} · {purpose.defaultDurationMinutes} min
              </span>
            ))}
          </div>
        </article>

        <article className="panel-card settings-callout-card">
          <strong>Automation readiness</strong>
          <h2>Rules prepared for day one</h2>
          <p>
            These rule hooks are seeded from the approved enterprise templates. Editors can be
            expanded later without changing the board design.
          </p>
          <div className="appointment-admin-code-list">
            {settings.automationRules.slice(0, 10).map((rule) => (
              <span key={`${rule.purposeCode}-${rule.code}`}>
                {rule.purposeName}: {rule.code}
              </span>
            ))}
          </div>
          {settings.automationRules.length > 10 ? (
            <small className="field-hint">
              +{settings.automationRules.length - 10} more automation hooks configured.
            </small>
          ) : null}
        </article>
      </section>
    </div>
  );
}
