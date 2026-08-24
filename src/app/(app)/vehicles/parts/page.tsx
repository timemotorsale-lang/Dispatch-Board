import Link from "next/link";

import { PartsLedgerReadinessWorkspace } from "@/features/inventory/parts-ledger-readiness-workspace";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getPartsWorkspace } from "@/server/parts-ledger/service";

export default async function PartsLedgerPage() {
  const user = await requireCurrentUser();

  let initial: Awaited<ReturnType<typeof getPartsWorkspace>> | null = null;
  let loadError: string | null = null;

  try {
    initial = await getPartsWorkspace(user);
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
          <Link className="pill pill-primary" href="/vehicles/repair-workbench?view=all">
            Open Repair Workbench
          </Link>
          <Link className="pill pill-secondary" href="/vehicles/parts-operations">
            Open Parts Operations
          </Link>
        </div>
      </section>
    );
  }

  return <PartsLedgerReadinessWorkspace initial={JSON.parse(JSON.stringify(initial))} />;
}
