import { RepairOrderCoreWorkspace } from "@/features/inventory/repair-order-core-workspace";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getRepairOrderCreateOptions, listRepairOrders } from "@/server/repair-order/service";
export default async function RepairOrderCorePage(){const user=await requireCurrentUser();const[initial,options]=await Promise.all([listRepairOrders(user,{page:1,pageSize:25,query:""}),getRepairOrderCreateOptions(user)]);return <RepairOrderCoreWorkspace initial={JSON.parse(JSON.stringify(initial))} options={JSON.parse(JSON.stringify(options))}/>;}
