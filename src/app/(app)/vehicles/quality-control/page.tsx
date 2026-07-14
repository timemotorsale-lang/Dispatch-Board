import { QualityControlWorkspace } from "@/features/inventory/quality-control-workspace";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getQualityControlWorkspace } from "@/server/quality-control/service";
export default async function QualityControlPage(){const user=await requireCurrentUser(),initial=await getQualityControlWorkspace(user);return <QualityControlWorkspace initial={JSON.parse(JSON.stringify(initial))}/>;}
