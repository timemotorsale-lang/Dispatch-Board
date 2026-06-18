import { SettingsForm } from "@/features/settings/settings-form";
import { requireCurrentUser } from "@/server/auth/current-user";
import { canManageSettings } from "@/server/policies/access";
import { getGenerationSettings } from "@/server/services/app-settings-service";

async function loadSettingsPageData() {
  try {
    const settings = await getGenerationSettings();

    return {
      settings,
      errorMessage: ""
    };
  } catch (error) {
    return {
      settings: null,
      errorMessage:
        error instanceof Error ? error.message : "Unable to load settings right now. Please try again."
    };
  }
}

export default async function SettingsPage() {
  const user = await requireCurrentUser();

  if (!canManageSettings(user)) {
    return (
      <section className="page-stack">
        <div className="page-copy">
          <span className="eyebrow">Protected settings</span>
          <h1>Application settings</h1>
          <p>
            Generation settings can only be updated by managers. Your account can still access the
            rest of the protected app shell, but this page is read-only for now.
          </p>
        </div>

        <div className="notice notice-danger">
          <p>Manager access is required to change daily generation settings.</p>
        </div>
      </section>
    );
  }

  const { settings, errorMessage } = await loadSettingsPageData();

  if (settings) {
    return (
      <section className="page-stack">
        <div className="page-copy">
          <span className="eyebrow">Protected settings</span>
          <h1>Application settings</h1>
          <p>
            Managers can adjust the daily board generation time, timezone, and business-day rules
            here. Changes save through the protected server-side settings path.
          </p>
        </div>

        <article className="panel-card">
          <strong>Daily generation defaults</strong>
          <h2>Board generation settings</h2>
          <p>Update the schedule foundation that later daily generation work will read from.</p>
          <SettingsForm
            initialSettings={{
              dailyGenerationTime: settings.dailyGenerationTime,
              timezone: settings.timezone,
              businessDays: settings.businessDays
            }}
          />
        </article>
      </section>
    );
  }

  return (
    <section className="page-stack">
      <div className="page-copy">
        <span className="eyebrow">Protected settings</span>
        <h1>Application settings</h1>
        <p>The settings page is available, but the current configuration could not be loaded.</p>
      </div>

      <div className="notice notice-danger">
        <p>{errorMessage}</p>
      </div>
    </section>
  );
}

