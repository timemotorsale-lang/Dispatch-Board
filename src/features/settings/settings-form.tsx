"use client";

import { useState, useTransition } from "react";

const businessDayOptions = [
  { value: "MONDAY", label: "Monday" },
  { value: "TUESDAY", label: "Tuesday" },
  { value: "WEDNESDAY", label: "Wednesday" },
  { value: "THURSDAY", label: "Thursday" },
  { value: "FRIDAY", label: "Friday" },
  { value: "SATURDAY", label: "Saturday" },
  { value: "SUNDAY", label: "Sunday" }
] as const;

type SettingsFormState = {
  dailyGenerationTime: string;
  timezone: string;
  businessDays: string[];
};

type SettingsFormProps = {
  initialSettings: SettingsFormState;
};

export function SettingsForm({ initialSettings }: SettingsFormProps) {
  const [isPending, startTransition] = useTransition();
  const [formState, setFormState] = useState<SettingsFormState>(initialSettings);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  function updateBusinessDays(day: string, checked: boolean) {
    setFormState((currentState) => {
      const nextBusinessDays = checked
        ? businessDayOptions
            .map((option) => option.value)
            .filter((value) => value === day || currentState.businessDays.includes(value))
        : currentState.businessDays.filter((value) => value !== day);

      return {
        ...currentState,
        businessDays: nextBusinessDays
      };
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    startTransition(async () => {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formState)
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            error?: string;
            settings?: SettingsFormState;
          }
        | null;

      if (!response.ok || !payload?.settings) {
        setErrorMessage(payload?.error ?? "Unable to save settings right now.");
        return;
      }

      setFormState(payload.settings);
      setSuccessMessage("Settings saved.");
    });
  }

  return (
    <form className="settings-form" onSubmit={handleSubmit}>
      <div className="settings-grid">
        <label className="field">
          <span>Daily generation time</span>
          <input
            name="dailyGenerationTime"
            type="time"
            value={formState.dailyGenerationTime}
            onChange={(event) =>
              setFormState((currentState) => ({
                ...currentState,
                dailyGenerationTime: event.target.value
              }))
            }
            required
          />
        </label>

        <label className="field">
          <span>Timezone</span>
          <input
            name="timezone"
            type="text"
            value={formState.timezone}
            onChange={(event) =>
              setFormState((currentState) => ({
                ...currentState,
                timezone: event.target.value
              }))
            }
            placeholder="America/Chicago"
            required
          />
          <small className="field-hint">Use an IANA timezone like `America/Chicago`.</small>
        </label>
      </div>

      <fieldset className="business-day-group">
        <legend>Business days</legend>
        <p className="field-hint">
          Choose the days that should count for future daily board generation.
        </p>
        <div className="checkbox-list">
          {businessDayOptions.map((option) => (
            <label className="checkbox-item" key={option.value}>
              <input
                checked={formState.businessDays.includes(option.value)}
                name="businessDays"
                type="checkbox"
                value={option.value}
                onChange={(event) => updateBusinessDays(option.value, event.target.checked)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

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
          {isPending ? "Saving..." : "Save settings"}
        </button>
      </div>
    </form>
  );
}
