import Link from "next/link";
import { redirect } from "next/navigation";
import { repairReviewHref } from "@/lib/repair-workflow-review";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { prisma } from "@/server/db/client";
import { createEnterpriseCommandRepository } from "@/server/enterprise-command/repository";
import { assertRepairLocationRead } from "@/server/repair-order/read-access";

import { TechnicianRepairWorkbench } from "@/features/technician/technician-repair-workbench";
import { requireCurrentUser } from "@/server/auth/current-user";
import { isTechnicianOnlyUser } from "@/server/auth/navigation";
import { getTechnicianRepairWorkbench } from "@/server/technician-workspace/service";

export default async function TechnicianRepairWorkbenchPage({
  params
}: {
  params: Promise<{ repairJobId: string }>;
}) {
  const user = await requireCurrentUser();
  const { repairJobId } = await params;
  let model: Awaited<ReturnType<typeof getTechnicianRepairWorkbench>> | null = null;

  try {
    model = await getTechnicianRepairWorkbench(user, repairJobId);
  } catch {}

  if (!model) {
    const technicianOnly = isTechnicianOnlyUser(user);
    if (!technicianOnly) {
      const organizationId = INITIAL_ORGANIZATION.id;
      const job = await prisma.repairJob.findFirst({
        where: { id: repairJobId, organizationId, repairOrder: { organizationId } },
        select: { repairOrderId: true, repairOrder: { select: { locationId: true } } }
      });
      if (job) {
        const canRead = await assertRepairLocationRead(
          user, organizationId, job.repairOrder.locationId, createEnterpriseCommandRepository()
        ).then(() => true, () => false);
        if (canRead) redirect(repairReviewHref(job.repairOrderId));
      }
    }

    return (
      <section className="technician-workbench-unavailable">
        <span>Repair Workbench unavailable</span>
        <h1>{technicianOnly ? "This repair is not assigned to you" : "Open this repair from the shared workspace"}</h1>
        <p>{technicianOnly
          ? "Only repairs assigned to you can open in the technician workbench."
          : "This technician-only link requires an assignment. Your repair is still available in Manage Repair and Final QC."}</p>
        <div>
          <Link className="pill pill-primary" href={technicianOnly ? "/my-tasks" : "/vehicles/repair-workbench?view=all"}>{technicianOnly ? "Return to My Work" : "Open Repair Orders"}</Link>
          <Link className="pill pill-secondary" href={technicianOnly ? "/my-tasks/available" : "/vehicles/quality-control"}>{technicianOnly ? "Available Work" : "Open Final QC"}</Link>
        </div>
      </section>
    );
  }

  return <TechnicianRepairWorkbench model={JSON.parse(JSON.stringify(model))} />;
}
