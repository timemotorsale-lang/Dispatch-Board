import { EnterpriseWorkspaceLanding } from "@/components/ui/enterprise-workspace-landing";

export default function DispositionWholesalePage() {
  return <EnterpriseWorkspaceLanding eyebrow="Inventory Lifecycle" title="Disposition & Wholesale" activeDuty="Rollout disabled" description="The approved workspace destination is reserved here without presenting illustrative candidates, recommendations, offers, or settlement values as live. Wholesale implementation and activation remain governed by R9." primaryAction={{ href: "/vehicles/inventory", label: "Back to Inventory Lifecycle" }} cards={[
    { title: "Review inventory aging", description: "Use current authoritative InventoryUnit records while the dedicated candidate projection remains unavailable.", href: "/vehicles/inventory?view=aging", label: "Available now" },
    { title: "Review governed decisions", description: "Open permission-scoped review and approval work without implying wholesale activation.", href: "/manager-review?scope=inventory", label: "Available now" },
    { title: "Disposition implementation status", description: "Candidate algorithms, appraisal, channel activation, offers, release, sale, and settlement are not enabled in this rollout.", href: "/vehicles", label: "Planned R9" },
  ]} />;
}
