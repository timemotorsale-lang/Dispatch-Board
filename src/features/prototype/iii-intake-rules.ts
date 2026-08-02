export type IiiRetailPath = "Frontline retail" | "Wholesale" | "Pending decision";
export type IiiPriority = "Standard" | "Priority" | "Hot";
export type IiiRequestedEvaluation = "Inspection only" | "Full recon" | "Safety first" | "Pending";
export type IiiSafetyDecision = "Clear" | "Review required" | "Hold";
export type IiiRecommendation = "Ready for safety review" | "Ready for objective" | "Ready for inspection" | "Exception" | "Hold";
export type IiiConfidence = "High" | "Medium" | "Low";

export type IiiIntakeInput = {
  canonicalVehicleLinked: boolean;
  currentCustodianRecorded: boolean;
  currentLocationRecorded: boolean;
  decodedFactsReviewed: boolean;
  duplicateCheckClear: boolean;
  frontlineTargetConfirmed: boolean;
  intakeNotesRecorded: boolean;
  inventoryOwnerConfirmed: boolean;
  inventoryUnitCreated: boolean;
  keysOnHandConfirmed: boolean;
  priority: IiiPriority;
  recallCampaignReviewed: boolean;
  requestedEvaluation: IiiRequestedEvaluation;
  retailPath: IiiRetailPath;
  safetyDecision: IiiSafetyDecision;
  safetyWarningsReviewed: boolean;
  stockNumberAssigned: boolean;
  targetFrontlineDateRecorded: boolean;
  vinVerificationReviewed: boolean;
};

export type IiiIntakeResult = {
  blockers: string[];
  canonicalComplete: boolean;
  confidence: IiiConfidence;
  custodyComplete: boolean;
  explanation: string;
  negativeDrivers: string[];
  objectiveComplete: boolean;
  positiveDrivers: string[];
  readinessGateComplete: boolean;
  recommendation: IiiRecommendation;
  readinessScore: number;
  safetyComplete: boolean;
};

export function evaluateIiiIntake(input: IiiIntakeInput): IiiIntakeResult {
  const canonicalComplete = input.canonicalVehicleLinked
    && input.inventoryUnitCreated
    && input.stockNumberAssigned
    && input.duplicateCheckClear;
  const decodedComplete = input.decodedFactsReviewed;
  const safetyComplete = input.recallCampaignReviewed
    && input.vinVerificationReviewed
    && input.safetyWarningsReviewed
    && input.safetyDecision !== "Review required";
  const objectiveComplete = input.retailPath !== "Pending decision"
    && input.requestedEvaluation !== "Pending"
    && input.targetFrontlineDateRecorded
    && input.frontlineTargetConfirmed
    && input.intakeNotesRecorded;
  const custodyComplete = input.currentLocationRecorded
    && input.currentCustodianRecorded
    && input.keysOnHandConfirmed
    && input.inventoryOwnerConfirmed;
  const readinessGateComplete = canonicalComplete
    && decodedComplete
    && safetyComplete
    && objectiveComplete
    && custodyComplete
    && input.safetyDecision !== "Hold";

  const blockers = [
    ...(!canonicalComplete ? ["Canonical vehicle linkage is incomplete"] : []),
    ...(!decodedComplete ? ["Decoded vehicle facts are not reviewed"] : []),
    ...(!safetyComplete ? ["Safety intelligence review is incomplete"] : []),
    ...(!objectiveComplete ? ["Inventory objective is incomplete"] : []),
    ...(!custodyComplete ? ["Location, custody, or ownership facts are incomplete"] : []),
    ...(input.safetyDecision === "Hold" ? ["Safety intelligence placed the unit on hold"] : []),
  ];

  const readinessScore = Math.max(0, Math.min(100, Math.round(
    (canonicalComplete ? 24 : 0)
    + (decodedComplete ? 14 : 0)
    + (safetyComplete ? 20 : 0)
    + (objectiveComplete ? 20 : 0)
    + (custodyComplete ? 22 : 0),
  )));

  const evidenceCount = [canonicalComplete, decodedComplete, safetyComplete, objectiveComplete, custodyComplete].filter(Boolean).length;
  const confidence: IiiConfidence = evidenceCount === 5 ? "High" : evidenceCount >= 3 ? "Medium" : "Low";

  let recommendation: IiiRecommendation;
  if (input.safetyDecision === "Hold") recommendation = "Hold";
  else if (blockers.length >= 3) recommendation = "Hold";
  else if (!canonicalComplete || !decodedComplete) recommendation = "Ready for safety review";
  else if (!objectiveComplete || !custodyComplete) recommendation = "Ready for objective";
  else if (readinessGateComplete) recommendation = "Ready for inspection";
  else recommendation = "Exception";

  const positiveDrivers = [
    ...(canonicalComplete ? ["Canonical vehicle, unit, stock, and duplicate controls are aligned"] : []),
    ...(decodedComplete ? ["Decoded year, make, model, trim, and factory facts were reviewed"] : []),
    ...(safetyComplete ? ["Recall, VIN verification, and safety warnings were classified"] : []),
    ...(objectiveComplete ? [`Inventory objective is set to ${input.retailPath.toLowerCase()}`] : []),
    ...(custodyComplete ? ["Location, custodian, keys, and owner facts are current"] : []),
  ].slice(0, 4);

  const negativeDrivers = [
    ...(input.retailPath === "Pending decision" ? ["Retail or wholesale path is still undecided"] : []),
    ...(input.requestedEvaluation === "Pending" ? ["Requested evaluation is still pending"] : []),
    ...(input.safetyDecision === "Review required" ? ["Safety review still needs a clear or hold decision"] : []),
    ...(input.safetyDecision === "Hold" ? ["Safety hold prevents movement into inspection"] : []),
    ...blockers,
  ].slice(0, 4);

  const explanation = recommendation === "Ready for inspection"
    ? "Canonical intake is complete and the unit can move into governed inspection."
    : recommendation === "Ready for objective"
      ? "Identity and safety controls are mostly set. Finish the inventory objective and custody facts next."
      : recommendation === "Ready for safety review"
        ? "Canonical linkage and decoded facts need to be locked before the intake gate can fully open."
        : recommendation === "Exception"
          ? "Intake is active, but one or more controlled facts still need an owner before inspection."
          : "Intake cannot hand off until the missing canonical and safety controls are completed.";

  return {
    blockers,
    canonicalComplete,
    confidence,
    custodyComplete,
    explanation,
    negativeDrivers,
    objectiveComplete,
    positiveDrivers,
    readinessGateComplete,
    recommendation,
    readinessScore,
    safetyComplete,
  };
}
