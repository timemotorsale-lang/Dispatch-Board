import type { LaborClockState } from "@prisma/client";
import { repairReviewHref } from "@/lib/repair-workflow-review";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { getCurrentUser } from "@/server/auth/current-user";
import { resolveWorkRecordRoute } from "@/server/auth/navigation";
import { prisma } from "@/server/db/client";
import { evaluateVehicleCapability } from "@/server/enterprise-command/vehicle-capabilities";
import { evaluateTimeAttendanceCapability, getTimeAttendanceCapabilityGrants } from "./capabilities";

type PersonalJob = {
  id: string;
  href: string;
  repairOrderNumber: string;
  jobNumber: string;
  description: string;
  recordedMinutes: number;
  clockState: LaborClockState;
  lastEventAt: string | null;
};

export type PersonalJobLabor =
  | { status: "available"; jobs: PersonalJob[]; hasMore: boolean }
  | { status: "unavailable" }
  | null;

const recentJobLimit = 10;

export async function getPersonalJobLabor(): Promise<PersonalJobLabor> {
  try {
    const actor = await getCurrentUser();
    if (!actor?.isActive) return null;

    const organizationId = INITIAL_ORGANIZATION.id;
    const now = new Date();
    const grants = await getTimeAttendanceCapabilityGrants({ actor, organizationId });
    const selfService = { actor, grants, now, capability: "TIME_SELF_SERVICE" } as const;
    if (!evaluateTimeAttendanceCapability(selfService).allowed) return null;

    const locations = await prisma.location.findMany({ where: { organizationId }, select: { id: true } });
    const locationIds = locations.map(location => location.id).filter(locationId =>
      evaluateTimeAttendanceCapability({ ...selfService, locationId }).allowed &&
      evaluateVehicleCapability({ actor, grants, now, locationId, capability: "REPAIR_ORDER_VIEW" }).allowed
    );
    if (!locationIds.length) return null;

    const personalScope = { organizationId, technicianUserId: actor.id };
    const clocks = await prisma.repairJobLaborClock.findMany({
      where: {
        ...personalScope,
        repairJob: { organizationId, repairOrder: { organizationId, locationId: { in: locationIds } } },
      },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: recentJobLimit + 1,
      select: {
        state: true,
        accumulatedMinutes: true,
        repairJob: {
          select: {
            id: true,
            jobNumber: true,
            description: true,
            status: true,
            repairOrder: { select: { id: true, repairOrderNumber: true } },
            dispatches: { where: personalScope, select: { id: true }, take: 1 },
            laborEvents: {
              where: personalScope,
              orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
              select: { occurredAt: true },
              take: 1,
            },
          },
        },
      },
    });

    return {
      status: "available",
      hasMore: clocks.length > recentJobLimit,
      jobs: clocks.slice(0, recentJobLimit).map(({ repairJob: job, state, accumulatedMinutes }) => ({
        id: job.id,
        href: job.status !== "CANCELLED" && job.dispatches.length
          ? resolveWorkRecordRoute({ repairJobId: job.id })
          : repairReviewHref(job.repairOrder.id),
        repairOrderNumber: job.repairOrder.repairOrderNumber,
        jobNumber: job.jobNumber,
        description: job.description,
        recordedMinutes: accumulatedMinutes,
        clockState: state,
        lastEventAt: job.laborEvents[0]?.occurredAt.toISOString() ?? null,
      })),
    };
  } catch {
    return { status: "unavailable" };
  }
}
