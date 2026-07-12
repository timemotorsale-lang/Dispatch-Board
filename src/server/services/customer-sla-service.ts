import type { AuthenticatedUser } from "@/server/auth/store";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { calculateBusinessMinutes, evaluateCustomerSlaStage, type CustomerBusinessWindow, type CustomerSlaStage } from "@/server/customers/sla/customer-sla-clock";
import { assertAuthenticatedUser, isManager } from "@/server/policies/access";
import { createCustomerSlaRepository, type CustomerSlaRepository } from "@/server/repositories/customer-sla-repository";

type Dependencies = { repository?: CustomerSlaRepository; now?: () => Date; organizationId?: string };
function dependencies(input: Dependencies) { return { repository: input.repository ?? createCustomerSlaRepository(), now: input.now ?? (() => new Date()), organizationId: input.organizationId ?? INITIAL_ORGANIZATION.id }; }
function requireManager(user: AuthenticatedUser | null) { const actor = assertAuthenticatedUser(user); if (!isManager(actor)) throw new Error("Manager access required."); return actor; }
function windows(value: unknown): CustomerBusinessWindow[] { if (!Array.isArray(value)) throw new Error("SLA policy business windows are invalid."); return value.map((item) => { if (!item || typeof item !== "object") throw new Error("SLA policy business window is invalid."); const row = item as Record<string, unknown>; return { day: String(row.day), openMinute: Number(row.openMinute), closeMinute: Number(row.closeMinute) }; }); }
function targets(value: unknown) { if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("SLA policy severity targets are invalid."); return value as Record<string, { responseMinutes: number; resolutionMinutes: number; updateMinutes: number }>; }
function stringList(value: unknown) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []; }

export async function evaluateCustomerSlaForSystem(input: Dependencies = {}) {
  const deps = dependencies(input); const now = deps.now(); const policy = await deps.repository.getActivePolicy(deps.organizationId, now);
  if (!policy) throw new Error("No active customer SLA policy is configured.");
  const cases = await deps.repository.listCasesForEvaluation(deps.organizationId); let alertCount = 0; let taskCount = 0;
  const results = [];
  for (const item of cases) {
    const casePolicy = item.slaPolicy ?? policy;
    const businessWindows = windows(casePolicy.businessWindows); const severityTargets = targets(casePolicy.severityTargets);
    const target = severityTargets[item.severityBand] ?? severityTargets.P3;
    if (!target) throw new Error(`SLA policy is missing targets for ${item.severityBand}.`);
    const clockType = item.firstRespondedAt ? "RESOLUTION" : "FIRST_RESPONSE";
    const targetMinutes = clockType === "FIRST_RESPONSE" ? target.responseMinutes : target.resolutionMinutes;
    const elapsedMinutes = calculateBusinessMinutes({ start: item.createdAt, end: now, timezone: casePolicy.timezone, windows: businessWindows, pauses: item.slaPauses.map((pause) => ({ startedAt: pause.startedAt, endedAt: pause.endedAt })) });
    const evaluation = evaluateCustomerSlaStage({ elapsedMinutes, targetMinutes, priorStage: item.slaStage as CustomerSlaStage });
    const recorded = await deps.repository.recordEvaluation({ caseRecord: item, stage: evaluation.stage, clockType, evaluatedAt: now, percentConsumed: evaluation.percentConsumed });
    if (recorded.alertCreated) alertCount += 1; if (recorded.taskCreated) taskCount += 1;
    results.push({ caseId: item.id, concernNumber: item.concernNumber, clockType, ...evaluation });
  }
  return { evaluatedAt: now.toISOString(), policy: { id: policy.id, code: policy.code, version: policy.version }, evaluatedCount: cases.length, alertCount, taskCount, results };
}

export async function evaluateCustomerSla(actor: AuthenticatedUser | null, input: Dependencies = {}) { requireManager(actor); return evaluateCustomerSlaForSystem(input); }

export async function pauseCustomerSla(actor: AuthenticatedUser | null, caseId: string, value: unknown, input: Dependencies = {}) {
  const user = requireManager(actor); if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("SLA pause payload must be an object.");
  const raw = value as Record<string, unknown>; const reasonCode = typeof raw.reasonCode === "string" ? raw.reasonCode.trim() : ""; const notes = typeof raw.notes === "string" ? raw.notes.trim() : ""; const nextReviewAt = new Date(String(raw.nextReviewAt ?? ""));
  if (!reasonCode) throw new Error("SLA pause reason code is required."); if (!notes) throw new Error("SLA pause notes are required."); if (Number.isNaN(nextReviewAt.getTime())) throw new Error("SLA pause next review time is required.");
  const deps = dependencies(input); const now = deps.now(); if (nextReviewAt <= now) throw new Error("SLA pause next review time must be in the future.");
  const policy = await deps.repository.getActivePolicy(deps.organizationId, now); if (!policy) throw new Error("No active customer SLA policy is configured.");
  if (!stringList(policy.pauseReasonCodes).includes(reasonCode)) throw new Error("SLA pause reason code is not allowed by the active policy.");
  if (await deps.repository.findOpenPause(caseId)) throw new Error("Customer case already has an active SLA pause.");
  await deps.repository.startPause({ concernCaseId: caseId, reasonCode, notes, startedAt: now, nextReviewAt, actorUserId: user.id });
  return { caseId, status: "PAUSED", reasonCode, startedAt: now.toISOString(), nextReviewAt: nextReviewAt.toISOString() };
}

export async function resumeCustomerSla(actor: AuthenticatedUser | null, caseId: string, input: Dependencies = {}) {
  const user = requireManager(actor); const deps = dependencies(input); const pause = await deps.repository.findOpenPause(caseId); if (!pause) throw new Error("Customer case does not have an active SLA pause."); const now = deps.now(); await deps.repository.endPause({ id: pause.id, endedAt: now, actorUserId: user.id }); return { caseId, status: "RUNNING", resumedAt: now.toISOString() };
}

export async function getCustomerSlaManagerQueue(actor: AuthenticatedUser | null, input: Dependencies = {}) {
  requireManager(actor); const deps = dependencies(input); const now = deps.now(); const rows = await deps.repository.listManagerQueue(deps.organizationId);
  return { generatedAt: now.toISOString(), counts: { total: rows.length, watch: rows.filter((item) => item.slaStage === "WATCH").length, atRisk: rows.filter((item) => item.slaStage === "AT_RISK").length, breached: rows.filter((item) => item.slaStage === "BREACHED" || item.slaStage === "REPEATED_BREACH").length, awaitingUpdate: rows.filter((item) => item.promises.some((promise) => promise.dueAt <= now)).length }, items: rows };
}
