import Link from "next/link";

type PlaceholderRoutePageProps = {
  eyebrow: string;
  title: string;
  description: string;
  note: string;
};

export function PlaceholderRoutePage({
  eyebrow,
  title,
  description,
  note
}: PlaceholderRoutePageProps) {
  return (
    <section className="page-stack dashboard-page">
      <div className="dashboard-page-header">
        <div className="dashboard-page-copy">
          <span className="eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </div>

      <article className="panel-card placeholder-route-card">
        <strong>Planned surface</strong>
        <h2>Not implemented yet</h2>
        <p>{note}</p>
        <div className="hero-actions">
          <Link className="pill pill-primary" href="/board">
            Open board
          </Link>
          <Link className="pill pill-secondary" href="/my-tasks">
            Open My Tasks
          </Link>
        </div>
      </article>
    </section>
  );
}
