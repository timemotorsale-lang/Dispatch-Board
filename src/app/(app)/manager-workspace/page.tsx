import { ManagerWorkspace } from "@/features/manager/manager-workspace";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getDefaultLandingRoute, getPermittedWorkspaces } from "@/server/auth/navigation";
import { getManagerWorkspace, type ManagerMode } from "@/server/manager-workspace/service";
import { redirect } from "next/navigation";

function mode(value: string | string[] | undefined): ManagerMode {
  const normalized = String(Array.isArray(value) ? value[0] : value ?? "CEO").toUpperCase();
  return normalized === "COO" || normalized === "WORK" ? normalized : "CEO";
}

export default async function ManagerWorkspacePage({ searchParams }: { searchParams?: Promise<{ mode?: string | string[] }> }) {
  const [user, query] = await Promise.all([requireCurrentUser(), searchParams ?? Promise.resolve<{ mode?: string | string[] }>({})]);
  if (!getPermittedWorkspaces(user).some((workspace) => workspace.key === "MANAGEMENT")) redirect(getDefaultLandingRoute(user));
  const model = await getManagerWorkspace(user);
  const requestedMode = mode(query.mode);
  const initialMode = requestedMode === "CEO" && !model.user.canUseCeo ? model.user.canUseCoo ? "COO" : "WORK" : requestedMode;
  return <ManagerWorkspace initialMode={initialMode} model={JSON.parse(JSON.stringify(model))} />;
}
