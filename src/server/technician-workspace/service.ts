import type { AuthenticatedUser } from "@/server/auth/store";
import { resolveWorkRecordRoute } from "@/server/auth/navigation";
import { prisma } from "@/server/db/client";
import { isManager } from "@/server/policies/access";
import { getShopExecutionWorkspace } from "@/server/shop-execution/service";

function stringList(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
    : [];
}

function vehicleLabel(vehicle: {
  make: string | null;
  model: string | null;
  vehicleNumber: string;
  year: number | null;
}) {
  return [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ") || vehicle.vehicleNumber;
}

function activeVendorWork(
  vendorWorks: Array<{
    currentLocation: string | null;
    nextAction: string | null;
    status: string;
    vendorName: string;
  }> = []
) {
  return vendorWorks.find((work) => !["COMPLETED", "CANCELLED"].includes(work.status)) ?? vendorWorks[0] ?? null;
}

export type TechnicianRepairAssignment = {
  id: string;
  href: string;
  jobNumber: string;
  description: string;
  vehicle: string;
  customer: string;
  concern: string;
  location: string;
  position: string;
  dispatchStatus: string;
  jobStatus: string;
  priority: string;
  scheduledStartAt: string;
  scheduledEndAt: string;
  bay: string | null;
  clockState: string;
  accumulatedMinutes: number;
};

function projectRepairAssignments(
  actor: AuthenticatedUser,
  workspace: Awaited<ReturnType<typeof getShopExecutionWorkspace>>
): TechnicianRepairAssignment[] {
  return workspace.jobs
    .flatMap((job) => {
      const assignment = job.dispatches.find(
        (dispatch) =>
          dispatch.technicianUserId === actor.id &&
          ["ACTIVE", "STAGED"].includes(dispatch.status)
      );
      if (!assignment) return [];

      const clock = job.laborClocks.find((item) => item.technicianUserId === actor.id);
      return [{
        id: job.id,
        href: resolveWorkRecordRoute({ repairJobId: job.id }),
        jobNumber: job.jobNumber,
        description: job.description,
        vehicle: vehicleLabel(job.repairOrder.vehicle),
        customer: job.repairOrder.customer?.displayName ?? "Internal vehicle",
        concern: job.repairOrder.serviceVisit.concernSummary,
        location: activeVendorWork(job.repairOrder.vendorWorks)?.currentLocation ?? job.repairOrder.location.name,
        position: assignment.position,
        dispatchStatus: assignment.status,
        jobStatus: job.status,
        priority: job.priority,
        scheduledStartAt: assignment.scheduledStartAt.toISOString(),
        scheduledEndAt: assignment.scheduledEndAt.toISOString(),
        bay: assignment.bayResource?.name ?? assignment.bayResource?.code ?? null,
        clockState: clock?.state ?? "NOT_STARTED",
        accumulatedMinutes: clock?.accumulatedMinutes ?? 0
      }];
    })
    .sort((left, right) => {
      const position = Number(left.position !== "CURRENT") - Number(right.position !== "CURRENT");
      return position || new Date(left.scheduledStartAt).getTime() - new Date(right.scheduledStartAt).getTime();
    });
}

export async function getTechnicianMyWork(actor: AuthenticatedUser) {
  const workspace = await getShopExecutionWorkspace(actor);
  const assignments = projectRepairAssignments(actor, workspace);
  const promiseRiskCutoff = Date.now() + 4 * 60 * 60 * 1000;
  const openJobs = workspace.jobs.filter((job) => !["QC_PASSED", "CANCELLED"].includes(job.status));
  const waitingParts = openJobs.filter((job) => job.status === "WAITING_PARTS").length;
  const promiseRisk = openJobs.filter((job) => {
    const promisedAt = job.repairOrder.serviceVisit.promisedAt;
    return promisedAt && promisedAt.getTime() <= promiseRiskCutoff;
  }).length;

  return {
    assignments,
    pulse: {
      currentBay: assignments.find((assignment) => assignment.position === "CURRENT")?.bay ?? null,
      ownQueue: assignments.length,
      activeInShop: openJobs.filter((job) => ["DISPATCHED", "IN_PROGRESS", "PAUSED"].includes(job.status)).length,
      waitingParts,
      readyForQc: openJobs.filter((job) => job.status === "READY_FOR_QC").length,
      promiseRisk,
      state: waitingParts > 0 || promiseRisk > 0 ? "CONSTRAINED" : "READY"
    }
  };
}

export async function getTechnicianRepairAssignments(
  actor: AuthenticatedUser
): Promise<TechnicianRepairAssignment[]> {
  return (await getTechnicianMyWork(actor)).assignments;
}

export async function getTechnicianRepairWorkbench(actor: AuthenticatedUser, repairJobId: string) {
  const workspace = await getShopExecutionWorkspace(actor);
  const job = workspace.jobs.find((item) => item.id === repairJobId);
  if (!job) throw new Error("Repair job was not found.");

  const assignments = job.dispatches.filter((dispatch) => dispatch.technicianUserId === actor.id);
  const currentAssignment = assignments.find((dispatch) => ["ACTIVE", "STAGED"].includes(dispatch.status))
    ?? assignments[0]
    ?? null;

  if (!currentAssignment && !isManager(actor)) {
    throw new Error("Repair job was not found.");
  }

  const clock = job.laborClocks.find((item) => item.technicianUserId === actor.id) ?? null;
  const activeAssignment = Boolean(
    currentAssignment && ["ACTIVE", "STAGED"].includes(currentAssignment.status)
  );

  return {
    actor: {
      id: actor.id,
      name: actor.name,
      canExecute: activeAssignment,
      isManager: isManager(actor)
    },
    assignment: currentAssignment ? {
      id: currentAssignment.id,
      position: currentAssignment.position,
      status: currentAssignment.status,
      scheduledStartAt: currentAssignment.scheduledStartAt.toISOString(),
      scheduledEndAt: currentAssignment.scheduledEndAt.toISOString(),
      bay: currentAssignment.bayResource?.name ?? currentAssignment.bayResource?.code ?? null
    } : null,
    clock: {
      state: clock?.state ?? "NOT_STARTED",
      accumulatedMinutes: clock?.accumulatedMinutes ?? 0,
      startedAt: clock?.startedAt?.toISOString() ?? null,
      finishedAt: clock?.finishedAt?.toISOString() ?? null
    },
    job: {
      id: job.id,
      jobNumber: job.jobNumber,
      status: job.status,
      description: job.description,
      plannedCorrection: job.plannedCorrection,
      priority: job.priority,
      workTypeCode: job.workTypeCode,
      laborGuideMinutes: job.laborGuideMinutes,
      executionBlockerReason: job.executionBlockerReason,
      executionEvidence: stringList(job.executionEvidence),
      qcHandoffNotes: job.qcHandoffNotes,
      requiredSkills: stringList(job.requiredSkills),
      requiredCertifications: stringList(job.requiredCertifications),
      toolRequirements: stringList(job.toolRequirements),
      bayRequirements: stringList(job.bayRequirements),
      readinessReasonCodes: stringList(job.readinessReasonCodes)
    },
    repairOrder: {
      id: job.repairOrder.id,
      number: job.repairOrder.repairOrderNumber,
      href: `/vehicles/repair-workbench?repairOrderId=${encodeURIComponent(job.repairOrder.id)}`,
      customer: job.repairOrder.customer?.displayName ?? "Internal vehicle",
      concern: job.repairOrder.serviceVisit.concernSummary,
      promiseAt: job.repairOrder.serviceVisit.promisedAt?.toISOString() ?? null,
      location: job.repairOrder.location.name,
      currentLocation: activeVendorWork(job.repairOrder.vendorWorks)?.currentLocation ?? job.repairOrder.location.name,
      vendorStatus: activeVendorWork(job.repairOrder.vendorWorks)?.status ?? null,
      vendorName: activeVendorWork(job.repairOrder.vendorWorks)?.vendorName ?? null,
      vendorNextAction: activeVendorWork(job.repairOrder.vendorWorks)?.nextAction ?? null,
      vehicle: {
        id: job.repairOrder.vehicleId,
        label: vehicleLabel(job.repairOrder.vehicle),
        number: job.repairOrder.vehicle.vehicleNumber,
        href: `/vehicles/360/${encodeURIComponent(job.repairOrder.vehicleId)}`
      }
    },
    procedure: job.procedureVersion ? {
      id: job.procedureVersion.id,
      title: job.procedureVersion.title,
      version: job.procedureVersion.version,
      instructions: stringList(job.procedureVersion.instructions),
      safetySteps: stringList(job.procedureVersion.safetySteps),
      requiredEvidence: stringList(job.procedureVersion.requiredEvidence),
      qcRules: stringList(job.procedureVersion.qcRules)
    } : null,
    parts: job.partDemands.map((demand) => ({
      id: demand.id,
      partNumber: demand.part.partNumber,
      description: demand.part.description,
      required: demand.quantityRequired,
      reserved: demand.quantityReserved,
      status: demand.status
    }))
  };
}

export async function getTaskSpecialistRoutes(taskIds: string[]) {
  if (!taskIds.length) return {} as Record<string, string>;
  const packets = await prisma.inventoryWorkPacket.findMany({
    where: { taskId: { in: taskIds } },
    select: {
      taskId: true,
      repairJobId: true,
      repairOrderId: true,
      vehicleId: true,
      inventoryUnitId: true
    }
  });

  return Object.fromEntries(
    packets.map((packet) => [
      packet.taskId,
      resolveWorkRecordRoute({
        taskId: packet.taskId,
        repairJobId: packet.repairJobId,
        repairOrderId: packet.repairOrderId,
        inventoryWorkPacket: packet.repairJobId ? null : {
          vehicleId: packet.vehicleId,
          inventoryUnitId: packet.inventoryUnitId
        }
      })
    ])
  );
}

export type TechnicianRepairWorkbenchModel = Awaited<ReturnType<typeof getTechnicianRepairWorkbench>>;
export type TechnicianShopPulse = Awaited<ReturnType<typeof getTechnicianMyWork>>["pulse"];
