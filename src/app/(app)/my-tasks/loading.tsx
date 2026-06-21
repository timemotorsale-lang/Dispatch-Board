export default function LoadingMyTasksPage() {
  return (
    <section className="page-stack board-page my-tasks-page">
      <div className="panel-card board-hero">
        <div className="board-hero-copy">
          <span className="eyebrow">Staff task view</span>
          <h1>Loading My Tasks</h1>
          <p>Preparing your assigned work for today.</p>
        </div>
      </div>

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

      <div className="panel-card">
        <p>Loading your task list.</p>
      </div>
    </section>
  );
}
