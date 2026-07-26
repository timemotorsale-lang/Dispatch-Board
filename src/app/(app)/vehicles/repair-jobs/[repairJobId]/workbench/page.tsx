import Link from "next/link";

import { TechnicianRepairWorkbench } from "@/features/technician/technician-repair-workbench";
import { requireCurrentUser } from "@/server/auth/current-user";
import { getTechnicianRepairWorkbench } from "@/server/technician-workspace/service";

export default async function TechnicianRepairWorkbenchPage({
  params
}: {
  params: Promise<{ repairJobId: string }>;
}) {
  const user = await requireCurrentUser();
  const { repairJobId } = await params;
  let model: Awaited<ReturnType<typeof getTechnicianRepairWorkbench>> | null = null;
  let loadError: unknown = null;

  try {
    model = await getTechnicianRepairWorkbench(user, repairJobId);
  } catch (error) {
    loadError = error;
  }

  if (!model) {
    const message = loadError instanceof Error ? loadError.message : "The repair workbench is unavailable.";
    return (
      <section className="technician-workbench-unavailable">
        <span>Repair Workbench unavailable</span>
        <h1>This repair could not be opened</h1>
        <p>{message.includes("not found") ? "The repair does not exist or is not assigned to you." : "The repair data could not be loaded. Your saved work has not been changed."}</p>
        <div>
          <Link className="pill pill-primary" href="/my-tasks">Return to My Work</Link>
          <Link className="pill pill-secondary" href="/my-tasks/available">Available Work</Link>
        </div>
      </section>
    );
  }

  return <TechnicianRepairWorkbench model={JSON.parse(JSON.stringify(model))} />;
}
