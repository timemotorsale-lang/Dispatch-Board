import Link from "next/link";

import { LifecycleQualityControlPreview } from "@/features/inventory/lifecycle-quality-control-preview";
import { QualityControlWorkspace } from "@/features/inventory/quality-control-workspace";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getQualityControlWorkspace } from "@/server/quality-control/service";

type PageSearchParams = Promise<{
  repairOrderId?: string;
  returnLabel?: string;
  returnTo?: string;
}>;

export default async function QualityControlPage({ searchParams }: { searchParams?: PageSearchParams }) {
  const user = await requireCurrentUser();
  const params = searchParams ? await searchParams : {};
  const returnTo =
    params.returnTo?.startsWith("/") && !params.returnTo.startsWith("//")
      ? params.returnTo
      : undefined;
  const returnLabel = params.returnLabel?.slice(0, 120);

  let initial: Awaited<ReturnType<typeof getQualityControlWorkspace>> | null = null;
  let loadError: string | null = null;

  try {
    initial = await getQualityControlWorkspace(user);
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Final QC could not be opened right now.";
  }

  if (!initial) {
    return (
      <section className="technician-workbench-unavailable">
        <span>Final QC unavailable</span>
        <h1>Continue this repair from the shared workbench</h1>
        <p>{loadError ?? "Final QC could not be opened right now."}</p>
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

  const serialized = JSON.parse(JSON.stringify(initial));

  if (returnTo?.startsWith("/vehicles/inventory")) {
    return (
      <LifecycleQualityControlPreview
        initial={serialized}
        initialRepairOrderId={params.repairOrderId}
        returnTo={returnTo}
      />
    );
  }

  return (
    <QualityControlWorkspace
      initial={serialized}
      initialRepairOrderId={params.repairOrderId}
      returnLabel={returnLabel}
      returnTo={returnTo}
    />
  );
}
