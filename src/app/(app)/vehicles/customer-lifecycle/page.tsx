import { CustomerLifecycleWorkspace } from "@/features/inventory/customer-lifecycle-workspace";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getCustomerLifecycleWorkspace } from "@/server/customer-lifecycle/service";

export default async function CustomerLifecyclePage() { const user = await requireCurrentUser(), initial = await getCustomerLifecycleWorkspace(user); return <CustomerLifecycleWorkspace initial={JSON.parse(JSON.stringify(initial))} />; }
