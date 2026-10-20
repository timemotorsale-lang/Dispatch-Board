import type { Prisma } from "@prisma/client";
import { catalogJobRequirements } from "@/lib/catalog-job-readiness";
import { missingCatalogResourceCapabilities } from "@/lib/catalog-resource-readiness";

type Database = Pick<Prisma.TransactionClient, "workProcedureVersion" | "schedulableResource">;
type Job = { authorizedLineKey: string; procedureVersionId: string | null; bayRequirements: unknown; toolRequirements: unknown };
type Assignment = { locationId: string; resourceIds: unknown; bayResourceId: string | null };

export async function assertCatalogExecutionResources(database: Database, organizationId: string, job: Job, assignment: Assignment, at = new Date()) {
  const requirements = catalogJobRequirements(job.authorizedLineKey, { bayRequirements: job.bayRequirements as string[], toolRequirements: job.toolRequirements as string[] });
  if (!requirements.systemId) return;
  if (!job.procedureVersionId) throw new Error("Catalog execution requires a current assigned procedure. Review and redispatch this job.");
  const procedure = await database.workProcedureVersion.findFirst({ where: { id: job.procedureVersionId, organizationId, workTypeCode: requirements.workTypeCode!, status: "ACTIVE", effectiveFrom: { lte: at }, OR: [{ effectiveTo: null }, { effectiveTo: { gt: at } }] }, select: { id: true } });
  if (!procedure) throw new Error("Catalog procedure is no longer current. Review and redispatch this job.");
  const assigned = Array.isArray(assignment.resourceIds) ? assignment.resourceIds.filter((value): value is string => typeof value === "string") : [];
  const ids = [...new Set([...assigned, ...(assignment.bayResourceId ? [assignment.bayResourceId] : [])])];
  const resources = await database.schedulableResource.findMany({ where: { id: { in: ids }, organizationId, locationId: assignment.locationId, status: "ACTIVE", effectiveFrom: { lte: at }, OR: [{ effectiveTo: null }, { effectiveTo: { gt: at } }] }, include: { resourceType: { select: { kind: true } } } });
  if (resources.length !== ids.length || missingCatalogResourceCapabilities([...requirements.bayRequirements, ...requirements.toolRequirements], resources).length || (requirements.bayRequirements.length > 0 && !resources.some(resource => resource.id === assignment.bayResourceId && resource.resourceType.kind === "SERVICE_BAY" && !missingCatalogResourceCapabilities(requirements.bayRequirements, [resource]).length))) throw new Error("Current assigned bay and tool capabilities do not satisfy catalog execution requirements. Review and redispatch this job.");
}
