import { ShopExecutionWorkspace } from "@/features/inventory/shop-execution-workspace";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getShopExecutionWorkspace } from "@/server/shop-execution/service";
export default async function ShopDispatchPage({searchParams}:{searchParams?:Promise<{repairOrderId?:string}>}){
  const user=await requireCurrentUser();
  const params=searchParams?await searchParams:{};
  const initial=await getShopExecutionWorkspace(user);
  return <ShopExecutionWorkspace initial={JSON.parse(JSON.stringify(initial))} initialRepairOrderId={params.repairOrderId}/>;
}
