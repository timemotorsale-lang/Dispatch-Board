import { InventoryRetailCompletionWorkspace } from "@/features/inventory/inventory-retail-completion-workspace";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getRetailCompletionOptions, listRetailCompletions } from "@/server/inventory-retail-completion/service";
export default async function RetailCompletionPage() { const user = await requireCurrentUser(); const [initial, options] = await Promise.all([listRetailCompletions(user), getRetailCompletionOptions(user)]); return <InventoryRetailCompletionWorkspace initial={JSON.parse(JSON.stringify(initial))} options={JSON.parse(JSON.stringify(options))} />; }
