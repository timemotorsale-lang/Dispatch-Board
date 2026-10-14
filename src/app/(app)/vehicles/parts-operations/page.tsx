import Link from "next/link";

import { PartsOperationsWorkspace } from "@/features/inventory/parts-operations-workspace";
import { PartsStaffHome } from "@/features/parts/parts-staff-home";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getPermittedWorkspaces, getWorkspaceKey } from "@/server/auth/navigation";
import { getPartsOperationsWorkspace } from "@/server/parts-operations/service";

type SearchParams = Promise<{
  repairOrderId?: string;
  returnLabel?: string;
  returnTo?: string;
  view?: string;
}>;

export default async function PartsOperationsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireCurrentUser();
  const { repairOrderId, returnLabel, returnTo, view } = await searchParams;
  const workspaceKey = getWorkspaceKey(user);
  const showWorkspaceReturn = getPermittedWorkspaces(user).some(
    (workspace) => workspace.key === "VEHICLE_OPERATIONS_LEAD",
  );
  const showAdvisorReturn = workspaceKey === "ADVISOR";
  const showPartsReturn = workspaceKey === "PARTS";

  let initial: Awaited<ReturnType<typeof getPartsOperationsWorkspace>> | null = null;
  let loadError: string | null = null;

  try {
    initial = await getPartsOperationsWorkspace(user);
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Parts purchasing could not be opened right now.";
  }

  if (!initial) {
    return (
      <section className="technician-workbench-unavailable">
        <span>Parts operations unavailable</span>
        <h1>Continue this repair from the shared workbench</h1>
        <p>{loadError ?? "Parts purchasing could not be opened right now."}</p>
        <div>
          <Link
            className="pill pill-primary"
            href={
              repairOrderId
                ? `/vehicles/repair-workbench?repairOrderId=${encodeURIComponent(repairOrderId)}`
                : "/vehicles/repair-workbench?view=all"
            }
          >
            Open Repair Workbench
          </Link>
          <Link className="pill pill-secondary" href="/vehicles/shop-dispatch">
            Open Repair Assignment
          </Link>
        </div>
      </section>
    );
  }

  if (workspaceKey === "PARTS" && !view && !repairOrderId) {
    return <PartsStaffHome model={JSON.parse(JSON.stringify(initial))} />;
  }

  return (
    <PartsOperationsWorkspace
      initial={JSON.parse(JSON.stringify(initial))}
      initialRepairOrderId={repairOrderId}
      initialView={view}
      returnLabel={returnLabel?.slice(0, 120)}
      returnTo={returnTo?.startsWith("/") && !returnTo.startsWith("//") ? returnTo : undefined}
      showAdvisorReturn={showAdvisorReturn}
      showPartsReturn={showPartsReturn}
      showWorkspaceReturn={showWorkspaceReturn}
    />
  );
}
