import { GovernanceAdministrationWorkspace } from "@/features/inventory/governance-administration-workspace";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getInventoryGovernanceConsole } from "@/server/inventory-governance/service";

export default async function AdministrationWorkspacePage({ searchParams }: { searchParams?: Promise<{ view?: string | string[] }> }) {
  const user = await requireCurrentUser(), params = searchParams ? await searchParams : undefined, view = Array.isArray(params?.view) ? params.view[0] : params?.view;
  return <GovernanceAdministrationWorkspace model={await getInventoryGovernanceConsole(user)} view={view} />;
}
