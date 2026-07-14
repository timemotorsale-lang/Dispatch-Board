import Image from "next/image";
import Link from "next/link";

import { requireCurrentUser } from "@/server/auth/current-user";

const references = [
  { title: "Inventory Lifecycle Control Tower", role: "Inventory manager and general manager", image: "/mockups/inventory-lifecycle-control-tower.png", href: "/vehicles" },
  { title: "Inventory Manager Workspace", role: "Inventory manager", image: "/mockups/inventory-manager-workspace.png", href: "/inventory-manager" },
  { title: "Vehicle 360 Workspace", role: "Inventory, service advisor, and manager", image: "/mockups/vehicle-360-workspace.png", href: "/vehicles/registry" },
  { title: "Service Advisor Workspace", role: "Service advisor and service manager", image: "/mockups/service-advisor-workspace.png", href: "/vehicles/advisor" },
  { title: "Insights Workspace", role: "General manager and department managers", image: "/mockups/insights-workspace.png", href: "/insights" },
  { title: "Administration & Integration Workspace", role: "Manager and platform administrator", image: "/mockups/administration-integration-workspace.png", href: "/administration" }
];

export default async function WorkspaceDesignReferencePage() {
  await requireCurrentUser();
  return (
    <section className="page-stack workspace-reference-gallery">
      <header className="dashboard-page-header">
        <div className="dashboard-page-copy">
          <span className="eyebrow">Approved visual source of truth</span>
          <h1>Workspace Design Reference</h1>
          <p>These six approved mockups define the intended role-based console experience. Open any image to jump to its live workspace.</p>
        </div>
      </header>
      <div className="workspace-reference-grid">
        {references.map((reference) => (
          <article className="workspace-reference-card" key={reference.image}>
            <Image alt={`${reference.title} mockup`} height={700} src={reference.image} width={1200} />
            <div><span>{reference.role}</span><h2>{reference.title}</h2><Link className="pill pill-primary" href={reference.href}>Open live workspace</Link></div>
          </article>
        ))}
      </div>
    </section>
  );
}
