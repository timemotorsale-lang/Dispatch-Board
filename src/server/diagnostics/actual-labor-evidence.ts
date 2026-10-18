import type { AuthenticatedUser } from "@/server/auth/store";
import { assertAuthenticatedUser, isManager } from "@/server/policies/access";
import { assertVehicleCapability } from "@/server/enterprise-command/vehicle-capabilities";
import { createEnterpriseCommandRepository } from "@/server/enterprise-command/repository";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { prisma } from "@/server/db/client";
import { actualLaborEvidence } from "@/lib/labor-actual-evidence";
import { laborOperationForLineKey } from "@/lib/labor-catalog-selection";
import { flattenLaborOperationTaxonomy } from "./labor-operation-taxonomy";
import { repairBaselineForId } from "@/lib/repair-catalog-baselines";

function snapshotLine(assumptions: string | null, prefix: string): unknown {
  const line = assumptions?.split("\n").filter(value => value.startsWith(prefix)).at(-1);
  if (!line) return null;
  try { return JSON.parse(line.slice(prefix.length)); } catch { return null; }
}

export async function getActualLaborEvidence(actor: AuthenticatedUser | null) {
  const user = assertAuthenticatedUser(actor);
  if (!isManager(user)) throw new Error("Manager access required for technician labor studies.");
  const organizationId = INITIAL_ORGANIZATION.id;
  const grants = await createEnterpriseCommandRepository().listCapabilityGrants(user.id, organizationId);
  assertVehicleCapability({ actor: user, capability: "REPAIR_ORDER_VIEW", grants, locationId: null, now: new Date() });
  const jobs = await prisma.repairJob.findMany({ where: { organizationId, status: { not: "CANCELLED" } }, take: 200, orderBy: [{ updatedAt: "desc" }, { id: "asc" }], include: {
    estimateVersion: { select: { assumptions: true } }, laborClocks: true,
    laborEvents: { take: 1000, orderBy: { occurredAt: "asc" } }, _count: { select: { laborEvents: true } },
    qualityInspections: { orderBy: { version: "desc" }, select: { disposition: true, inspectedAt: true } }
  } });
  const catalog = flattenLaborOperationTaxonomy();
  return jobs.map(job => {
    const operation = laborOperationForLineKey(job.authorizedLineKey, catalog);
    const provenance = snapshotLine(job.estimateVersion.assumptions, "Labor provenance: ");
    const entry = Array.isArray(provenance) ? provenance.find(value => value && value.operationId === operation?.id && value.source === "INTERNAL_AUTHORED") : null;
    const controls = snapshotLine(job.estimateVersion.assumptions, "Estimate controls v1 (staff reviewed, not independently verified): ") as { brakeReview?: { configuration?: unknown }; steeringReview?: { configuration?: unknown }; systemReviews?: Record<string, { configuration?: unknown }> } | null;
    const baseline = operation ? repairBaselineForId(operation.id) : null;
    const configuration = baseline?.system === "brakes" ? controls?.brakeReview?.configuration : baseline?.system === "steering" ? controls?.steeringReview?.configuration : baseline ? controls?.systemReviews?.[baseline.system]?.configuration : undefined;
    const result = actualLaborEvidence({ id: job.id, operationId: operation?.id ?? null, catalogVersion: typeof entry?.version === "string" ? entry.version : null,
      vehicleConfiguration: typeof configuration === "string" ? configuration : "", plannedMinutes: job.laborGuideMinutes,
      qcPassedAt: job.qualityInspections[0]?.disposition === "PASSED" ? job.qualityInspections[0].inspectedAt.toISOString() : null,
      latestQcPassed: job.qualityInspections[0]?.disposition === "PASSED", rework: job.qualityInspections.some(inspection => inspection.disposition === "FAILED"),
      clocks: job.laborClocks.map(clock => ({ ...clock, finishedAt: clock.finishedAt?.toISOString() ?? null })),
      events: job.laborEvents.map(event => ({ ...event, occurredAt: event.occurredAt.toISOString() }))
    });
    if (job._count.laborEvents > job.laborEvents.length) { result.eligibleForStudy = false; result.reasonCodes.push("EVENT_HISTORY_TRUNCATED"); }
    return { ...result, jobNumber: job.jobNumber, repairOrderId: job.repairOrderId, description: job.description };
  });
}
