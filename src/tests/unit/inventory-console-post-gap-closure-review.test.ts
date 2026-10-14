import { describe, expect, it } from "vitest";
import { POST_GAP_CLOSURE_TRACKS, reviewPostGapClosureConformance } from "@/server/program-integration-validation/post-gap-closure-review";

describe("Inventory Console post-gap-closure conformance review", () => {
  it("assigns every remaining partial slice exactly once without claiming completion", () => {
    const review = reviewPostGapClosureConformance();
    expect(review.disposition).toBe("REVIEWED");
    expect(review.completionClaim).toBe("NONE_REVIEW_ONLY");
    expect(review.blockers).toEqual([]);
    expect(review.partialSlices).toBe(31);
    expect(review.repositoryThenReassess).toBe(9);
    expect(review.operationalEvidenceOnly).toBe(22);
    expect(new Set(review.tracks.flatMap(track => track.ids)).size).toBe(31);
  });

  it("preserves the audited baseline and dependency-ordered next branch", () => {
    const review = reviewPostGapClosureConformance();
    expect(review.baselineCounts).toEqual({ COMPLETE: 69, PARTIAL: 31, NOT_STARTED: 0, EXTERNAL_EVIDENCE_REQUIRED: 17, BLOCKED_BY_DECISION: 4 });
    expect(review.nextBranch).toBe("codex/inventory-console-gap-closure-wave-8-domain-reconciliation");
    expect(POST_GAP_CLOSURE_TRACKS.map(track => track.code)).toEqual(["WAVE_8_DOMAIN_RECONCILIATION", "OPERATIONAL_EVIDENCE"]);
  });

  it("keeps provider, accessibility, deployment, pilot, and release-only work out of coding waves", () => {
    const evidence = POST_GAP_CLOSURE_TRACKS.find(track => track.execution === "EVIDENCE_ONLY");
    expect(evidence?.branch).toBeNull();
    expect(evidence?.ids).toEqual(["IC-005", "IC-015", "IC-020", "IC-028", "IC-045", "IC-047", "IC-048", "IC-050", "IC-051", "IC-052", "IC-053", "IC-054", "IC-055", "IC-056", "IC-057", "IC-060", "IC-074", "IC-078", "IC-079", "IC-094", "IC-096", "IC-099"]);
  });
});
