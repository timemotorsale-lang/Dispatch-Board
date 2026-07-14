import { ShopExecutionWorkspace } from "@/features/inventory/shop-execution-workspace";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getShopExecutionWorkspace } from "@/server/shop-execution/service";
export default async function ShopDispatchPage(){const user=await requireCurrentUser(),initial=await getShopExecutionWorkspace(user);return <ShopExecutionWorkspace initial={JSON.parse(JSON.stringify(initial))}/>;}
