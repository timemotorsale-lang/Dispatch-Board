import Link from "next/link";

import { ServiceClosePartsWorkspace } from "@/features/inventory/service-close-parts-workspace";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getServiceClosePartsWorkspace } from "@/server/service-close-parts/service";

export default async function ServiceClosePartsPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireCurrentUser();
  const params = await searchParams;
  const value = (key: string) => {
    const input = params?.[key];
    return Array.isArray(input) ? input[0] : input;
  };
  let initial: Awaited<ReturnType<typeof getServiceClosePartsWorkspace>> | null = null;
  let loadError: string | null = null;
  try {
    initial = await getServiceClosePartsWorkspace(user);
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Parts purchases could not be opened right now.";
  }
  if (!initial) {
    const repairOrderId = value("repairOrderId");
    return <section className="technician-workbench-unavailable">
      <span>Parts purchases unavailable</span>
      <h1>Open this repair from the shared workbench</h1>
      <p>{loadError ?? "Parts purchases could not be opened right now."}</p>
      <div>
        <Link className="pill pill-primary" href={repairOrderId ? `/vehicles/repair-workbench?repairOrderId=${encodeURIComponent(repairOrderId)}` : "/vehicles/repair-workbench?view=all"}>Open Repair Workbench</Link>
        <Link className="pill pill-secondary" href="/vehicles/shop-dispatch">Open Repair Assignment</Link>
      </div>
    </section>;
  }
  return <><nav><Link href={`/vehicles/service-billing?repairOrderId=${encodeURIComponent(value("repairOrderId") ?? "")}`}>Native billing</Link>{" · "}<Link href={`/service-documents?repairOrderId=${encodeURIComponent(value("repairOrderId") ?? "")}`}>Documents and receipts</Link>{" · "}<Link href="/diagnostics/labor-reports">Labor reports</Link></nav><ServiceClosePartsWorkspace initial={JSON.parse(JSON.stringify(initial))} initialRepairOrderId={value("repairOrderId")} returnLabel={value("returnLabel")} returnTo={value("returnTo")} /></>;
}
