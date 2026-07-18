import { AlertTriangle, ArrowRight, Boxes, CarFront, ClipboardPlus, Search, ShieldCheck, Wrench } from "lucide-react";
import Link from "next/link";

const catalog = [
  { id: "WL-01", title: "Add / Acquire Vehicle", description: "Start evidence qualification and appraisal before any InventoryUnit or commitment exists.", href: "/vehicles/acquisition-appraisal", icon: CarFront, state: "R4 GOVERNED" },
  { id: "WL-02", title: "Receive Vehicle", description: "Receipt and custody intake remains approval-gated until its frontline slice is enabled.", href: null, icon: CarFront, state: "APPROVAL GATED" },
  { id: "WL-03", title: "Start Inspection", description: "Requires an eligible received vehicle and qualified inspection context.", href: null, icon: Search, state: "CONTEXT REQUIRED" },
  { id: "WL-04", title: "Request Inventory Recon", description: "Open the purpose-built inventory-recon RepairOrder intake.", href: "/vehicles/repair-orders?source=INVENTORY_RECON", icon: Wrench, state: "AVAILABLE FOUNDATION" },
  { id: "WL-05", title: "Create Repair Order", description: "Open the customer or inventory repair intake workspace.", href: "/vehicles/repair-orders", icon: Wrench, state: "AVAILABLE FOUNDATION" },
  { id: "WL-06", title: "Report Blocker", description: "Select affected work first so the blocker has an owner, reason, and due time.", href: "/tasks/intake?workflowArea=INVENTORY", icon: AlertTriangle, state: "CONTEXT PREFERRED" },
  { id: "WL-07", title: "Request Approval", description: "Open the governed decision queue; exact proposal/version context is required.", href: "/manager-review?scope=inventory&view=approvals", icon: ShieldCheck, state: "CONTEXT REQUIRED" },
  { id: "WL-08", title: "Create General Task", description: "Create ad hoc work without changing a governed vehicle workflow.", href: "/tasks/intake?workflowArea=INVENTORY", icon: ClipboardPlus, state: "AVAILABLE" },
  { id: "WL-C01", title: "Request Parts", description: "Create or inspect job-linked demand in Parts & Readiness.", href: "/vehicles/parts", icon: Boxes, state: "CONTEXT REQUIRED" },
];

export function WorkflowLauncher({ roles }: { roles: string[] }) {
  return <section className="inventory-workflow-launcher"><header><div><p>Inventory Console</p><h1>Start Workflow</h1><span>Choose a purpose-built intake. Availability is rechecked server-side when a command is submitted.</span></div><Link href="/vehicles">Back to Home</Link></header><div className="iwl-context"><ShieldCheck size={17} /><span>Signed in with {roles.length ? roles.join(", ") : "staff"} access. Disabled choices explain the missing context or rollout gate.</span></div><div className="iwl-grid">{catalog.map(({ description, href, icon: Icon, id, state, title }) => <article className={href ? "" : "disabled"} key={id}><header><Icon size={20} /><span>{id}</span><b>{state}</b></header><h2>{title}</h2><p>{description}</p>{href ? <Link href={href}>Open intake<ArrowRight size={15} /></Link> : <button disabled type="button">Not available in current context</button>}</article>)}</div><footer><AlertTriangle size={16} /><span>The launcher does not offer generic stage changes. Every accepted workflow must return its created records, tasks, approvals, and events.</span></footer></section>;
}
