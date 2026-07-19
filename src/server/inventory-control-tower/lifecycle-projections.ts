import type { InventoryLifecycleStage } from "./service";

export type LifecycleEventFact = { inventoryUnitId: string; fromStage: InventoryLifecycleStage | null; toStage: InventoryLifecycleStage; occurredAt: Date };
export type CurrentStageFact = { id: string; lifecycleStage: InventoryLifecycleStage; stageStartedAt: Date; operatingState: string; targetAt: Date; exposureCents: number; ownerUserId: string };
export type RepairDependencyFact = { id: string; inventoryUnitId: string | null; origin: string; operatingState: string; stage: string; partDemands: Array<{ quantityRequired: number; quantityReserved: number; status: string; requiredAt: Date; requisitions: Array<{ selectedOffer: { estimatedArrivalAt: Date | null } | null }> }>; repairJobs: Array<{ status: string }> };
export type CostFact = { amountCents: number; category: string; confidence: string; currency: string; status: string };

function percentile(values: number[], ratio: number) { if (!values.length) return null; const sorted = [...values].sort((a, b) => a - b); return Math.round(sorted[Math.max(0, Math.ceil(sorted.length * ratio) - 1)] * 10) / 10; }
function days(later: Date, earlier: Date) { return Math.max(0, (later.getTime() - earlier.getTime()) / 86_400_000); }

export function buildLifecycleStageFlow(stages: readonly InventoryLifecycleStage[], units: CurrentStageFact[], events: LifecycleEventFact[], now: Date) {
  const windowStart = new Date(now.getTime() - 30 * 86_400_000), durations = new Map<InventoryLifecycleStage, number[]>();
  for (const stage of stages) durations.set(stage, units.filter((unit) => unit.lifecycleStage === stage).map((unit) => days(now, unit.stageStartedAt)));
  const byUnit = new Map<string, LifecycleEventFact[]>();
  for (const event of events) byUnit.set(event.inventoryUnitId, [...(byUnit.get(event.inventoryUnitId) ?? []), event]);
  for (const history of byUnit.values()) {
    history.sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
    for (let index = 1; index < history.length; index += 1) { const prior = history[index - 1], current = history[index]; if (current.fromStage) durations.get(current.fromStage)?.push(days(current.occurredAt, prior.occurredAt)); }
  }
  return stages.map((stage) => { const samples = durations.get(stage) ?? [], population = units.filter((unit) => unit.lifecycleStage === stage); return { stage, entries30d: events.filter((event) => event.toStage === stage && event.occurredAt >= windowStart).length, exits30d: events.filter((event) => event.fromStage === stage && event.occurredAt >= windowStart).length, medianDays: percentile(samples, .5), p90Days: percentile(samples, .9), sampleSize: samples.length, active: population.filter((unit) => unit.operatingState === "ACTIVE").length, waiting: population.filter((unit) => unit.operatingState === "WAITING").length, idle: population.filter((unit) => unit.operatingState === "IDLE").length, blocked: population.filter((unit) => unit.operatingState === "BLOCKED").length, breached: population.filter((unit) => unit.targetAt < now && unit.operatingState !== "CLOSED").length, exposureCents: population.reduce((sum, unit) => sum + unit.exposureCents, 0), ownerCount: new Set(population.map((unit) => unit.ownerUserId).filter(Boolean)).size }; });
}

export function buildCrossLaneDependencies(repairOrders: RepairDependencyFact[], customerRepairOrdersExcluded: number) {
  const inventoryRecon = repairOrders.filter((order) => order.origin === "INVENTORY_RECON" && order.inventoryUnitId), active = inventoryRecon.filter((order) => order.stage !== "CLOSED" && order.stage !== "CANCELLED");
  const demands = active.flatMap((order) => order.partDemands).filter((demand) => ["OPEN", "PARTIALLY_RESERVED"].includes(demand.status)), jobs = active.flatMap((order) => order.repairJobs);
  const etaValues = demands.flatMap((demand) => demand.requisitions.map((item) => item.selectedOffer?.estimatedArrivalAt).filter((item): item is Date => Boolean(item))).sort((a, b) => a.getTime() - b.getTime()), fullyReserved = demands.filter((demand) => demand.quantityReserved >= demand.quantityRequired).length;
  return { status: "CONNECTED" as const, inventoryReconOrders: inventoryRecon.length, activeOrders: active.length, blockedOrders: active.filter((order) => order.operatingState === "BLOCKED").length, openJobs: jobs.filter((job) => !["QC_PASSED", "CANCELLED"].includes(job.status)).length, qcPassedJobs: jobs.filter((job) => job.status === "QC_PASSED").length, qcHandoffReady: jobs.length > 0 && jobs.every((job) => ["QC_PASSED", "CANCELLED"].includes(job.status)) && demands.length === 0, waitingPartDemands: demands.length, unreservedPartUnits: demands.reduce((sum, demand) => sum + Math.max(0, demand.quantityRequired - demand.quantityReserved), 0), earliestEstimatedArrivalAt: etaValues[0]?.toISOString() ?? null, readinessConfidence: demands.length === 0 || fullyReserved === demands.length ? "HIGH" as const : etaValues.length ? "MEDIUM" as const : "LOW" as const, customerRepairOrdersExcluded };
}

export function buildCapitalComposition(costs: CostFact[]) {
  const eligible = costs.filter((cost) => cost.status !== "VOID" && cost.currency === "USD"), actualStatuses = new Set(["POSTED", "ACTUAL", "INCURRED", "RECOVERED"]);
  const group = (field: "category" | "confidence") => Object.entries(eligible.reduce<Record<string, number>>((result, item) => ({ ...result, [item[field]]: (result[item[field]] ?? 0) + item.amountCents }), {})).map(([key, exposureCents]) => ({ key, exposureCents })).sort((a, b) => b.exposureCents - a.exposureCents || a.key.localeCompare(b.key));
  return { actualCents: eligible.filter((cost) => actualStatuses.has(cost.status)).reduce((sum, cost) => sum + cost.amountCents, 0), estimatedCents: eligible.filter((cost) => !actualStatuses.has(cost.status)).reduce((sum, cost) => sum + cost.amountCents, 0), byCategory: group("category"), byConfidence: group("confidence"), excludedEntries: costs.length - eligible.length, reconciliationCents: eligible.reduce((sum, cost) => sum + cost.amountCents, 0) };
}

export function buildLifecycleHealth(input: { checkpoints: Array<{ projectionCode: string; lagSeconds: number; lastFailureAt: Date | null; lastError: string | null }>; conflicts: Array<{ id: string; systemCode: string; summary: string; ownerUserId: string | null }>; deadLetters: number }) {
  const lagging = input.checkpoints.filter((item) => item.lagSeconds > 300 || Boolean(item.lastFailureAt && item.lastError));
  const status = input.deadLetters || input.conflicts.length || lagging.length ? "ATTENTION" as const : "HEALTHY" as const;
  return { status, deadLetters: input.deadLetters, openConflicts: input.conflicts.length, laggingProjections: lagging.map((item) => ({ code: item.projectionCode, lagSeconds: item.lagSeconds, error: item.lastError })), conflicts: input.conflicts, affectedPanels: [...new Set([...(input.deadLetters ? ["External handoffs"] : []), ...(input.conflicts.length ? ["Integration reconciliation"] : []), ...(lagging.length ? ["Projection freshness"] : [])])], manualPath: "Continue internal commands and evidence capture; do not infer external completion.", recoveryAction: "Open Integrations to reconcile conflicts or dead letters, then verify the next successful projection checkpoint." };
}
