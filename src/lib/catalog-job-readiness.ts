import { LIGHT_DUTY_OPERATIONS, lightDutyOperationForId } from "./light-duty-baseline";
import { lightDutyScopeProfile, type CatalogRequirements } from "./light-duty-scope-profiles";

export const catalogLaborLineKey = (id: string) => `labor-${id.replace(/[^a-z0-9-]/gi, "-").toLowerCase()}`;
const byLineKey = new Map(LIGHT_DUTY_OPERATIONS.flatMap(operation => [operation.id, ...operation.aliases].map(id => [catalogLaborLineKey(id), operation] as const)));

export function expandedOperationForLineKey(key: string) {
  if (typeof key !== "string") return null;
  const exact = byLineKey.get(key);
  if (exact) return exact;
  const scoped = key.match(/^(.*)-front-(left|right)$/);
  const operation = scoped ? byLineKey.get(scoped[1]) : null;
  return operation?.groupId === "tires-hubs" && operation.zone === "unspecified" && !/rear/i.test(operation.label) ? operation : null;
}

export function catalogJobRequirements(key: string, supplied?: Partial<CatalogRequirements>) {
  const operation = expandedOperationForLineKey(key);
  const profile = operation ? lightDutyScopeProfile(operation.systemId, operation.groupId, operation.label, operation.diagnosis).requirements : null;
  const merge = (field: keyof CatalogRequirements) => [...new Set([...(supplied?.[field] ?? []), ...(profile?.[field] ?? [])])];
  return {
    requiredSkills: merge("requiredSkills"), requiredCertifications: merge("requiredCertifications"),
    bayRequirements: merge("bayRequirements"), toolRequirements: merge("toolRequirements"),
    partsRequired: Boolean(operation?.parts.length),
    workTypeCode: operation ? `CATALOG_${operation.groupId.replaceAll("-", "_").toUpperCase()}` : null,
    systemId: operation?.systemId ?? null
  };
}

type PartLine = { key: string; type: string; description: string; laborLineKey?: string };
type Demand = { id: string; repairJobId?: string | null; repairJobReference?: string | null; status?: string };

export function allocateApprovedJobParts(lines: PartLine[], authorizedKeys: string[], demands: Demand[], existingLaborKeys: string[] = []) {
  const labor = lines.filter(line => line.type === "LABOR" && authorizedKeys.includes(line.key));
  const parts = lines.filter(line => line.type === "PART" && authorizedKeys.includes(line.key));
  const allocations = new Map(labor.map(line => [line.key, { partDemandIds: [] as string[], partsRequired: catalogJobRequirements(line.key).partsRequired || parts.some(part => part.laborLineKey === line.key) }]));
  for (const demand of demands.filter(item => !item.repairJobId && !["CANCELLED", "RELEASED"].includes(item.status ?? ""))) {
    const matches = labor.filter(line => demand.repairJobReference === line.key || demand.repairJobReference === line.description);
    const target = matches.length === 1 ? matches[0] : !demand.repairJobReference && labor.length === 1 ? labor[0] : null;
    if (!target) throw new Error("Map each active part demand to one approved labor line before creating multiple jobs. Use the line key in the Parts workspace or create reviewed jobs individually.");
    if (existingLaborKeys.includes(target.key)) throw new Error("A part demand targets an existing job. Link it to that job before creating additional work.");
    const allocation = allocations.get(target.key)!;
    allocation.partDemandIds.push(demand.id);
    allocation.partsRequired = true;
  }
  for (const part of parts) {
    const target = part.laborLineKey ? allocations.get(part.laborLineKey) : labor.length === 1 ? allocations.get(labor[0].key) : null;
    if (!target) throw new Error("Link every approved part line to its approved labor line before creating multiple jobs.");
    target.partsRequired = true;
  }
  return allocations;
}

export function catalogOperationScope(id: string) {
  const operation = lightDutyOperationForId(id);
  return operation ? lightDutyScopeProfile(operation.systemId, operation.groupId, operation.label, operation.diagnosis) : null;
}
