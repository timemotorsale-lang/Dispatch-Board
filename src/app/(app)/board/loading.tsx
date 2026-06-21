export default function LoadingBoardPage() {
  return (
    <section className="page-stack board-page">
      <div className="panel-card board-hero">
        <div className="board-hero-copy">
          <span className="eyebrow">Dispatch board</span>
          <h1>Loading board</h1>
          <p>Preparing the selected board view.</p>
        </div>
      </div>

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

      <div className="panel-card">
        <p>Loading board data.</p>
      </div>
    </section>
  );
}
