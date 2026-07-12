import { describe, expect, it } from "vitest";
import type { AuthenticatedUser } from "@/server/auth/store";
import type { CrmFeatureFlagRecord, CrmRolloutRepository } from "@/server/repositories/crm-rollout-repository";
import { createCrmReadinessSnapshot, evaluateCrmFeature, rollbackCrm, updateCrmFeatureFlag } from "@/server/services/crm-rollout-service";

const manager: AuthenticatedUser = { id: "manager-1", name: "Manager", email: "manager@test", isActive: true, roles: ["General Manager"], duties: { direct: [], roleDefaults: [], all: [] } };
function flag(code: string, enabled = true, percent = 0, users: string[] = []): CrmFeatureFlagRecord { return { id: `flag-${code}`, organizationId: "org-1", code, enabled, rolloutPercent: percent, allowedUserIds: users, updatedByUserId: null, updatedAt: new Date("2026-07-12T19:00:00.000Z") }; }
function harness() { let flags = [flag("CRM_MASTER"), flag("CRM_LEADS", true, 0, ["pilot-1"]), flag("CRM_CASES"), flag("CRM_SLA"), flag("CRM_CUSTOMER_360")]; const events: string[] = []; const repository = {
  async listFlags() { return flags; },
  async updateFlag(input: { code: string; enabled: boolean; rolloutPercent: number; allowedUserIds: string[] }) { const current = flags.find((item) => item.code === input.code)!; Object.assign(current, input); events.push("update"); return current; },
  async rollback() { flags = flags.map((item) => ({ ...item, enabled: false, rolloutPercent: 0, allowedUserIds: [] })); events.push("rollback"); return flags; },
  async readMetrics() { return { decisions: 20, overrides: 2, lowConfidence: 4, leads: 10, wonLeads: 3, cases: 5, closedCases: 4, breachedAlerts: 0, promises: 5, fulfilledPromises: 5 }; },
  async createSnapshot() { return { id: "snapshot-1", createdAt: new Date("2026-07-12T19:00:00.000Z") }; }
} as CrmRolloutRepository; return { repository, events, getFlags: () => flags }; }

describe("CRM rollout service", () => {
  it("requires master and feature flags and honors an explicit pilot cohort", () => {
    const flags = [flag("CRM_MASTER"), flag("CRM_LEADS", true, 0, ["pilot-1"])];
    expect(evaluateCrmFeature(flags, "CRM_LEADS", "pilot-1")).toMatchObject({ eligible: true, reason: "PILOT_ELIGIBLE" });
    expect(evaluateCrmFeature(flags, "CRM_LEADS", "other")).toMatchObject({ eligible: false, reason: "OUTSIDE_PILOT_COHORT" });
    expect(evaluateCrmFeature([flag("CRM_MASTER", false), flags[1]], "CRM_LEADS", "pilot-1").reason).toBe("CRM_MASTER_DISABLED");
  });

  it("validates, audits, and updates a rollout flag", async () => {
    const state = harness();
    await expect(updateCrmFeatureFlag(manager, { code: "CRM_LEADS", enabled: true, rolloutPercent: 101, reason: "Invalid percentage." }, { repository: state.repository, organizationId: "org-1" })).rejects.toThrow("0 through 100");
    const updated = await updateCrmFeatureFlag(manager, { code: "CRM_LEADS", enabled: true, rolloutPercent: 25, allowedUserIds: ["pilot-1", "pilot-1"], reason: "Expand the controlled pilot." }, { repository: state.repository, organizationId: "org-1" });
    expect(updated).toMatchObject({ rolloutPercent: 25, allowedUserIds: ["pilot-1"] }); expect(state.events).toEqual(["update"]);
  });

  it("rolls back every feature without deleting records", async () => {
    const state = harness(); const result = await rollbackCrm(manager, "Pilot rollback due to blocking defect.", { repository: state.repository, organizationId: "org-1", now: () => new Date("2026-07-12T19:00:00.000Z") });
    expect(result.flags.every((item) => !item.enabled && item.rolloutPercent === 0)).toBe(true); expect(state.events).toEqual(["rollback"]);
  });

  it("creates a measurable readiness snapshot", async () => {
    const state = harness(); const result = await createCrmReadinessSnapshot(manager, {}, { repository: state.repository, organizationId: "org-1", now: () => new Date("2026-07-12T19:00:00.000Z") });
    expect(result).toMatchObject({ readiness: "READY_FOR_PILOT", metrics: { overrideRate: 0.1, lowConfidenceRate: 0.2, leadWinRate: 0.3, promiseFulfillmentRate: 1 } });
  });
});
