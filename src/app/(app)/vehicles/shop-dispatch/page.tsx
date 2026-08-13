import { ShopExecutionWorkspace } from "@/features/inventory/shop-execution-workspace";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getShopExecutionWorkspace } from "@/server/shop-execution/service";
import { getVehicleRegistryDetail } from "@/server/vehicle-registry/service";

export default async function ShopDispatchPage({searchParams}:{searchParams?:Promise<{repairOrderId?:string;vehicleId?:string}>}){
  const user=await requireCurrentUser();
  const params=searchParams?await searchParams:{};
  const initial=await getShopExecutionWorkspace(user);
  const sourceVehicle=params.vehicleId?await getVehicleRegistryDetail(user,params.vehicleId).catch(()=>null):null;
  return <ShopExecutionWorkspace initial={JSON.parse(JSON.stringify(initial))} initialRepairOrderId={params.repairOrderId} initialVehicleId={params.vehicleId} sourceVehicle={sourceVehicle?JSON.parse(JSON.stringify(sourceVehicle)):null}/>;
}
