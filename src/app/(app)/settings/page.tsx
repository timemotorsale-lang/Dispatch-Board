import { PlaceholderCard } from "@/components/ui/placeholder-card";

export default function SettingsPage() {
  return (
    <section className="page-stack">
      <div className="page-copy">
        <span className="eyebrow">Protected settings</span>
        <h1>Application settings</h1>
        <p>
          This route reserves the home for generation time, business-day rules, and app
          configuration once settings are modeled in the database, with manager-only actions ready
          to plug into the new policy layer.
        </p>
      </div>

      <PlaceholderCard
        title="Configuration roadmap"
        description="Real generation settings and manager-only editing arrive after the foundation milestone."
        note="Planned in v0.3.0."
      />
    </section>
  );
}

