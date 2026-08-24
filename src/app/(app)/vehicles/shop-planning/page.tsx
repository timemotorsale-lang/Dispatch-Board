import Link from "next/link";

import { ShopPlanningWorkspace } from "@/features/inventory/shop-planning-workspace";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getShopPlanningWorkspace } from "@/server/shop-planning/service";

export default async function ShopPlanningPage({
  searchParams,
}: {
  searchParams?: Promise<{ repairOrderId?: string; returnTo?: string }>;
}) {
  const user = await requireCurrentUser();
  const params = searchParams ? await searchParams : {};

  let initial: Awaited<ReturnType<typeof getShopPlanningWorkspace>> | null = null;
  let loadError: string | null = null;

  try {
    initial = await getShopPlanningWorkspace(user);
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Repair planning could not be opened right now.";
  }

  if (!initial) {
    return (
      <section className="technician-workbench-unavailable">
        <span>Repair planning unavailable</span>
        <h1>Continue this repair from the shared workbench</h1>
        <p>{loadError ?? "Repair planning could not be opened right now."}</p>
        <div>
          <Link
            className="pill pill-primary"
            href={
              params.repairOrderId
                ? `/vehicles/repair-workbench?repairOrderId=${encodeURIComponent(params.repairOrderId)}`
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

  if (params.repairOrderId) {
    initial.repairOrders.sort((left, right) =>
      left.id === params.repairOrderId ? -1 : right.id === params.repairOrderId ? 1 : 0,
    );
  }

  return (
    <ShopPlanningWorkspace
      initial={JSON.parse(JSON.stringify(initial))}
      returnTo={params.returnTo}
    />
  );
}
