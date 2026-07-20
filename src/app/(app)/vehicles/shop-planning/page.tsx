import { ShopPlanningWorkspace } from "@/features/inventory/shop-planning-workspace";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getShopPlanningWorkspace } from "@/server/shop-planning/service";
export default async function ShopPlanningPage({searchParams}:{searchParams?:Promise<{repairOrderId?:string}>}){const user=await requireCurrentUser(),initial=await getShopPlanningWorkspace(user),params=searchParams?await searchParams:{};if(params.repairOrderId){initial.repairOrders.sort((left,right)=>left.id===params.repairOrderId?-1:right.id===params.repairOrderId?1:0)}return <ShopPlanningWorkspace initial={JSON.parse(JSON.stringify(initial))}/>;}
