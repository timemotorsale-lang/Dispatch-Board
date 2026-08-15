import { ArrowRight, ExternalLink, ShieldCheck } from "lucide-react";
import Link from "next/link";

type OpportunityAction = {
  description: string;
  href: string;
  label: string;
  state: "HELD" | "REVIEW";
};

type Props = {
  actions: readonly OpportunityAction[];
  eyebrow?: string;
  title: string;
};

export function UnifiedCrmOpportunityActions({
  actions,
  eyebrow = "Opportunity actions",
  title
}: Props) {
  return (
    <section className="ucrm-opportunity-actions" aria-label={title}>
      <header className="ucrm-opportunity-actions__header">
        <div>
          <span className="ucrm-opportunity-actions__eyebrow">{eyebrow}</span>
          <h3>{title}</h3>
        </div>
        <span className="ucrm-opportunity-actions__badge">
          <ShieldCheck aria-hidden="true" size={14} />
          Review safe
        </span>
      </header>
      <div className="ucrm-opportunity-actions__grid">
        {actions.map((action) => (
          <Link className="ucrm-opportunity-actions__item" href={action.href} key={`${action.label}-${action.href}`}>
            <div>
              <strong>{action.label}</strong>
              <p>{action.description}</p>
            </div>
            <span>
              {action.state}
              {action.state === "REVIEW" ? <ExternalLink aria-hidden="true" size={13} /> : <ArrowRight aria-hidden="true" size={13} />}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
