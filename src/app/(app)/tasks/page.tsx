import { PlaceholderCard } from "@/components/ui/placeholder-card";

export default function TasksPage() {
  return (
    <section className="page-stack">
      <div className="page-copy">
        <span className="eyebrow">Tasks placeholder</span>
        <h1>Task workflow surface</h1>
        <p>
          The task route is in place for upcoming manager and staff task flows, but no real task
          CRUD or status logic is implemented in this milestone.
        </p>
      </div>

      <PlaceholderCard
        title="Future task flow"
        description="Manual task creation, due-time validation, status transitions, and comments are intentionally deferred."
        note="Planned starting in v0.4.0."
      />
    </section>
  );
}

