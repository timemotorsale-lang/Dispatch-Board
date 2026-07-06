"use client";

import { useState, useTransition } from "react";

import type {
  AppointmentAdminSettings,
  AppointmentAdminSettingsInput,
  AppointmentLocationClosureInput,
  AppointmentOperatingWindowInput,
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

type AppointmentAdminSettingsPanelProps = {
  initialSettings: AppointmentAdminSettings;
};

type AppointmentLocationFormState = AppointmentAdminSettingsInput["location"];

type AppointmentSettingsFormState = {
  location: AppointmentLocationFormState;
  operatingWindows: AppointmentOperatingWindowInput[];
};

type ResourceFormState = Record<string, Omit<AppointmentResourceUpdateInput, "resourceId">>;
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
  const [unavailabilityDraft, setUnavailabilityDraft] = useState<AppointmentResourceUnavailabilityInput>({
    ...defaultUnavailabilityDraft,
    resourceId: initialSettings.resources[0]?.id ?? ""
  });
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
    setUnavailabilityDraft((current) => ({
      ...current,
      resourceId: nextSettings.resources.some((resource) => resource.id === current.resourceId)
        ? current.resourceId
        : nextSettings.resources[0]?.id ?? ""
    }));
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
