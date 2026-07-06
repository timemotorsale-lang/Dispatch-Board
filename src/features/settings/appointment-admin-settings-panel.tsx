"use client";

import { useState, useTransition } from "react";

import type {
  AppointmentAdminSettings,
  AppointmentAdminSettingsInput,
  AppointmentOperatingWindowInput
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

type AppointmentAdminSettingsPanelProps = {
  initialSettings: AppointmentAdminSettings;
};

type AppointmentLocationFormState = AppointmentAdminSettingsInput["location"];

type AppointmentSettingsFormState = {
  location: AppointmentLocationFormState;
  operatingWindows: AppointmentOperatingWindowInput[];
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

export function AppointmentAdminSettingsPanel({
  initialSettings
}: AppointmentAdminSettingsPanelProps) {
  const [settings, setSettings] = useState(initialSettings);
  const [formState, setFormState] = useState(() => toFormState(initialSettings));
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

      setSettings(payload.settings);
      setFormState(toFormState(payload.settings));
      setSuccessMessage("Appointment settings saved. The Appointment Board will read these details.");
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
