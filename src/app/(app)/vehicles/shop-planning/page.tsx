import { ShopPlanningWorkspace } from "@/features/inventory/shop-planning-workspace";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getShopPlanningWorkspace } from "@/server/shop-planning/service";
export default async function ShopPlanningPage(){const user=await requireCurrentUser(),initial=await getShopPlanningWorkspace(user);return <ShopPlanningWorkspace initial={JSON.parse(JSON.stringify(initial))}/>;}
