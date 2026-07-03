import { LoadingStateCard } from "@/components/ui/state-card";

export default function LoadingBoardPage() {
  return (
    <section className="page-stack board-page">
      <div className="panel-grid board-summary-grid">
        <article className="panel-card board-stat-card">
          <strong>Selected date</strong>
          <h2>—</h2>
          <p className="board-stat-card-copy">Loading board metadata.</p>
        </article>
        <article className="panel-card board-stat-card">
          <strong>Total tasks</strong>
          <h2>—</h2>
          <p className="board-stat-card-copy">Loading board totals.</p>
        </article>
        <article className="panel-card board-stat-card">
          <strong>Generated tasks</strong>
          <h2>—</h2>
          <p className="board-stat-card-copy">Loading generated work counts.</p>
        </article>
        <article className="panel-card board-stat-card">
          <strong>Needs attention</strong>
          <h2>—</h2>
          <p className="board-stat-card-copy">Loading attention summary.</p>
        </article>
      </div>

      <LoadingStateCard
        eyebrow="Dispatch board"
        message="Preparing the selected board view and loading today's operational totals."
        title="Loading board"
      />
    </section>
  );
}
