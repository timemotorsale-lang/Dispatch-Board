import { describe, expect, it } from "vitest";
import type { AuthenticatedUser } from "@/server/auth/store";
import type { CustomerSlaPolicyRecord, CustomerSlaRepository } from "@/server/repositories/customer-sla-repository";
import { evaluateCustomerSlaForSystem, pauseCustomerSla, resumeCustomerSla } from "@/server/services/customer-sla-service";

const manager: AuthenticatedUser = { id: "manager-1", name: "Manager", email: "manager@test", isActive: true, roles: ["General Manager"], duties: { direct: [], roleDefaults: [], all: [] } };
const policy = { id: "policy-1", organizationId: "org-1", code: "DEFAULT", version: 1, timezone: "America/Chicago", businessWindows: [{ day: "MONDAY", openMinute: 540, closeMinute: 1080 }], severityTargets: { P1: { responseMinutes: 60, resolutionMinutes: 240, updateMinutes: 60 }, P3: { responseMinutes: 120, resolutionMinutes: 480, updateMinutes: 120 } }, pauseReasonCodes: ["WAITING_CUSTOMER"], effectiveFrom: new Date("2026-01-01T00:00:00.000Z") } as CustomerSlaPolicyRecord;

function harness() {
  let activePause: { id: string; concernCaseId: string } | null = null; const evaluations: string[] = [];
  const repository = {
    async getActivePolicy() { return policy; },
    async listCasesForEvaluation() { return [{ id: "case-1", concernNumber: "CON-1", organizationId: "org-1", title: "Title delay", status: "OPEN", severityBand: "P1", slaStage: "HEALTHY", createdAt: new Date("2026-07-13T14:00:00.000Z"), firstRespondedAt: null, assignedOwnerId: "owner-1", customerReference: "Maria", boardDayId: "board-1", slaPolicy: policy, slaPauses: [] }]; },
    async recordEvaluation(input: { stage: string }) { evaluations.push(input.stage); return { alertCreated: evaluations.length === 1, taskCreated: evaluations.length === 1 }; },
    async startPause(input: { concernCaseId: string }) { activePause = { id: "pause-1", concernCaseId: input.concernCaseId }; },
    async findOpenPause() { return activePause; },
    async endPause() { activePause = null; },
    async listManagerQueue() { return []; }
  } as CustomerSlaRepository;
  return { repository, evaluations, getPause: () => activePause };
}

describe("customer SLA service", () => {
  it("evaluates a policy clock and delegates idempotent alert persistence", async () => {
    const { repository, evaluations } = harness(); const result = await evaluateCustomerSlaForSystem({ repository, organizationId: "org-1", now: () => new Date("2026-07-13T15:00:00.000Z") });
    expect(result).toMatchObject({ evaluatedCount: 1, alertCount: 1, taskCount: 1 }); expect(evaluations).toEqual(["BREACHED"]);
  });

  it("allows configured manager pauses and resumes", async () => {
    const state = harness(); const deps = { repository: state.repository, organizationId: "org-1", now: () => new Date("2026-07-13T15:00:00.000Z") };
    await expect(pauseCustomerSla(manager, "case-1", { reasonCode: "UNAPPROVED", notes: "Waiting.", nextReviewAt: "2026-07-13T17:00:00.000Z" }, deps)).rejects.toThrow("not allowed");
    await pauseCustomerSla(manager, "case-1", { reasonCode: "WAITING_CUSTOMER", notes: "Customer must provide document.", nextReviewAt: "2026-07-13T17:00:00.000Z" }, deps);
    expect(state.getPause()).toEqual({ id: "pause-1", concernCaseId: "case-1" });
    await expect(pauseCustomerSla(manager, "case-1", { reasonCode: "WAITING_CUSTOMER", notes: "Again.", nextReviewAt: "2026-07-13T17:00:00.000Z" }, deps)).rejects.toThrow("already");
    await expect(resumeCustomerSla(manager, "case-1", deps)).resolves.toMatchObject({ status: "RUNNING" });
  });
});
