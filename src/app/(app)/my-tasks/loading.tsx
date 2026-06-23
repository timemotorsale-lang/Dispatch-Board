import { LoadingStateCard } from "@/components/ui/state-card";

export default function LoadingMyTasksPage() {
  return (
    <section className="page-stack board-page my-tasks-page">
      <div className="panel-grid board-summary-grid">
        <article className="panel-card board-stat-card">
          <strong>Assigned today</strong>
          <h2>-</h2>
          <p className="board-stat-card-copy">Loading your task count.</p>
        </article>
        <article className="panel-card board-stat-card">
          <strong>Open work</strong>
          <h2>-</h2>
          <p className="board-stat-card-copy">Loading in-flight work.</p>
        </article>
      </div>

      <LoadingStateCard
        eyebrow="Staff task view"
        message="Preparing your assigned work for today."
        title="Loading My Tasks"
      />
    </section>
  );
}
