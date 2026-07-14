import { INTEGRATION_SOURCES, type ConflictStatus, type IntegrationConflict, type IntegrationSystem, detectIntegrationConflicts } from "./domain";

const conflicts: IntegrationConflict[] = [];
export function getIntegrationRegistry() { return { version: "1.0", sources: INTEGRATION_SOURCES, conflictKinds: ["MISSING", "DUPLICATE", "MISMATCHED", "STALE", "REJECTED", "OUT_OF_BALANCE"] as const }; }
export function listIntegrationConflicts(filter: { organizationId: string; system?: IntegrationSystem; status?: ConflictStatus } ) { return conflicts.filter((item) => item.organizationId === filter.organizationId && (!filter.system || item.system === filter.system) && (!filter.status || item.status === filter.status)); }
export function reconcileIntegrationConflicts(input: { organizationId: string; actorUserId: string; conflictIds: string[]; status: "RESOLVED" | "IGNORED"; resolution: string }) {
  if (!input.actorUserId || !input.resolution.trim()) throw new Error("Actor and resolution are required.");
  let changed = 0; for (const item of conflicts) if (input.conflictIds.includes(item.id) && item.organizationId === input.organizationId) { item.status = input.status; item.ownerUserId = input.actorUserId; item.resolution = input.resolution; changed += 1; }
  return { changed, status: input.status };
}
export function ingestIntegrationRecords(input: { organizationId: string; system: IntegrationSystem; records: Parameters<typeof detectIntegrationConflicts>[0] }, now = new Date()) { const found = detectIntegrationConflicts(input.records, { organizationId: input.organizationId, system: input.system, now }); for (const conflict of found) { const existing = conflicts.find((item) => item.id === conflict.id && item.status === "OPEN"); if (!existing) conflicts.push(conflict); } return { accepted: input.records.length, conflicts: found }; }
