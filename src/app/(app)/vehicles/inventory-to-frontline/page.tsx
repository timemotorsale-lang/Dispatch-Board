import { InventoryFrontlineWorkspace } from "@/features/inventory/inventory-frontline-workspace";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getFrontlineOptions, listFrontlineWorkflows } from "@/server/inventory-frontline/service";
export default async function InventoryToFrontlinePage() { const user = await requireCurrentUser(); const [initial, options] = await Promise.all([listFrontlineWorkflows(user), getFrontlineOptions(user)]); return <InventoryFrontlineWorkspace initial={JSON.parse(JSON.stringify(initial))} options={JSON.parse(JSON.stringify(options))} />; }
