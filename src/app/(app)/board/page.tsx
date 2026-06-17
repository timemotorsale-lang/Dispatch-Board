import { PlaceholderCard } from "@/components/ui/placeholder-card";

export default function BoardPage() {
  return (
    <section className="page-stack">
      <div className="page-copy">
        <span className="eyebrow">Board placeholder</span>
        <h1>Dispatch board shell</h1>
        <p>
          This route establishes the future manager and staff board surface without claiming the
          real workflow exists yet.
        </p>
      </div>

      <div className="panel-grid">
        <PlaceholderCard
          title="Board data"
          description="Daily generation, grouping, filtering, and activity are deferred to later milestones."
          note="Planned in v0.3.0 through v0.5.0."
        />
        <PlaceholderCard
          title="Protected shell"
          description="This layout is intentionally marked as a placeholder until real auth and permissions exist."
          note="Auth work begins in v0.2.0."
        />
      </div>
    </section>
  );
}

