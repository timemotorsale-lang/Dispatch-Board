export type IgiRoadTestDecision = "Not required" | "Required" | "Unsafe";
export type IgiFindingDecision = "Draft" | "Published" | "Hold";
export type IgiRecommendation = "Ready for mechanical inspection" | "Ready for findings" | "Ready for Initial QC" | "Exception" | "Hold";
export type IgiConfidence = "High" | "Medium" | "Low";

export type IgiInspectionInput = {
  bodyworkChecklistComplete: boolean;
  bodyworkConditionReviewed: boolean;
  cosmeticConditionReviewed: boolean;
  criticalWarningsReviewed: boolean;
  diagnosticScanCaptured: boolean;
  equipmentReviewed: boolean;
  findingsStructured: boolean;
  findingsVersionLocked: boolean;
  identityMatchedToIntake: boolean;
  mechanicalChecklistComplete: boolean;
  merchandisingConditionReviewed: boolean;
  mobilitySafe: boolean;
  recallAndSafetyFlagsReviewed: boolean;
  roadTestCompleted: boolean;
  roadTestDecision: IgiRoadTestDecision;
  roadTestNotesRecorded: boolean;
  safetyCheckComplete: boolean;
  severityAssigned: boolean;
  triageOwnerAssigned: boolean;
  warningLightsRecorded: boolean;
};

export type IgiInspectionResult = {
  blockerCount: number;
  blockers: string[];
  confidence: IgiConfidence;
  explanation: string;
  findingsComplete: boolean;
  identityAndSafetyComplete: boolean;
  mechanicalComplete: boolean;
  negativeDrivers: string[];
  positiveDrivers: string[];
  readinessGateComplete: boolean;
  readinessScore: number;
  recommendation: IgiRecommendation;
  roadTestComplete: boolean;
};

export function evaluateIgiInspection(input: IgiInspectionInput): IgiInspectionResult {
  const identityAndSafetyComplete = input.identityMatchedToIntake
    && input.safetyCheckComplete
    && input.criticalWarningsReviewed
    && input.recallAndSafetyFlagsReviewed
    && input.mobilitySafe;

  const mechanicalComplete = input.mechanicalChecklistComplete
    && input.bodyworkChecklistComplete
    && input.diagnosticScanCaptured
    && input.warningLightsRecorded;

  const roadTestComplete = input.roadTestDecision === "Not required"
    || (input.roadTestDecision === "Required" && input.roadTestCompleted && input.roadTestNotesRecorded);

  const findingsComplete = input.cosmeticConditionReviewed
    && input.bodyworkConditionReviewed
    && input.equipmentReviewed
    && input.merchandisingConditionReviewed
    && input.findingsStructured
    && input.severityAssigned
    && input.triageOwnerAssigned
    && input.findingsVersionLocked
    && input.roadTestDecision !== "Unsafe";

  const readinessGateComplete = identityAndSafetyComplete
    && mechanicalComplete
    && roadTestComplete
    && findingsComplete
    && input.roadTestDecision !== "Unsafe";

  const blockers = [
    ...(!identityAndSafetyComplete ? ["Identity or safety pre-check is incomplete"] : []),
    ...(!mechanicalComplete ? ["Mechanical inspection or diagnostic evidence is incomplete"] : []),
    ...(!roadTestComplete ? ["Road test evidence is incomplete"] : []),
    ...(!findingsComplete ? ["Structured findings are incomplete"] : []),
    ...(input.roadTestDecision === "Unsafe" ? ["Unsafe-to-move decision keeps the unit out of Initial QC"] : []),
  ];

  const readinessScore = Math.max(0, Math.min(100, Math.round(
    (identityAndSafetyComplete ? 26 : 0)
    + (mechanicalComplete ? 26 : 0)
    + (roadTestComplete ? 18 : 0)
    + (findingsComplete ? 30 : 0),
  )));

  const evidenceCount = [identityAndSafetyComplete, mechanicalComplete, roadTestComplete, findingsComplete].filter(Boolean).length;
  const confidence: IgiConfidence = evidenceCount === 4 ? "High" : evidenceCount >= 2 ? "Medium" : "Low";

  let recommendation: IgiRecommendation;
  if (input.roadTestDecision === "Unsafe" || blockers.length >= 3) recommendation = "Hold";
  else if (!identityAndSafetyComplete || !mechanicalComplete) recommendation = "Ready for mechanical inspection";
  else if (!findingsComplete || !roadTestComplete) recommendation = "Ready for findings";
  else if (readinessGateComplete) recommendation = "Ready for Initial QC";
  else recommendation = "Exception";

  const positiveDrivers = [
    ...(identityAndSafetyComplete ? ["Identity, warnings, recalls, and safe-to-move controls are complete"] : []),
    ...(mechanicalComplete ? ["Mechanical, bodywork, and scan evidence were captured"] : []),
    ...(roadTestComplete ? ["Road test requirement is satisfied"] : []),
    ...(findingsComplete ? ["Structured findings and triage decisions are locked"] : []),
  ].slice(0, 4);

  const negativeDrivers = [
    ...(input.roadTestDecision === "Unsafe" ? ["Unsafe-to-move inspection result blocks QC handoff"] : []),
    ...(!input.diagnosticScanCaptured ? ["Diagnostic scan still needs to be attached"] : []),
    ...(!input.bodyworkConditionReviewed ? ["Bodywork review still needs to be recorded"] : []),
    ...(!input.findingsStructured ? ["Findings still need structured publication"] : []),
    ...blockers,
  ].slice(0, 4);

  const explanation = recommendation === "Ready for Initial QC"
    ? "Inspection evidence is complete and the unit can move into Initial QC."
    : recommendation === "Ready for findings"
      ? "Mechanical inspection is largely complete. Finish road-test and findings publication next."
      : recommendation === "Ready for mechanical inspection"
        ? "Identity, safety, and mechanical controls still need more evidence before QC can begin."
        : recommendation === "Exception"
          ? "Inspection is active, but one or more controlled decisions still need an owner."
          : "Inspection cannot hand off until safety, movement, and structured findings are fully controlled.";

  return {
    blockerCount: blockers.length,
    blockers,
    confidence,
    explanation,
    findingsComplete,
    identityAndSafetyComplete,
    mechanicalComplete,
    negativeDrivers,
    positiveDrivers,
    readinessGateComplete,
    readinessScore,
    recommendation,
    roadTestComplete,
  };
}
