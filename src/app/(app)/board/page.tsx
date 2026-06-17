import { PlaceholderCard } from "@/components/ui/placeholder-card";

export default function BoardPage() {
  return (
    <section className="page-stack">
      <div className="page-copy">
        <span className="eyebrow">Protected board</span>
        <h1>Dispatch board shell</h1>
        <p>
          This route now requires a valid session before loading, while the real board workflow
          remains reserved for the next milestones.
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
          description="Authentication is active here now, and later board APIs can reuse the same server-side user and policy helpers."
          note="Auth work landed in v0.2.0."
        />
      </div>
    </section>
  );
}

