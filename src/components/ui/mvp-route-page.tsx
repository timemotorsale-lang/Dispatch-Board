import Link from "next/link";

type MvpRoutePageAction = {
  href: string;
  label: string;
};

type MvpRoutePageSectionLink = {
  description: string;
  href: string;
  label: string;
};

type MvpRoutePageSection = {
  description: string;
  links?: MvpRoutePageSectionLink[];
  title: string;
};

type MvpRoutePageProps = {
  description: string;
  eyebrow: string;
  primaryAction: MvpRoutePageAction;
  secondaryAction?: MvpRoutePageAction;
  sections: MvpRoutePageSection[];
  title: string;
};

export function MvpRoutePage({
  description,
  eyebrow,
  primaryAction,
  secondaryAction,
  sections,
  title
}: MvpRoutePageProps) {
  return (
    <section className="page-stack dashboard-page">
      <div className="dashboard-page-header">
        <div className="dashboard-page-copy">
          <span className="eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </div>

      <div className="hero-actions">
        <Link className="pill pill-primary" href={primaryAction.href}>
          {primaryAction.label}
        </Link>
        {secondaryAction ? (
          <Link className="pill pill-secondary" href={secondaryAction.href}>
            {secondaryAction.label}
          </Link>
        ) : null}
      </div>

      <div className="dashboard-page-grid">
        {sections.map((section) => (
          <article className="panel-card mvp-route-card" key={section.title}>
            <strong>{eyebrow}</strong>
            <h2>{section.title}</h2>
            <p>{section.description}</p>
            {section.links?.length ? (
              <div className="mvp-route-links">
                {section.links.map((link) => (
                  <Link className="pill pill-secondary" href={link.href} key={`${section.title}:${link.href}`}>
                    {link.label}
                  </Link>
                ))}
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
