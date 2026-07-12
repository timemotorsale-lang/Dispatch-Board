import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import { createCrmDecisionRegistry } from "@/server/customers/decisions/crm-decision-registry";
import type {
  CreateCrmDecisionRecordInput,
  CrmDecisionRecord,
  CrmDecisionRepository,
  OverrideCrmDecisionRecordInput
} from "@/server/repositories/crm-decision-repository";
import {
  evaluateCrmDecision,
  getCrmDecision,
  overrideCrmDecision
} from "@/server/services/crm-decision-service";

const manager: AuthenticatedUser = {
  id: "manager-1",
  name: "Morgan Manager",
  email: "manager@example.com",
  isActive: true,
  roles: ["General Manager"],
  duties: { direct: [], roleDefaults: [], all: [] }
};

const staff: AuthenticatedUser = {
  ...manager,
  id: "staff-1",
  name: "Jordan Sales",
  email: "staff@example.com",
  roles: []
};

function repositoryHarness() {
  const records: CrmDecisionRecord[] = [];
  const repository: CrmDecisionRepository = {
    async create(input: CreateCrmDecisionRecordInput) {
      const record: CrmDecisionRecord = {
        id: `decision-${records.length + 1}`,
        ...input,
        normalizedInput: input.normalizedInput as Prisma.JsonValue,
        reasonCodes: input.reasonCodes as Prisma.JsonValue,
        missingInputs: input.missingInputs as Prisma.JsonValue,
        overriddenAt: null,
        overriddenByUserId: null,
        overrideReason: null,
        overrideSnapshot: null,
        finalOutcome: null,
        createdAt: input.decidedAt,
        overriddenByUser: null
      };
      records.push(record);
      return record;
    },
    async findById(organizationId, id) {
      return records.find((record) => record.organizationId === organizationId && record.id === id) ?? null;
    },
    async override(input: OverrideCrmDecisionRecordInput) {
      const record = records.find(
        (candidate) => candidate.id === input.id && candidate.organizationId === input.organizationId
      );
      if (!record) throw new Error("missing test record");
      record.overriddenAt = input.overriddenAt;
      record.overriddenByUserId = input.actorUserId;
      record.overrideReason = input.reason;
      record.overrideSnapshot = input.snapshot as Prisma.JsonValue;
      record.overriddenByUser = {
        id: manager.id,
        name: manager.name,
        email: manager.email
      };
      return record;
    }
  };
  return { records, repository };
}

function dependencies(repository: CrmDecisionRepository) {
  return {
    repository,
    organizationId: "org-1",
    now: () => new Date("2026-07-12T19:00:00.000Z"),
    registry: createCrmDecisionRegistry([
      {
        decisionType: "LEAD_PRIORITY",
        algorithmVersion: "lead-priority/1.0.0",
        evaluate(request) {
          return {
            decisionType: request.decisionType,
            algorithmVersion: request.algorithmVersion,
            subject: request.subject,
            customerId: request.customerId ?? null,
            score: 78,
            priority: "P2",
            recommendedOwnerId: "staff-1",
            recommendedActionCode: "GATHER_MISSING_INFORMATION",
            dueAt: "2026-07-12T15:00:00-05:00",
            reasonCodes: ["RECENT_ENGAGEMENT"],
            explanation: "Recent engagement warrants timely follow-up.",
            confidence: "LOW",
            missingInputs: ["purchaseTimeframe"],
            managerReviewRequired: false
          };
        }
      }
    ])
  };
}

const evaluationRequest = {
  decisionType: "LEAD_PRIORITY",
  algorithmVersion: "lead-priority/1.0.0",
  subject: { type: "LEAD" as const, id: "lead-1" },
  customerId: "customer-1",
  facts: { recentEngagement: true }
};

describe("CRM decision service", () => {
  it("evaluates, persists, explains, and retrieves a versioned decision", async () => {
    const { records, repository } = repositoryHarness();
    const deps = dependencies(repository);

    const decision = await evaluateCrmDecision(staff, evaluationRequest, deps);

    expect(decision).toMatchObject({
      id: "decision-1",
      algorithmVersion: "lead-priority/1.0.0",
      score: 78,
      confidence: "LOW",
      missingInputs: ["purchaseTimeframe"],
      reasonCodes: ["RECENT_ENGAGEMENT"]
    });
    expect(records[0]).toMatchObject({
      organizationId: "org-1",
      normalizedInput: { recentEngagement: true },
      decidedAt: new Date("2026-07-12T19:00:00.000Z")
    });
    await expect(getCrmDecision(staff, decision.id, deps)).resolves.toEqual(decision);
  });

  it("requires authentication for evaluation and retrieval", async () => {
    const { repository } = repositoryHarness();
    const deps = dependencies(repository);
    await expect(evaluateCrmDecision(null, evaluationRequest, deps)).rejects.toThrow(
      "Authentication required."
    );
    await expect(getCrmDecision(null, "decision-1", deps)).rejects.toThrow(
      "Authentication required."
    );
  });

  it("requires a manager and a meaningful reason for an auditable override", async () => {
    const { records, repository } = repositoryHarness();
    const deps = dependencies(repository);
    const decision = await evaluateCrmDecision(staff, evaluationRequest, deps);

    await expect(
      overrideCrmDecision(staff, decision.id, {
        reason: "Capacity changed after evaluation.",
        recommendation: { recommendedOwnerId: "staff-2" }
      }, deps)
    ).rejects.toThrow("Manager access required.");

    await expect(
      overrideCrmDecision(manager, decision.id, {
        reason: "Too short",
        recommendation: { recommendedOwnerId: "staff-2" }
      }, deps)
    ).rejects.toThrow("reason of at least 10 characters");

    const overridden = await overrideCrmDecision(manager, decision.id, {
      reason: "Capacity changed after evaluation.",
      recommendation: { recommendedOwnerId: "staff-2", priority: "P2" }
    }, deps);

    expect(overridden.override).toMatchObject({
      overriddenBy: { id: manager.id },
      reason: "Capacity changed after evaluation.",
      recommendation: { recommendedOwnerId: "staff-2", priority: "P2" }
    });
    expect(records[0].overriddenByUserId).toBe(manager.id);
    await expect(
      overrideCrmDecision(manager, decision.id, {
        reason: "Attempting another override.",
        recommendation: { recommendedOwnerId: "staff-3" }
      }, deps)
    ).rejects.toThrow("already been overridden");
  });

  it("does not retrieve decisions outside the active organization", async () => {
    const { repository } = repositoryHarness();
    const deps = dependencies(repository);
    const decision = await evaluateCrmDecision(staff, evaluationRequest, deps);

    await expect(
      getCrmDecision(staff, decision.id, { ...deps, organizationId: "org-2" })
    ).rejects.toThrow("CRM decision not found.");
  });
});
