import { EmptyStateCard } from "@/components/ui/state-card";

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
        <EmptyStateCard
          actions={[
            { href: "/board", label: "Open board" },
            { href: "/my-tasks", label: "Open My Tasks", tone: "secondary" }
          ]}
          eyebrow="Planned surface"
          message={note}
          title="Not implemented yet"
        />
      </article>
    </section>
  );
}
