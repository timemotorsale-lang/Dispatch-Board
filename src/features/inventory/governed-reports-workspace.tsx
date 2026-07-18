import Link from "next/link";
import type { getInventoryGovernanceConsole } from "@/server/inventory-governance/service";
type Model = Awaited<ReturnType<typeof getInventoryGovernanceConsole>>;

export function GovernedReportsWorkspace({ model }: { model: Model }) {
  return <section className="gov-page page-stack"><header className="gov-hero"><div><span className="eyebrow">Inventory Console · R10 governed reporting</span><h1>Reports</h1><p>Versioned operational facts with cutoff, scope, quality, and drill-through—not anonymous dashboard numbers.</p></div><div><strong>{model.reports.snapshot.restatement}</strong><span>{model.reports.snapshot.cohort}</span><span>Cutoff {new Date(model.reports.snapshot.cutoffAt).toLocaleString()}</span></div></header>
    <nav className="gov-tabs"><Link href="/reports?scope=inventory" className="active">Scorecard</Link><Link href="/manager-review?scope=inventory&view=reviews">Reviews</Link><Link href="/manager-review?scope=inventory&view=approvals">Approvals</Link><Link href="/administration?view=audit">Audit explorer</Link></nav>
    <section className="gov-report-grid">{model.reports.facts.map(fact => <article key={fact.code}><span>{fact.label}</span><strong>{fact.value}</strong><small>{fact.code} · {fact.definitionVersion}</small><small>Quality: {fact.quality} · {model.reports.snapshot.timezone}</small><Link href={fact.drillHref}>Open governed drill-through</Link></article>)}</section>
    <div className="gov-work-grid"><section className="gov-panel"><header><h2>Inventory lifecycle cohort</h2><b>{model.reports.inventoryStages.reduce((sum, item) => sum + item.count, 0)}</b></header>{model.reports.inventoryStages.map(item => <p key={item.code}><span>{item.code.replaceAll("_", " ")}</span><strong>{item.count}</strong></p>)}</section><section className="gov-panel"><header><h2>Shop stage cohort</h2><b>{model.reports.repairStates.reduce((sum, item) => sum + item.count, 0)}</b></header>{model.reports.repairStates.map(item => <p key={item.code}><span>{item.code.replaceAll("_", " ")}</span><strong>{item.count}</strong></p>)}</section></div>
    <div className="notice notice-info"><p>Controlled export and print are preview-only in R10. Row/field permissions, reason, cutoff, watermark, bounded volume, and export audit must be enforced before activation.</p></div>
  </section>;
}
