import { PlaceholderCard } from "@/components/ui/placeholder-card";
import Link from "next/link";

export default function TasksPage() {
  return (
    <section className="page-stack dashboard-page">
      <div className="dashboard-page-header">
        <div className="dashboard-page-copy">
          <span className="eyebrow">Protected tasks</span>
          <h1>Task routes and detail surface</h1>
          <p>
            The staff-focused My Tasks screen now owns day-to-day status updates. This route stays
            as the shared landing area for broader task workflow expansion and task-detail
            navigation.
          </p>
        </div>
      </div>

      <div className="hero-actions">
        <Link className="pill pill-primary" href="/my-tasks">
          Open My Tasks
        </Link>
        <Link className="pill pill-secondary" href="/board">
          Open full board
        </Link>
      </div>

      <div className="dashboard-page-grid">
        <PlaceholderCard
          title="Task detail now live"
          description="Use My Tasks or the board to open a real task detail page with workflow context and task updates."
          note="Broader task editing and the manager review queue still expand from here in later slices."
        />

        <PlaceholderCard
          title="Why this route remains"
          description="The approved mockup expects a task-oriented destination in the shell, even while the board remains the main daily operating surface."
          note="As more workflow slices land, this page can become the shared entry point for search, review queues, and cross-team task management."
        />
      </div>
    </section>
  );
}

