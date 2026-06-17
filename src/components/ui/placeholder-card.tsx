import Link from "next/link";

type PlaceholderCardProps = {
  title: string;
  description: string;
  note?: string;
  href?: string;
  ctaLabel?: string;
  label?: string;
};

export function PlaceholderCard({
  title,
  description,
  note,
  href,
  ctaLabel = "Open",
  label = "App route"
}: PlaceholderCardProps) {
  return (
    <article className="panel-card">
      <strong>{label}</strong>
      <h2>{title}</h2>
      <p>{description}</p>
      {note ? (
        <div className="notice">
          <p>{note}</p>
        </div>
      ) : null}
      {href ? (
        <div className="placeholder-actions">
          <Link className="pill pill-secondary" href={href}>
            {ctaLabel}
          </Link>
        </div>
      ) : null}
    </article>
  );
}

