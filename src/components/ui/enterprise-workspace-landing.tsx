import Link from "next/link";
import { WorkspaceMockupReference } from "./workspace-mockup-reference";

export type WorkspaceCard = {
  title: string;
  description: string;
  href: string;
  label?: string;
};

type EnterpriseWorkspaceLandingProps = {
  eyebrow: string;
  title: string;
  description: string;
  activeDuty: string;
  cards: WorkspaceCard[];
  primaryAction: { href: string; label: string };
  mockup?: { image: string; title: string; role: string };
};

export function EnterpriseWorkspaceLanding({
  eyebrow,
  title,
  description,
  activeDuty,
  cards,
  primaryAction,
  mockup
}: EnterpriseWorkspaceLandingProps) {
  return (
    <section className="page-stack dashboard-page">
      <div className="dashboard-page-header">
        <div className="dashboard-page-copy">
          <span className="eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <div className="workspace-context-card" aria-label="Active workspace context">
          <span>Active workspace</span>
          <strong>{activeDuty}</strong>
          <small>Switch workspaces from the navigation without changing identity.</small>
        </div>
      </div>
      <div className="hero-actions">
        <Link className="pill pill-primary" href={primaryAction.href}>{primaryAction.label}</Link>
      </div>
      {mockup ? <WorkspaceMockupReference {...mockup} /> : null}
      <div className="dashboard-page-grid">
        {cards.map((card) => (
          <article className="panel-card mvp-route-card" key={card.href}>
            <strong>{card.label ?? eyebrow}</strong>
            <h2>{card.title}</h2>
            <p>{card.description}</p>
            <Link className="pill pill-secondary" href={card.href}>Open workspace</Link>
          </article>
        ))}
      </div>
    </section>
  );
}
