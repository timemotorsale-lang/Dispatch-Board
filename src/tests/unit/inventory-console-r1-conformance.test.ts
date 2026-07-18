import { describe, expect, it } from "vitest";

import {
  createR1ConformanceFixture,
  runR1FoundationConformance,
  verifyAuthority,
  verifyCanonicalBoundaries,
  verifyCommandContract,
  verifyEventProjection,
  verifyEvidenceLifecycle,
  verifyPolicyRollout,
  verifyRecoveryHarness,
  verifyWorkGovernance,
} from "@/server/inventory-console-foundation";

describe("Inventory Console R1 foundation conformance", () => {
  it("passes the fixed InventoryUnit, RepairOrder, Parts, and approval fixture", () => {
    const report = runR1FoundationConformance(createR1ConformanceFixture());

    expect(report.disposition).toBe("READY");
    expect(report.blockers).toEqual([]);
    expect(report.slices.map((slice) => slice.slice)).toEqual(["IC-010", "IC-011", "IC-012", "IC-013", "IC-014", "IC-015", "IC-016", "IC-017"]);
    expect(report.slices.every((slice) => slice.disposition === "READY")).toBe(true);
  });

  it("blocks duplicate open inventory cycles and customer-repair lifecycle contamination", () => {
    const fixture = createR1ConformanceFixture().canonical;
    fixture.inventoryUnits.push({ ...fixture.inventoryUnits[1], cycle: 3, id: "unit-duplicate" });
    fixture.repairOrders[1].inventoryUnitId = "unit-001";

    const result = verifyCanonicalBoundaries(fixture);
    expect(result.disposition).toBe("BLOCKED");
    expect(result.blockers).toContain("IC-010_ONEOPENINVENTORYCYCLE");
    expect(result.blockers).toContain("IC-010_REPAIRORIGINSSEPARATED");
  });

  it("fails closed on explicit deny, self approval, and split authority", () => {
    const fixture = createR1ConformanceFixture().authority;
    fixture.explicitDeny = true;
    fixture.approverUserId = fixture.requesterUserId;
    fixture.cumulativeRelatedAmountCents = fixture.delegatedLimitCents + 1;

    const result = verifyAuthority(fixture);
    expect(result.blockers).toEqual(expect.arrayContaining(["IC-011_EXPLICITDENYWINS", "IC-011_FOUREYES", "IC-011_ANTISPLITTING"]));
  });

  it("blocks stale results and conflicting idempotency reuse that was not rejected", () => {
    const fixture = createR1ConformanceFixture().command;
    fixture.commands[0].resultVersion = fixture.commands[0].expectedVersion;
    fixture.attempts[2].rejected = false;

    const result = verifyCommandContract(fixture);
    expect(result.blockers).toContain("IC-012_EXPECTEDVERSIONADVANCED");
    expect(result.blockers).toContain("IC-012_CONFLICTINGREUSEREJECTED");
  });

  it("blocks duplicate active work, incomplete blockers, and self-approved decisions", () => {
    const fixture = createR1ConformanceFixture().work;
    fixture.items.push({ ...fixture.items[0], id: "task-duplicate" });
    delete fixture.items[1].reason;
    fixture.items[3].approverUserId = fixture.items[3].requesterUserId;

    const result = verifyWorkGovernance(fixture);
    expect(result.blockers).toEqual(expect.arrayContaining(["IC-013_ACTIVEWORKDEDUPLICATED", "IC-013_BLOCKERSACTIONABLE", "IC-013_SEPARATIONOFDUTIES"]));
  });

  it("blocks unsafe evidence availability and legal-hold deletion", () => {
    const fixture = createR1ConformanceFixture().evidence;
    fixture.objects[1].status = "AVAILABLE";
    fixture.objects[2].status = "DELETED";

    const result = verifyEvidenceLifecycle(fixture);
    expect(result.blockers).toContain("IC-014_MALWAREFAILCLOSED");
    expect(result.blockers).toContain("IC-014_DELETIONHONORSLEGALHOLD");
  });

  it("blocks unapproved and generally active development policy", () => {
    const fixture = createR1ConformanceFixture().policy;
    fixture.policies[1].approvedAt = null;
    fixture.policies[1].rollout = "GENERAL";

    const result = verifyPolicyRollout(fixture);
    expect(result.blockers).toContain("IC-015_APPROVALBEFOREACTIVATION");
    expect(result.blockers).toContain("IC-015_ROLLOUTSAFEFORDEVELOPMENT");
  });

  it("blocks nondeterministic rebuilds, projection mismatches, and unowned dead letters", () => {
    const fixture = createR1ConformanceFixture().projection;
    fixture.rebuildFingerprint = "different";
    fixture.reconciliationMismatchCount = 1;
    fixture.deadLetters[0].exceptionOwned = false;

    const result = verifyEventProjection(fixture);
    expect(result.blockers).toEqual(expect.arrayContaining(["IC-016_REBUILDDETERMINISTIC", "IC-016_RECONCILIATIONCLEAN", "IC-016_DEADLETTERSOWNED"]));
  });

  it("blocks recovery when restored totals diverge or replay evidence is missing", () => {
    const fixture = createR1ConformanceFixture().recovery;
    fixture.restoredTotals.commands = 3;
    fixture.replayPassed = false;

    const result = verifyRecoveryHarness(fixture);
    expect(result.blockers).toContain("IC-017_BACKUPRESTORERECONCILED");
    expect(result.blockers).toContain("IC-017_REPLAYPASSED");
  });
});

