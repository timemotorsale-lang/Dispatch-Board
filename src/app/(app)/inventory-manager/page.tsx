import { EnterpriseWorkspaceLanding } from "@/components/ui/enterprise-workspace-landing";
import { requireCurrentUser } from "@/server/auth/current-user";

export default async function InventoryManagerWorkspacePage() {
  await requireCurrentUser();
  return <EnterpriseWorkspaceLanding eyebrow="Inventory Manager" title="Inventory Manager Workspace" activeDuty="Inventory operations" description="Move between acquisition, intake, readiness, merchandising, exposure, and sale work without changing identity or losing context." primaryAction={{ href: "/vehicles/inventory", label: "Open Inventory Control Tower" }} cards={[
    { title: "Inventory Control Tower", description: "See lifecycle lanes, blockers, aging, and next actions at a glance.", href: "/vehicles/inventory" },
    { title: "Acquisition & intake", description: "Coordinate appraisal, purchase authority, transport, receipt, and intake readiness.", href: "/vehicles" },
    { title: "Title & merchandising", description: "Keep document readiness and frontline presentation moving together.", href: "/vehicles/registry" },
    { title: "Exposure & velocity", description: "Review aging, capital exposure, and inventory actions that need a decision.", href: "/reports" },
    { title: "Recon coordination", description: "Jump into shop execution, quality control, and release readiness.", href: "/vehicles/shop-dispatch" },
    { title: "Parts coordination", description: "Resolve shortages and reservations that are holding inventory.", href: "/vehicles/parts-counter" }
  ]} />;
}
