import { QualityControlWorkspace } from "@/features/inventory/quality-control-workspace";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getQualityControlWorkspace } from "@/server/quality-control/service";
export default async function QualityControlPage({searchParams}:{searchParams?:Promise<{repairOrderId?:string;returnTo?:string}>}){const user=await requireCurrentUser(),initial=await getQualityControlWorkspace(user),params=searchParams?await searchParams:{},returnTo=params.returnTo?.startsWith("/")&&!params.returnTo.startsWith("//")?params.returnTo:undefined;return <QualityControlWorkspace initial={JSON.parse(JSON.stringify(initial))} initialRepairOrderId={params.repairOrderId} returnTo={returnTo}/>;}
