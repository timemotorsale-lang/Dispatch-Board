import { AlertTriangle, ArrowRight, Boxes, CarFront, ClipboardPlus, ListChecks, Search, ShieldCheck, Wrench, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { getInventoryWorkflowLauncher } from "@/server/inventory-workflow-launcher/service";
type Model = ReturnType<typeof getInventoryWorkflowLauncher>;
const icons: Record<Model["cards"][number]["icon"], LucideIcon> = { alert: AlertTriangle, car: CarFront, operations: ListChecks, parts: Boxes, search: Search, shield: ShieldCheck, task: ClipboardPlus, wrench: Wrench };

export function WorkflowLauncher({ model }: { model: Model }) {
  return <section className="inventory-workflow-launcher"><header><div><p>Inventory Console</p><h1>Start Workflow</h1><span>Choose a purpose-built intake. Role, context, validation, approval, and recovery are explicit before you leave the launcher.</span></div><Link href="/vehicles">Back to Home</Link></header>
    <div className="iwl-context"><ShieldCheck size={17} /><span>Signed in with {model.actor.roles.length ? model.actor.roles.join(", ") : "staff"} access · {model.totals.available}/{model.totals.visible} visible workflows available in current context · {model.contractVersion}</span></div>
    <div className="iwl-grid">{model.cards.map(item => { const Icon = icons[item.icon]; return <article className={item.enabled ? "" : "disabled"} key={item.id}><header><Icon size={20} /><span>{item.id}</span><b>{item.state}</b></header><h2>{item.title}</h2><p>{item.description}</p><small>{item.availabilityReason}</small><details><summary>Intake contract</summary><p><strong>Creates:</strong> {item.creates.join(" · ")}</p><p><strong>Validation:</strong> {item.validation}</p><p><strong>Confirmation:</strong> {item.confirmation}</p><p><strong>Approval:</strong> {item.approval}</p><p><strong>Recovery:</strong> {item.recovery}</p></details>{item.href ? <Link href={item.href}>Open purpose-built intake<ArrowRight size={15} /></Link> : <button disabled type="button">Add required context</button>}</article>; })}</div>
    <footer><AlertTriangle size={16} /><span>The launcher never performs a generic stage change. Every accepted intake must return its durable record, version, tasks/approvals, events, and recovery route.</span></footer>
  </section>;
}
