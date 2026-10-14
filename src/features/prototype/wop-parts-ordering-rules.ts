export type WopPartsSourceType =
  | "Stock"
  | "Local aftermarket"
  | "OEM dealer"
  | "Used / recycled"
  | "Autobody / paint"
  | "Special order";

export type WopPartsUrgency = "Required to start work" | "Required before final QC" | "Advisory";
export type WopPartsRecommendation = "Create demand" | "Source parts" | "Approve supplement" | "Receive and match" | "Ready for repair" | "Exception";

export type WopPartsOrderingInput = {
  demandCreated: boolean;
  etaConfirmed: boolean;
  fitmentConfirmed: boolean;
  linkedJobConfirmed: boolean;
  orderPlaced: boolean;
  quantityConfirmed: boolean;
  quantityMatched: boolean;
  readyForRepairConfirmed: boolean;
  received: boolean;
  revisedWorkOrderTotalDollars: number;
  sourceCommitted: boolean;
  sourceType: WopPartsSourceType;
  supplementApproved: boolean;
  urgentExceptionUsed: boolean;
  urgency: WopPartsUrgency;
  vendorQuoteCaptured: boolean;
  visibleDamageClear: boolean;
};

export type WopPartsOrderingResult = {
  approvalComplete: boolean;
  blockerCount: number;
  blockers: string[];
  confidence: "Low" | "Medium" | "High";
  demandComplete: boolean;
  explanation: string;
  positiveDrivers: string[];
  readinessComplete: boolean;
  recommendation: WopPartsRecommendation;
  receivingComplete: boolean;
  sourcingComplete: boolean;
  supplementRequired: boolean;
};

export function evaluateWopPartsOrdering(input: WopPartsOrderingInput, approvedBudgetDollars: number): WopPartsOrderingResult {
  const demandComplete = input.demandCreated && input.linkedJobConfirmed && input.quantityConfirmed;
  const sourcingComplete = input.sourceCommitted
    && input.vendorQuoteCaptured
    && input.etaConfirmed
    && (input.sourceType === "Stock" || input.orderPlaced);
  const supplementRequired = input.revisedWorkOrderTotalDollars > approvedBudgetDollars;
  const approvalComplete = !supplementRequired || input.supplementApproved || input.urgentExceptionUsed;
  const receivingComplete = input.received && input.quantityMatched && input.fitmentConfirmed && input.visibleDamageClear;
  const readinessComplete = demandComplete && sourcingComplete && approvalComplete && receivingComplete && input.readyForRepairConfirmed;

  const blockers = [
    ...(!demandComplete ? ["Parts demand still needs a linked job, quantity, and controlled request line"] : []),
    ...(!sourcingComplete ? ["Source, quote, order or reservation, and ETA are still incomplete"] : []),
    ...(supplementRequired && !input.supplementApproved && !input.urgentExceptionUsed ? ["Revised work-order total exceeds the approved plan and needs supplement approval"] : []),
    ...(!receivingComplete ? ["Received quantity, fitment, or condition match is still incomplete"] : []),
    ...(!input.readyForRepairConfirmed ? ["Parts are not yet marked ready for technician use"] : []),
  ];

  let recommendation: WopPartsRecommendation = "Create demand";
  if (input.sourceType === "Special order" && !input.etaConfirmed) recommendation = "Exception";
  else if (!demandComplete) recommendation = "Create demand";
  else if (!sourcingComplete) recommendation = "Source parts";
  else if (!approvalComplete) recommendation = "Approve supplement";
  else if (!receivingComplete || !input.readyForRepairConfirmed) recommendation = "Receive and match";
  else recommendation = "Ready for repair";

  const positiveDrivers = [
    ...(demandComplete ? ["Parts demand is tied to an exact repair job and quantity"] : []),
    ...(sourcingComplete ? [`${input.sourceType} path is sourced with quote and ETA preserved`] : []),
    ...(approvalComplete ? [supplementRequired ? "Supplement control has been resolved for the revised total" : "No supplement approval is required for the current parts path"] : []),
    ...(receivingComplete ? ["Received parts match quantity, fitment, and condition requirements"] : []),
    ...(input.readyForRepairConfirmed ? ["Parts are marked ready for technician use"] : []),
  ];

  const confidence = blockers.length <= 1 ? "High" : blockers.length <= 3 ? "Medium" : "Low";
  const explanation = recommendation === "Ready for repair"
    ? "Parts demand, sourcing, approval, receipt, and repair readiness are all controlled."
    : recommendation === "Approve supplement"
      ? "Parts sourcing is known, but the revised work-order total needs controlled approval."
      : recommendation === "Receive and match"
        ? "Ordering is complete. Match the physical parts before repair begins."
        : recommendation === "Exception"
          ? "Special-order parts still need an ETA or exception handling before readiness can be trusted."
          : recommendation === "Source parts"
            ? "Create the sourcing plan, preserve the quote, and commit the order or reservation."
            : "Create the exact parts demand before any sourcing decision can be trusted.";

  return {
    approvalComplete,
    blockerCount: blockers.length,
    blockers,
    confidence,
    demandComplete,
    explanation,
    positiveDrivers,
    readinessComplete,
    recommendation,
    receivingComplete,
    sourcingComplete,
    supplementRequired,
  };
}
