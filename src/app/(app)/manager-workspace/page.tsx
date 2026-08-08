import { ManagerWorkspace } from "@/features/manager/manager-workspace";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getManagerWorkspace, type ManagerMode } from "@/server/manager-workspace/service";

function mode(value: string | string[] | undefined): ManagerMode {
  const normalized = String(Array.isArray(value) ? value[0] : value ?? "CEO").toUpperCase();
  return normalized === "COO" || normalized === "WORK" ? normalized : "CEO";
}

export default async function ManagerWorkspacePage({ searchParams }: { searchParams?: Promise<{ mode?: string | string[] }> }) {
  const [user, query] = await Promise.all([requireCurrentUser(), searchParams ?? Promise.resolve<{ mode?: string | string[] }>({})]);
  const model = await getManagerWorkspace(user);
  return <ManagerWorkspace initialMode={mode(query.mode)} model={JSON.parse(JSON.stringify(model))} />;
}
