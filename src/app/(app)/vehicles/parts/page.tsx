import Link from "next/link";
import { redirect } from "next/navigation";

import { PartsLedgerReadinessWorkspace } from "@/features/inventory/parts-ledger-readiness-workspace";
import { requireCurrentUser } from "@/server/auth/current-user";
import { safeLaborGuideReturnTo } from "@/lib/repair-explorer-context";
import { getPartsWorkspace } from "@/server/parts-ledger/service";

export default async function PartsLedgerPage({ searchParams }: {
  searchParams?: Promise<{ repairOrderId?: string; returnTo?: string }>;
}) {
  const user = await requireCurrentUser();
  const { repairOrderId, returnTo } = await searchParams ?? {};
  const returnHref = safeLaborGuideReturnTo(returnTo);

  // Old Repair Workbench quote links used the stock ledger route. Keep all
  // other ledger links (including repair-stage stock/readiness links) intact.
  if (repairOrderId && returnHref) {
    const source = new URL(returnHref, "https://workspace.invalid");
    if (source.pathname === "/vehicles/repair-workbench" && source.searchParams.get("tool") === "partsOperations" &&
        source.searchParams.get("repairOrderId") === repairOrderId) {
      redirect(`/vehicles/parts/workbook?${new URLSearchParams({ repairOrderId, returnTo: returnHref })}`);
    }
  }

  let initial: Awaited<ReturnType<typeof getPartsWorkspace>> | null = null;
  let loadError: string | null = null;

  try {
    initial = await getPartsWorkspace(user, "", { repairOrderId });
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Parts readiness could not be opened right now.";
  }

  if (!initial) {
    return (
      <section className="technician-workbench-unavailable">
        <span>Parts readiness unavailable</span>
        <h1>Continue this repair from the shared workbench</h1>
        <p>{loadError ?? "Parts readiness could not be opened right now."}</p>
        <div>
          <Link className="pill pill-primary" href={returnHref ?? "/vehicles/repair-workbench?view=all"}>
            Open Repair Workbench
          </Link>
          <Link className="pill pill-secondary" href="/vehicles/parts-operations">
            Open Parts Operations
          </Link>
        </div>
      </section>
    );
  }

  if (repairOrderId && !initial.repairOrders.length) {
    return <section className="page-copy"><h1>Repair order unavailable in Parts</h1><p>Check that this order is open and available to your role and location.</p><Link href={returnHref ?? "/vehicles/repair-workbench?view=all"}>Return to Repair Workbench</Link></section>;
  }
  return <PartsLedgerReadinessWorkspace key={repairOrderId} initial={JSON.parse(JSON.stringify(initial))} repairOrderId={repairOrderId} returnTo={returnHref} />;
}
