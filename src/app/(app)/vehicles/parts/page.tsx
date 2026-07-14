import { PartsLedgerReadinessWorkspace } from "@/features/inventory/parts-ledger-readiness-workspace";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getPartsWorkspace } from "@/server/parts-ledger/service";
export default async function PartsLedgerPage(){const user=await requireCurrentUser(),initial=await getPartsWorkspace(user);return <PartsLedgerReadinessWorkspace initial={JSON.parse(JSON.stringify(initial))}/>;}
