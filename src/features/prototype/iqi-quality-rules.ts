export type IqiDispositionDecision = "Pending" | "Approved" | "Correction required" | "Hold";
export type IqiRecommendation = "Ready for completeness review" | "Ready for disposition" | "Ready for recon planning" | "Exception" | "Hold";
export type IqiConfidence = "High" | "Medium" | "Low";

export type IqiQualityInput = {
  completenessAuditPassed: boolean;
  correctionOwnersAssigned: boolean;
  evidencePackageReceived: boolean;
  evidenceQualityApproved: boolean;
  findingDispositionPublished: boolean;
  handoffDecisionLocked: boolean;
  identityPackageMatched: boolean;
  inspectionSectionsComplete: boolean;
  nextOwnerAssigned: boolean;
  noReleaseBlockersRemain: boolean;
  qcReviewerAssigned: boolean;
  roadTestRequirementReviewed: boolean;
  safetyClassificationApproved: boolean;
  severityDecisionApproved: boolean;
  vehicleLinkedToInspection: boolean;
  findingsDispositionDecision: IqiDispositionDecision;
};

export type IqiQualityResult = {
  blockerCount: number;
  blockers: string[];
  confidence: IqiConfidence;
  dispositionComplete: boolean;
  explanation: string;
  inspectionPackageComplete: boolean;
  negativeDrivers: string[];
  positiveDrivers: string[];
  readinessGateComplete: boolean;
  readinessScore: number;
  recommendation: IqiRecommendation;
  reviewComplete: boolean;
};

export function evaluateIqiQuality(input: IqiQualityInput): IqiQualityResult {
  const inspectionPackageComplete = input.evidencePackageReceived
    && input.qcReviewerAssigned
    && input.identityPackageMatched
    && input.vehicleLinkedToInspection;

  const reviewComplete = input.completenessAuditPassed
    && input.inspectionSectionsComplete
    && input.roadTestRequirementReviewed
    && input.safetyClassificationApproved
    && input.severityDecisionApproved
    && input.evidenceQualityApproved;

  const dispositionComplete = input.findingDispositionPublished
    && input.correctionOwnersAssigned
    && input.nextOwnerAssigned
    && input.findingsDispositionDecision !== "Pending";

  const readinessGateComplete = inspectionPackageComplete
    && reviewComplete
    && dispositionComplete
    && input.handoffDecisionLocked
    && input.noReleaseBlockersRemain
    && input.findingsDispositionDecision !== "Hold";

  const blockers = [
    ...(!inspectionPackageComplete ? ["Inspection package receipt is incomplete"] : []),
    ...(!reviewComplete ? ["QC review or evidence approval is incomplete"] : []),
    ...(!dispositionComplete ? ["Finding disposition is incomplete"] : []),
    ...(!input.handoffDecisionLocked ? ["Controlled handoff decision is incomplete"] : []),
    ...(!input.noReleaseBlockersRemain ? ["Open release blockers still remain"] : []),
    ...(input.findingsDispositionDecision === "Hold" ? ["QC placed the package on hold"] : []),
  ];

  const readinessScore = Math.max(0, Math.min(100, Math.round(
    (inspectionPackageComplete ? 22 : 0)
    + (reviewComplete ? 34 : 0)
    + (dispositionComplete ? 24 : 0)
    + (input.handoffDecisionLocked ? 10 : 0)
    + (input.noReleaseBlockersRemain ? 10 : 0),
  )));

  const evidenceCount = [inspectionPackageComplete, reviewComplete, dispositionComplete, input.handoffDecisionLocked, input.noReleaseBlockersRemain].filter(Boolean).length;
  const confidence: IqiConfidence = evidenceCount === 5 ? "High" : evidenceCount >= 3 ? "Medium" : "Low";

  let recommendation: IqiRecommendation;
  if (input.findingsDispositionDecision === "Hold" || blockers.length >= 3) recommendation = "Hold";
  else if (!inspectionPackageComplete || !reviewComplete) recommendation = "Ready for completeness review";
  else if (!dispositionComplete || !input.handoffDecisionLocked) recommendation = "Ready for disposition";
  else if (readinessGateComplete) recommendation = "Ready for recon planning";
  else recommendation = "Exception";

  const positiveDrivers = [
    ...(inspectionPackageComplete ? ["Inspection package, reviewer, and identity controls are complete"] : []),
    ...(reviewComplete ? ["Completeness, safety, severity, and evidence quality passed review"] : []),
    ...(dispositionComplete ? ["Every finding has a published QC disposition and owner"] : []),
    ...(readinessGateComplete ? ["The QC package is released to recon planning"] : []),
  ].slice(0, 4);

  const negativeDrivers = [
    ...(!input.evidenceQualityApproved ? ["Evidence quality still needs approval"] : []),
    ...(!input.correctionOwnersAssigned ? ["Correction owners still need to be assigned"] : []),
    ...(!input.noReleaseBlockersRemain ? ["Release blockers still need to be cleared"] : []),
    ...(input.findingsDispositionDecision === "Hold" ? ["QC hold prevents release into planning"] : []),
    ...blockers,
  ].slice(0, 4);

  const explanation = recommendation === "Ready for recon planning"
    ? "Initial QC is complete and the package can move into recon planning."
    : recommendation === "Ready for disposition"
      ? "Review is largely complete. Finish the exact finding disposition and release decision next."
      : recommendation === "Ready for completeness review"
        ? "The inspection package still needs more QC completeness, safety, severity, or evidence review."
        : recommendation === "Exception"
          ? "QC is active, but one or more controlled decisions still need an owner."
          : "Initial QC cannot hand off until the missing package, review, and release controls are resolved.";

  return {
    blockerCount: blockers.length,
    blockers,
    confidence,
    dispositionComplete,
    explanation,
    inspectionPackageComplete,
    negativeDrivers,
    positiveDrivers,
    readinessGateComplete,
    readinessScore,
    recommendation,
    reviewComplete,
  };
}
