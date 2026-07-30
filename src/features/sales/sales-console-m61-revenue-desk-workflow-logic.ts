import {
  getRevenueLaneContract,
  salesConsoleRevenueLaneNames,
  type SalesConsoleRevenueLaneName
} from "./sales-console-operational-domain";

export type SalesRevenueDeskInput = {
  lane: SalesConsoleRevenueLaneName;
  stage: string;
  completedFields: string[];
  blockerCodes: string[];
  customerReady: boolean;
  sourceVerified: boolean;
  managerReviewOpen: boolean;
};

export type SalesRevenueDeskDecision = {
  lane: SalesConsoleRevenueLaneName;
  missingFields: string[];
  nextAction: string;
  managerReviewRequired: boolean;
  sourceSystemHandoff: string[];
  governedActions: string[];
  canAdvanceInsideSalesConsole: boolean;
};

export function evaluateSalesRevenueDeskWorkflow(input: SalesRevenueDeskInput): SalesRevenueDeskDecision {
  const contract = getRevenueLaneContract(input.lane);
  const requiredFields = contract?.requiredFields ?? [];
  const missingFields = requiredFields.filter((field) => !input.completedFields.includes(field));
  const governedActions = contract?.governedActions ?? [];
  const sourceSystemHandoff = contract?.sourceOwners.filter((owner) => owner !== "Sales Console") ?? [];
  const managerReviewRequired =
    input.managerReviewOpen ||
    input.blockerCodes.length > 0 ||
    !input.sourceVerified ||
    ["Inventory BHPH Sale", "Inventory Lease-to-Own", "Financing Product", "Warranty Product"].includes(input.lane);

  const nextAction = missingFields.length
    ? `Complete ${missingFields[0]}`
    : !input.sourceVerified
      ? "Verify source records before staff action"
      : managerReviewRequired
        ? "Request or review manager guidance"
        : input.customerReady
          ? "Prepare source-system handoff"
          : "Confirm customer readiness";

  return {
    lane: input.lane,
    missingFields,
    nextAction,
    managerReviewRequired,
    sourceSystemHandoff,
    governedActions,
    canAdvanceInsideSalesConsole: missingFields.length === 0 && input.sourceVerified && !managerReviewRequired
  };
}

export function salesRevenueDeskCoversEveryLane() {
  return salesConsoleRevenueLaneNames.every((lane) =>
    Boolean(
      evaluateSalesRevenueDeskWorkflow({
        lane,
        stage: "New",
        completedFields: [],
        blockerCodes: [],
        customerReady: false,
        sourceVerified: false,
        managerReviewOpen: false
      })
    )
  );
}
