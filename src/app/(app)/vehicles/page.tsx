import { InventoryControlTower } from "@/features/inventory/inventory-control-tower";
import { WorkspaceMockupReference } from "@/components/ui/workspace-mockup-reference";

export default function VehiclesPage() {
  return <div className="workspace-page-with-reference"><WorkspaceMockupReference image="/mockups/inventory-lifecycle-control-tower.png" role="Inventory manager and general manager" title="Inventory Lifecycle Control Tower" /><InventoryControlTower /></div>;
}
