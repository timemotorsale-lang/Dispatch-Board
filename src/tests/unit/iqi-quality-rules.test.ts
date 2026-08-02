import { describe, expect, it } from "vitest";

import { evaluateIqiQuality, type IqiQualityInput } from "@/features/prototype/iqi-quality-rules";

const readyForPlanning: IqiQualityInput = {
  completenessAuditPassed: true,
  correctionOwnersAssigned: true,
  evidencePackageReceived: true,
  evidenceQualityApproved: true,
  findingDispositionPublished: true,
  handoffDecisionLocked: true,
  identityPackageMatched: true,
  inspectionSectionsComplete: true,
  nextOwnerAssigned: true,
  noReleaseBlockersRemain: true,
  qcReviewerAssigned: true,
  roadTestRequirementReviewed: true,
  safetyClassificationApproved: true,
  severityDecisionApproved: true,
  vehicleLinkedToInspection: true,
  findingsDispositionDecision: "Approved",
};

describe("evaluateIqiQuality", () => {
  it("marks Initial QC ready for recon planning when review and release controls are complete", () => {
    const result = evaluateIqiQuality(readyForPlanning);

    expect(result.readinessScore).toBe(100);
    expect(result.recommendation).toBe("Ready for recon planning");
    expect(result.blockers).toEqual([]);
    expect(result.confidence).toBe("High");
  });

  it("holds Initial QC when package, review, and release controls are missing", () => {
    const result = evaluateIqiQuality({
      ...readyForPlanning,
      evidencePackageReceived: false,
      evidenceQualityApproved: false,
      handoffDecisionLocked: false,
      noReleaseBlockersRemain: false,
    });

    expect(result.recommendation).toBe("Hold");
    expect(result.blockers).toContain("Inspection package receipt is incomplete");
    expect(result.blockers).toContain("QC review or evidence approval is incomplete");
    expect(result.blockers).toContain("Controlled handoff decision is incomplete");
  });

  it("prevents release when QC places the inspection package on hold", () => {
    const result = evaluateIqiQuality({
      ...readyForPlanning,
      findingsDispositionDecision: "Hold",
    });

    expect(result.recommendation).toBe("Hold");
    expect(result.blockers).toContain("QC placed the package on hold");
  });
});
