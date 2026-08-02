export type RbiLocation = "Receiving lane" | "Front lot" | "Service drive" | "Outside storage" | "Off-site lot";
export type RbiFuelState = "Empty" | "Low" | "Quarter" | "Half" | "Three quarters" | "Full" | "Unknown";
export type RbiChargeState = "0-10%" | "11-25%" | "26-50%" | "51-75%" | "76-100%" | "N/A";
export type RbiVarianceSeverity = "None" | "Minor" | "Moderate" | "Major" | "Critical";
export type RbiCustodyDecision = "Accepted" | "Conditional hold" | "Disputed" | "Pending review";
export type RbiRecommendation = "Ready for baseline" | "Ready for intake" | "Exception" | "Hold";
export type RbiConfidence = "High" | "Medium" | "Low";

export type RbiReceivingInput = {
  acceptedKeysCount: number;
  arrivalOdometer: number;
  chargeState: RbiChargeState;
  conditionVarianceFound: boolean;
  custodyDecision: RbiCustodyDecision;
  documentsReceived: boolean;
  enginePhotoCaptured: boolean;
  exteriorPhotosCaptured: boolean;
  fuelState: RbiFuelState;
  interiorPhotosCaptured: boolean;
  keysCountMatchesTransport: boolean;
  locationConfirmed: boolean;
  locationPlaced: RbiLocation;
  photoVarianceCaptured: boolean;
  pickupVsArrivalCompared: boolean;
  releasingPartyRecorded: boolean;
  varianceAssigned: boolean;
  varianceNoteRecorded: boolean;
  varianceSeverity: RbiVarianceSeverity;
  vinDashPhotoCaptured: boolean;
  vinMatched: boolean;
  vinScanned: boolean;
};

export type RbiReceivingResult = {
  arrivalFactsComplete: boolean;
  baselinePhotosComplete: boolean;
  blockers: string[];
  confidence: RbiConfidence;
  custodyAccepted: boolean;
  explanation: string;
  negativeDrivers: string[];
  positiveDrivers: string[];
  readinessScore: number;
  recommendation: RbiRecommendation;
  varianceControlled: boolean;
  vinComplete: boolean;
};

const whole = (value: number) => Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;

export function evaluateRbiReceiving(raw: RbiReceivingInput): RbiReceivingResult {
  const input = {
    ...raw,
    acceptedKeysCount: whole(raw.acceptedKeysCount),
    arrivalOdometer: whole(raw.arrivalOdometer),
  };

  const vinComplete = input.vinScanned && input.vinMatched;
  const arrivalFactsComplete = input.arrivalOdometer > 0
    && input.locationConfirmed
    && input.releasingPartyRecorded
    && input.documentsReceived
    && input.acceptedKeysCount > 0;
  const baselinePhotosComplete = input.vinDashPhotoCaptured
    && input.exteriorPhotosCaptured
    && input.interiorPhotosCaptured
    && input.enginePhotoCaptured;
  const varianceControlled = input.pickupVsArrivalCompared
    && (!input.conditionVarianceFound || (input.varianceNoteRecorded && input.photoVarianceCaptured && input.varianceAssigned && input.varianceSeverity !== "None"));
  const custodyAccepted = input.custodyDecision === "Accepted" || input.custodyDecision === "Conditional hold";

  const blockers = [
    ...(!vinComplete ? ["VIN scan and match are incomplete"] : []),
    ...(!arrivalFactsComplete ? ["Arrival facts are incomplete"] : []),
    ...(!baselinePhotosComplete ? ["Baseline photo set is incomplete"] : []),
    ...(!varianceControlled ? ["Pickup-to-arrival variance control is incomplete"] : []),
    ...(!custodyAccepted ? ["Receiving custody decision is incomplete"] : []),
    ...(input.custodyDecision === "Disputed" ? ["Custody is disputed and cannot move forward"] : []),
  ];

  const readinessScore = Math.max(0, Math.min(100, Math.round(
    (vinComplete ? 18 : 0)
    + (arrivalFactsComplete ? 20 : 0)
    + (baselinePhotosComplete ? 22 : 0)
    + (varianceControlled ? 20 : 0)
    + (custodyAccepted ? 20 : 0),
  )));

  const evidenceCount = [vinComplete, arrivalFactsComplete, baselinePhotosComplete, varianceControlled, custodyAccepted].filter(Boolean).length;
  const confidence: RbiConfidence = evidenceCount === 5 ? "High" : evidenceCount >= 3 ? "Medium" : "Low";

  let recommendation: RbiRecommendation;
  if (input.custodyDecision === "Disputed") recommendation = "Hold";
  else if (blockers.length >= 3) recommendation = "Hold";
  else if (input.conditionVarianceFound && input.varianceSeverity !== "None") recommendation = "Exception";
  else if (vinComplete && arrivalFactsComplete && baselinePhotosComplete && varianceControlled && custodyAccepted) recommendation = "Ready for intake";
  else if (vinComplete && arrivalFactsComplete) recommendation = "Ready for baseline";
  else recommendation = "Hold";

  const positiveDrivers = [
    ...(vinComplete ? ["VIN identity is matched to prior stages"] : []),
    ...(arrivalFactsComplete ? ["Arrival facts, keys, documents, and releasing party are recorded"] : []),
    ...(baselinePhotosComplete ? ["Receiving baseline photos are complete"] : []),
    ...(varianceControlled && !input.conditionVarianceFound ? ["Pickup-to-arrival comparison found no variance"] : []),
    ...(custodyAccepted && input.custodyDecision === "Accepted" ? ["Receiving accepted accountable custody"] : []),
  ].slice(0, 4);

  const negativeDrivers = [
    ...(!baselinePhotosComplete ? ["Receiving still needs the full baseline photo set"] : []),
    ...(input.conditionVarianceFound && !input.photoVarianceCaptured ? ["Variance photos are still missing"] : []),
    ...(input.conditionVarianceFound && !input.varianceAssigned ? ["Variance owner is not assigned yet"] : []),
    ...(input.custodyDecision === "Conditional hold" ? ["Receiving accepted the unit with a conditional hold"] : []),
    ...blockers,
  ].slice(0, 4);

  const explanation = recommendation === "Ready for intake"
    ? "Receiving baseline is complete and the unit can move into governed intake."
    : recommendation === "Exception"
      ? "Receiving found a condition or custody variance that needs a controlled owner before intake."
      : recommendation === "Ready for baseline"
        ? "Identity and arrival facts are recorded. Complete the baseline photo and variance controls next."
        : "Receiving cannot hand off until the missing baseline controls are completed.";

  return {
    arrivalFactsComplete,
    baselinePhotosComplete,
    blockers,
    confidence,
    custodyAccepted,
    explanation,
    negativeDrivers,
    positiveDrivers,
    readinessScore,
    recommendation,
    varianceControlled,
    vinComplete,
  };
}
