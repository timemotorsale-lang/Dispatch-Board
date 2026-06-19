import { PlaceholderCard } from "@/components/ui/placeholder-card";
import Link from "next/link";

export default function TasksPage() {
  return (
    <section className="page-stack">
      <div className="page-copy">
        <span className="eyebrow">Protected tasks</span>
        <h1>Task routes and detail surface</h1>
        <p>
          The staff-focused My Tasks screen now owns day-to-day status updates. This route stays as
          the shared landing area for broader task workflow expansion and task-detail navigation.
        </p>
      </div>

      <div className="hero-actions">
        <Link className="pill pill-primary" href="/my-tasks">
          Open My Tasks
        </Link>
        <Link className="pill pill-secondary" href="/board">
          Open full board
        </Link>
      </div>

      <PlaceholderCard
        title="Task detail now live"
        description="Use My Tasks or the board to open a real task detail page. Broader task editing and comments are still intentionally deferred."
        note="Comments and manager review queue stay out of scope for DB-037."
      />
    </section>
  );
}

