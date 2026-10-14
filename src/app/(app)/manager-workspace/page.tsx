import { ManagerWorkspace } from "@/features/manager/manager-workspace";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getDefaultLandingRoute, getPermittedWorkspaces } from "@/server/auth/navigation";
import { getManagerWorkspace, type ManagerMode, type ManagerWorkspaceModel } from "@/server/manager-workspace/service";
import { redirect } from "next/navigation";

function mode(value: string | string[] | undefined): ManagerMode {
  const normalized = String(Array.isArray(value) ? value[0] : value ?? "CEO").toUpperCase();
  return normalized === "COO" || normalized === "WORK" ? normalized : "CEO";
}

function fallbackManagerWorkspace(user: Awaited<ReturnType<typeof requireCurrentUser>>): ManagerWorkspaceModel {
  return {
    generatedAt: new Date().toISOString(),
    user: {
      id: user.id,
      name: user.name,
      canUseCeo: user.roles.some((role) => role.toLowerCase().includes("general manager")),
      canUseCoo: true
    },
    health: {
      activeInventory: 0,
      activeRepairOrders: 0,
      advisorAttention: 0,
      agedExposureCents: 0,
      approvals: 0,
      blocked: 0,
      exposureCents: 0,
      failedCommands: 1,
      inbox: 0,
      overdue: 0,
      reviews: 0,
      waitingParts: 0
    },
    actions: [],
    inbox: [],
    hats: [
      { id: "ADVISOR", count: 0 },
      { id: "INVENTORY", count: 0 },
      { id: "TECHNICIAN", count: 0 },
      { id: "LOT", count: 0 },
      { id: "PARTS", count: 0 },
      { id: "DETAIL", count: 0 }
    ],
    sources: {
      advisor: false,
      governance: false,
      inventory: false,
      operations: false,
      tasks: false
    }
  };
}

export default async function ManagerWorkspacePage({ searchParams }: { searchParams?: Promise<{ mode?: string | string[] }> }) {
  const [user, query] = await Promise.all([requireCurrentUser(), searchParams ?? Promise.resolve<{ mode?: string | string[] }>({})]);
  if (!getPermittedWorkspaces(user).some((workspace) => workspace.key === "MANAGEMENT")) redirect(getDefaultLandingRoute(user));
  const model = await getManagerWorkspace(user).catch((error) => {
    console.error("Manager workspace failed to load; rendering fallback shell.", error);
    return fallbackManagerWorkspace(user);
  });
  const requestedMode = mode(query.mode);
  const initialMode = requestedMode === "CEO" && !model.user.canUseCeo ? model.user.canUseCoo ? "COO" : "WORK" : requestedMode;
  return <ManagerWorkspace initialMode={initialMode} model={JSON.parse(JSON.stringify(model))} />;
}
