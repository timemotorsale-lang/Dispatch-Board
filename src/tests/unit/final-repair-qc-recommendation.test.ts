import type { Prisma, PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import {
  FINAL_REPAIR_QC_TEMPLATE,
  readFinalRepairQcRecommendation,
  repairChecklistItems
} from "@/lib/final-repair-qc";
import { normalizeQualityInspection } from "@/server/quality-control/domain";
import { createQualityControlRepository } from "@/server/quality-control/repository";
import type { EnterpriseCommandCommitInput } from "@/server/enterprise-command/repository";

vi.mock("@/server/db/client", () => ({ prisma: {} }));
vi.mock("@/server/enterprise-command/aggregate-mutation", () => ({
  executeAggregateMutation: async (
    db: PrismaClient,
    _command: unknown,
    _topic: unknown,
    mutate: (tx: Prisma.TransactionClient, version: number) => Promise<unknown>
  ) => db.$transaction(tx => mutate(tx, 1)),
  toJson: (value: unknown) => JSON.parse(JSON.stringify(value))
}));

const procedureRules = ["Verify fastener torque"];
const checks = repairChecklistItems(procedureRules).map(check => ({ ...check, result: "PASS" }));
const recommendation = { finding: "Rear tires approaching replacement", note: "Quote rear tires at the next service." };
const pass = {
  checks,
  completionEvidence: ["photo:repair"],
  idempotencyKey: "job-qc",
  inspectedAt: "2026-07-14T14:00:00Z",
  peerVerificationPassed: true,
  peerVerifierUserId: "peer",
  reason: "Record final repair quality inspection.",
  roadTestRequired: true,
  roadTestOutcome: "PASSED",
  roadTestEvidence: ["No pull on road test"],
  templateCode: FINAL_REPAIR_QC_TEMPLATE,
  templateVersion: 1
};

function fixture() {
  const job = {
    id: "job",
    repairOrderId: "order",
    description: "Replace lower control arm",
    plannedCorrection: "Replace left lower control arm",
    executionEvidence: ["photo:repair"],
    lane: "DIAGNOSTIC_HEAVY",
    procedureVersion: { id: "procedure", version: 1, qcRules: procedureRules },
    dispatches: [{ technicianUserId: "technician" }],
    qualityInspections: []
  };
  const tx = {
    repairJob: { findFirst: vi.fn().mockResolvedValue(job), update: vi.fn() },
    repairJobLaborClock: { updateMany: vi.fn() },
    repairQualityInspection: {
      create: vi.fn(async ({ data }) => ({ ...data, id: "saved-inspection" }))
    },
    user: { findFirst: vi.fn(async ({ where }) => ({ id: where.id })) }
  };
  const db = { $transaction: (mutate: (client: typeof tx) => Promise<unknown>) => mutate(tx) };
  const repository = createQualityControlRepository(db as unknown as PrismaClient);
  const command = { subjectId: job.id, organizationId: "org" } as EnterpriseCommandCommitInput;
  return {
    tx,
    inspect: async (payload: Record<string, unknown>) =>
      repository.inspect(command, { ...normalizeQualityInspection(payload), inspectorUserId: "inspector" })
  };
}

describe("repair-job Final QC recommendation", () => {
  it("persists the identified recommendation on a real pass with attributable QC evidence", async () => {
    const { inspect, tx } = fixture();
    const result = await inspect({
      ...pass,
      recommendation: { finding: ` ${recommendation.finding} `, note: ` ${recommendation.note} ` }
    });
    const saved = tx.repairQualityInspection.create.mock.calls[0][0].data;
    expect(saved).toMatchObject({
      repairJobId: "job",
      disposition: "PASSED",
      inspectorUserId: "inspector",
      peerVerifierUserId: "peer",
      roadTestOutcome: "PASSED",
      completionEvidence: pass.completionEvidence,
      reworkInstructions: null,
      templateSnapshot: { recommendation }
    });
    expect(readFinalRepairQcRecommendation(JSON.parse(JSON.stringify(saved)))).toEqual(recommendation);
    expect(tx.repairJob.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "QC_PASSED" }) }));
    expect(result).toMatchObject({ result: { disposition: "PASSED", jobStatus: "QC_PASSED", recommendation } });
  });

  it("keeps ordinary and historical passes readable without a recommendation", async () => {
    const { inspect, tx } = fixture();
    await inspect(pass);
    const saved = tx.repairQualityInspection.create.mock.calls[0][0].data;
    expect(saved.templateSnapshot).not.toHaveProperty("recommendation");
    expect(readFinalRepairQcRecommendation(saved)).toBeNull();
    expect(readFinalRepairQcRecommendation({ disposition: "PASSED" })).toBeNull();
    expect(readFinalRepairQcRecommendation({
      disposition: "FAILED",
      templateSnapshot: { templateCode: FINAL_REPAIR_QC_TEMPLATE, recommendation }
    })).toBeNull();
  });

  it("requires both a finding and a next step on the repair-job checklist", () => {
    expect(() => normalizeQualityInspection({ ...pass, recommendation: { ...recommendation, finding: "  " } }))
      .toThrow("Recommendation finding is required");
    expect(() => normalizeQualityInspection({ ...pass, recommendation: { ...recommendation, note: " " } }))
      .toThrow("Recommended next step is required");
    expect(() => normalizeQualityInspection({ ...pass, templateCode: "FINAL_QC", recommendation }))
      .toThrow("repair-job Final QC checklist");
  });

  it.each([
    ["required check missing", { checks: checks.slice(1) }, "Every Final QC checklist item"],
    ["procedure check missing", { checks: checks.slice(0, -1) }, "Every Final QC checklist item"],
    ["required road test missing", { roadTestRequired: false, roadTestOutcome: "NOT_REQUIRED" }, "passing road test"],
    ["road-test evidence missing", { roadTestEvidence: [] }, "road test needs evidence"],
    ["peer verification missing", { peerVerificationPassed: false }, "attributable peer verification"],
    ["peer is the executing technician", { peerVerifierUserId: "technician" }, "different from the executing technician"],
    ["road test failed", { roadTestOutcome: "FAILED" }, "requires a passed Final QC inspection"],
    ["safety check failed", { checks: checks.map(check => check.category === "SAFETY" ? { ...check, result: "FAIL" } : check) }, "requires a passed Final QC inspection"]
  ])("blocks a recommendation when %s", async (_case, overrides, error) => {
    const { inspect, tx } = fixture();
    await expect(inspect({ ...pass, ...overrides, recommendation })).rejects.toThrow(error);
    expect(tx.repairQualityInspection.create).not.toHaveBeenCalled();
    expect(tx.repairJob.update).not.toHaveBeenCalled();
  });

  it("sends a failed checklist back to the shop for correction", async () => {
    const { inspect, tx } = fixture();
    const failure = {
      ...pass,
      checks: checks.map(check => check.category === "SAFETY" ? { ...check, result: "FAIL" } : check),
      peerVerificationPassed: false,
      peerVerifierUserId: null
    };
    await expect(inspect(failure)).rejects.toThrow("Failed QC requires rework instructions");
    expect(tx.repairQualityInspection.create).not.toHaveBeenCalled();
    await inspect({ ...failure, reworkInstructions: "Correct the front suspension noise." });
    expect(tx.repairQualityInspection.create.mock.calls[0][0].data).toMatchObject({
      disposition: "FAILED", reworkInstructions: "Correct the front suspension noise."
    });
    expect(tx.repairJob.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "READY_FOR_REPAIR" }) }));
  });
});
