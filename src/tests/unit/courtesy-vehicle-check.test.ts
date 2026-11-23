import { describe, expect, it, vi } from "vitest";
import { hasCurrentRepairQcPass } from "@/lib/final-repair-qc";
import { executeEnterpriseVehicleCommand } from "@/server/enterprise-command/service";
import type { EnterpriseCommandRepository } from "@/server/enterprise-command/repository";
import { courtesyCheckCommandType, courtesyCheckSubjectType, frontlineQcItems, isCourtesySafetyFlag } from "@/lib/courtesy-vehicle-check";
import { normalizeCourtesyCheckCommand } from "@/server/repair-order/courtesy-vehicle-check";

vi.mock("@/server/db/client", () => ({ prisma: {} }));

const request = { action: "SAVE_INSPECTION", expectedVersion: 0, idempotencyKey: "courtesy-check-test" };
const tireReview = { code: "TIRES", result: "REVIEW", note: "Uneven tire wear, recommend checking alignment", evidence: "Inside edge measured 4/32" };

describe("customer courtesy vehicle check", () => {
  it("reuses all 19 frontline items and records only observations entered by the inspector", () => {
    expect(new Set(frontlineQcItems.map(item => item.code)).size).toBe(19);
    const result = normalizeCourtesyCheckCommand({ ...request, findings: [tireReview, { code: "HEADLIGHTS_SIGNALS", result: "PASS" }] });
    expect(result).toMatchObject({ findings: [tireReview, { code: "HEADLIGHTS_SIGNALS", result: "PASS", note: "", evidence: "" }] });
  });

  it("enforces documented yellow/red findings and rejects duplicate or unknown checklist items", () => {
    expect(() => normalizeCourtesyCheckCommand({ ...request, findings: [{ ...tireReview, note: "" }] })).toThrow("every yellow or red");
    expect(() => normalizeCourtesyCheckCommand({ ...request, findings: [tireReview, tireReview] })).toThrow("one valid result");
    expect(() => normalizeCourtesyCheckCommand({ ...request, findings: [{ ...tireReview, code: "UNKNOWN" }] })).toThrow("one valid result");
  });

  it("flags an actual red safety finding and keeps customer follow-up explicit", () => {
    expect(isCourtesySafetyFlag({ ...tireReview, result: "REVIEW" })).toBe(false);
    expect(isCourtesySafetyFlag({ ...tireReview, result: "FAIL" })).toBe(true);
    expect(isCourtesySafetyFlag({ ...tireReview, code: "DETAIL_QUALITY", result: "FAIL" })).toBe(false);
    expect(normalizeCourtesyCheckCommand({ ...request, action: "RECORD_FOLLOW_UP", code: "TIRES", outcome: "DEFERRED" }))
      .toMatchObject({ action: "RECORD_FOLLOW_UP", code: "TIRES", outcome: "DEFERRED" });
  });
  it("prevents the generic gateway from writing a courtesy-check receipt", async () => {
    const commit = vi.fn();
    const repository = { listCapabilityGrants: async () => [], commit } as unknown as EnterpriseCommandRepository;
    const manager = { id: "manager", name: "Manager", email: "manager@example.test", isActive: true,
      roles: ["General Manager"], duties: { all: [], direct: [], roleDefaults: [] } };
    await expect(executeEnterpriseVehicleCommand(manager, {
      commandType: courtesyCheckCommandType, subjectType: courtesyCheckSubjectType, subjectId: "repair",
      domain: "SHOP_OPERATIONS", expectedVersion: 0, idempotencyKey: "courtesy-gateway", reason: "Verify reserved command", payload: {},
      locationId: "location",
    }, { repository })).rejects.toThrow("Use the customer repair courtesy check");
    expect(commit).not.toHaveBeenCalled();
  });

  it("requires a current QC pass and allows a versioned withdrawal", () => {
    const passed = { status: "QC_PASSED", qualityInspections: [{ disposition: "PASSED", safetyChecksPassed: true,
      peerVerificationRequired: false, peerVerificationPassed: false, roadTestRequired: true, roadTestOutcome: "PASSED",
      inspectedAt: "2026-11-22T13:00:00Z" }], laborClocks: [] };
    expect(hasCurrentRepairQcPass(passed)).toBe(true);
    expect(hasCurrentRepairQcPass({ ...passed, laborClocks: [{ finishedAt: "2026-11-22T14:00:00Z" }] })).toBe(false);
    expect(normalizeCourtesyCheckCommand({ ...request, action: "WITHDRAW_INSPECTION", expectedVersion: 1 }))
      .toMatchObject({ action: "WITHDRAW_INSPECTION", expectedVersion: 1 });
  });

});
