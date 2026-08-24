import Link from "next/link";

import { PartsReceivingWorkspace } from "@/features/parts/parts-receiving-workspace";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getPartsOperationsWorkspace } from "@/server/parts-operations/service";

export default async function PartsReceivingPage() {
  const user = await requireCurrentUser();

  let initial: Awaited<ReturnType<typeof getPartsOperationsWorkspace>> | null = null;
  let loadError: string | null = null;

  try {
    initial = await getPartsOperationsWorkspace(user);
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Parts receiving could not be opened right now.";
  }

  if (!initial) {
    return (
      <section className="technician-workbench-unavailable">
        <span>Parts receiving unavailable</span>
        <h1>Continue this repair from the shared workbench</h1>
        <p>{loadError ?? "Parts receiving could not be opened right now."}</p>
        <div>
          <Link className="pill pill-primary" href="/vehicles/parts-operations">
            Open Parts Operations
          </Link>
          <Link className="pill pill-secondary" href="/vehicles/repair-workbench?view=all">
            Open Repair Workbench
          </Link>
        </div>
      </section>
    );
  }

  return <PartsReceivingWorkspace initial={JSON.parse(JSON.stringify(initial))} />;
}
