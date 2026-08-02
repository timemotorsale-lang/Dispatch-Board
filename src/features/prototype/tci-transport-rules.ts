export type TciSourceLocation = "Manheim Minneapolis / Maple Grove" | "Manheim Northstar / Shakopee" | "Adesa / Dayton" | "Other source";
export type TciDriverPlan = "Internal driver" | "Driver with Uber support" | "Tow vendor" | "Carrier" | "Pending dispatch";
export type TciMobilityDecision = "Drive to dealership" | "Tow to dealership" | "Carrier to dealership" | "Assessment required";
export type TciTrackingStatus = "At source" | "Driver dispatched" | "Picked up" | "In transit" | "Delivered";
export type TciExceptionType = "None" | "Delay" | "Damage" | "No release" | "Unsafe to drive" | "Reroute";
export type TciConditionVariance = "None" | "Condition variance" | "Missing item" | "Document issue" | "Pending review";
export type TciConfidence = "High" | "Medium" | "Low";
export type TciRecommendation = "Ready to dispatch" | "Ready for release" | "Ready to move" | "In transit" | "Ready for intake" | "Exception" | "Hold";

export type TciTransportInput = {
  arrivalOdometer: number;
  arrivalPhotosCaptured: boolean;
  conditionVariance: TciConditionVariance;
  currentLocation: string;
  destinationConfirmed: boolean;
  documentsConfirmed: boolean;
  driverAssigned: boolean;
  driverPlan: TciDriverPlan;
  etaHours: number;
  exceptionResolved: boolean;
  exceptionType: TciExceptionType;
  gatePassReady: boolean;
  gateReleaseConfirmed: boolean;
  jumperReminderConfirmed: boolean;
  keysConfirmed: boolean;
  keysReceivedCount: number;
  keysTypicallyHeldByAuction: boolean;
  keysTransferredCount: number;
  mobilityDecision: TciMobilityDecision;
  oilChecked: boolean;
  pickupOdometer: number;
  pickupPerson: string;
  pickupPhotosCaptured: boolean;
  pickupSignatureCaptured: boolean;
  plateReminderConfirmed: boolean;
  receivingAccepted: boolean;
  receivingLocationConfirmed: boolean;
  routeRisk: number;
  sourceLocation: TciSourceLocation;
  towVendorConfirmed: boolean;
  trackingStatus: TciTrackingStatus;
  transportCost: number;
  uberNeeded: boolean;
  uberPlanned: boolean;
  vehicleLocatedAtSource: boolean;
  coolantChecked: boolean;
};

export type TciTransportResult = {
  blockers: string[];
  confidence: TciConfidence;
  deliveryComplete: boolean;
  explanation: string;
  negativeDrivers: string[];
  pickupComplete: boolean;
  pickupPhotosRecommended: boolean;
  planComplete: boolean;
  positiveDrivers: string[];
  recommendation: TciRecommendation;
  releaseComplete: boolean;
  sourceComplete: boolean;
  trackingComplete: boolean;
  transportScore: number;
  transportStepSummary: string;
  movementComplete: boolean;
};

const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value));
const whole = (value: number) => Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
const rating = (value: number) => clamp(Number.isFinite(value) ? value : 1, 1, 5);

export function evaluateTciTransport(raw: TciTransportInput): TciTransportResult {
  const input = {
    ...raw,
    arrivalOdometer: whole(raw.arrivalOdometer),
    etaHours: whole(raw.etaHours),
    keysReceivedCount: whole(raw.keysReceivedCount),
    keysTransferredCount: whole(raw.keysTransferredCount),
    pickupOdometer: whole(raw.pickupOdometer),
    routeRisk: rating(raw.routeRisk),
    transportCost: whole(raw.transportCost),
  };

  const sourceComplete = input.sourceLocation.length > 0 && input.vehicleLocatedAtSource && input.currentLocation.trim().length > 0;
  const releaseComplete = input.gatePassReady && input.gateReleaseConfirmed && input.documentsConfirmed;
  const planComplete = input.driverPlan !== "Pending dispatch"
    && input.driverAssigned
    && input.destinationConfirmed
    && input.etaHours > 0
    && input.transportCost >= 0
    && (!input.uberNeeded || input.uberPlanned)
    && (input.driverPlan !== "Tow vendor" && input.driverPlan !== "Carrier" || input.towVendorConfirmed);
  const movementComplete = input.mobilityDecision !== "Assessment required"
    && (input.mobilityDecision !== "Drive to dealership" || (input.oilChecked && input.coolantChecked))
    && input.jumperReminderConfirmed
    && input.plateReminderConfirmed;
  const pickupComplete = input.pickupPerson.trim().length > 0
    && input.pickupOdometer > 0
    && input.pickupSignatureCaptured
    && (input.keysTypicallyHeldByAuction ? input.keysConfirmed : input.keysReceivedCount > 0);
  const trackingComplete = input.currentLocation.trim().length > 0
    && (input.exceptionType === "None" || input.exceptionResolved);
  const deliveryComplete = input.receivingAccepted
    && input.arrivalOdometer > 0
    && input.receivingLocationConfirmed
    && input.keysTransferredCount > 0
    && input.conditionVariance !== "Pending review";
  const pickupPhotosRecommended = input.mobilityDecision === "Drive to dealership"
    && (input.driverPlan === "Internal driver" || input.driverPlan === "Driver with Uber support");

  const blockers = [
    ...(!sourceComplete ? ["Source location and exact unit position are not confirmed"] : []),
    ...(!releaseComplete ? ["Gate pass or source release is incomplete"] : []),
    ...(!planComplete ? ["Driver coordination or movement plan is incomplete"] : []),
    ...(!movementComplete ? ["Drive-or-tow readiness is incomplete"] : []),
    ...(!pickupComplete ? ["Pickup custody proof is incomplete"] : []),
    ...(!trackingComplete ? ["Location tracking or exception control is incomplete"] : []),
    ...(!deliveryComplete ? ["Receiving acceptance is incomplete"] : []),
    ...(input.exceptionType !== "None" && !input.exceptionResolved ? [`Open transportation exception: ${input.exceptionType.toLowerCase()}`] : []),
  ];

  const score = Math.round(
    (sourceComplete ? 15 : 0)
    + (releaseComplete ? 15 : 0)
    + (planComplete ? 15 : 0)
    + (movementComplete ? 15 : 0)
    + (pickupComplete ? 15 : 0)
    + (trackingComplete ? 10 : 0)
    + (deliveryComplete ? 15 : 0)
    - (input.routeRisk - 1) * 2,
  );
  const transportScore = clamp(score, 0, 100);

  const evidenceCount = [
    sourceComplete && releaseComplete,
    planComplete && movementComplete,
    pickupComplete,
    deliveryComplete && input.arrivalPhotosCaptured,
  ].filter(Boolean).length;
  const confidence: TciConfidence = evidenceCount === 4 ? "High" : evidenceCount >= 2 ? "Medium" : "Low";

  let recommendation: TciRecommendation;
  if (blockers.length >= 4) recommendation = "Hold";
  else if (input.exceptionType !== "None" && !input.exceptionResolved) recommendation = "Exception";
  else if (deliveryComplete) recommendation = "Ready for intake";
  else if (pickupComplete) recommendation = "In transit";
  else if (sourceComplete && releaseComplete && planComplete && movementComplete) recommendation = "Ready to move";
  else if (sourceComplete && releaseComplete) recommendation = "Ready to dispatch";
  else if (sourceComplete) recommendation = "Ready for release";
  else recommendation = "Hold";

  const positiveDrivers = [
    ...(input.sourceLocation !== "Other source" ? [`Source is aligned to normal auction flow: ${input.sourceLocation}`] : []),
    ...(input.mobilityDecision === "Drive to dealership" && input.oilChecked && input.coolantChecked ? ["Driver pre-trip oil and coolant checks are complete"] : []),
    ...(input.uberNeeded && input.uberPlanned ? ["Uber coordination is planned for driver movement"] : []),
    ...(input.mobilityDecision === "Tow to dealership" || input.mobilityDecision === "Carrier to dealership" ? ["Non-drivable unit is routed away from a direct drive"] : []),
    ...(pickupPhotosRecommended && input.pickupPhotosCaptured ? ["Pickup photos were captured by TMS-controlled staff"] : []),
    ...(deliveryComplete && input.conditionVariance === "None" ? ["Receiving accepted the unit without a variance"] : []),
  ].slice(0, 4);

  const negativeDrivers = [
    ...(input.driverPlan === "Pending dispatch" ? ["Driver coordination is still pending"] : []),
    ...(input.mobilityDecision === "Drive to dealership" && (!input.oilChecked || !input.coolantChecked) ? ["Driver pre-trip fluid checks are still missing"] : []),
    ...(!input.jumperReminderConfirmed || !input.plateReminderConfirmed ? ["Driver reminders for jumper or dealer plate are incomplete"] : []),
    ...(pickupPhotosRecommended && !input.pickupPhotosCaptured ? ["Pickup photos are recommended for TMS staff on direct-drive moves"] : []),
    ...(input.exceptionType !== "None" && !input.exceptionResolved ? [`${input.exceptionType} remains open and assigned`] : []),
    ...(input.routeRisk >= 4 ? ["Route risk is elevated and needs close supervision"] : []),
    ...blockers,
  ].slice(0, 4);

  const explanation = recommendation === "Ready for intake"
    ? "Transportation custody is complete and the unit can move into receiving and intake."
    : recommendation === "Exception"
      ? `Transportation is active, but ${input.exceptionType.toLowerCase()} must be resolved before the custody chain can close.`
      : recommendation === "In transit"
        ? "Pickup custody is recorded. Keep the location current until delivery is accepted."
        : recommendation === "Ready to move"
          ? "Source, release, driver coordination, and movement safety checks are complete. The unit is ready to leave the auction."
          : recommendation === "Ready to dispatch"
            ? "Source and release are confirmed. Finish driver coordination and movement safety before pickup."
            : recommendation === "Ready for release"
              ? "The unit is located. Finish gate pass and release controls next."
              : "Transportation cannot advance until the missing auction-release and movement controls are completed.";

  const completedSteps = [sourceComplete, releaseComplete, planComplete, movementComplete, pickupComplete, deliveryComplete].filter(Boolean).length;

  return {
    blockers,
    confidence,
    deliveryComplete,
    explanation,
    movementComplete,
    negativeDrivers,
    pickupComplete,
    pickupPhotosRecommended,
    planComplete,
    positiveDrivers,
    recommendation,
    releaseComplete,
    sourceComplete,
    trackingComplete,
    transportScore,
    transportStepSummary: `${completedSteps} of 6 custody controls complete`,
  };
}
