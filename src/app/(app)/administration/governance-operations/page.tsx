import { GovernanceOperationsWorkspace } from "@/features/inventory/governance-operations-workspace";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getGovernanceOperations } from "@/server/governance-operations";
export default async function GovernanceOperationsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) { const user = await requireCurrentUser(), [{ view }, initial] = await Promise.all([searchParams, getGovernanceOperations(user)]); return <GovernanceOperationsWorkspace initial={JSON.parse(JSON.stringify(initial))} initialView={view}/>; }
