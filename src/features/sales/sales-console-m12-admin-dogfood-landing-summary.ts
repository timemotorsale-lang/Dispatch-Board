import { salesConsoleM12EveryRoleHasEmptyAndPlannedState, salesConsoleM12PlannedStatesKeepRiskyActionsDisabled } from "./sales-console-m12-role-empty-planned-states";
import { salesConsoleM12EveryLandingHeaderTargetsInternalSection, salesConsoleM12LandingHeaderStaysReadOnly } from "./sales-console-m12-role-landing-header";
import { salesConsoleM12EveryRoleHasLandingExperience, salesConsoleM12RoleLandingsStayInsideSales } from "./sales-console-m12-role-landing-model";
import { salesConsoleM12StartCardsCoverEveryLanding, salesConsoleM12StartCardsRemainReadOnly } from "./sales-console-m12-role-start-cards";

export const salesConsoleM12AdminDogfoodLandingSummary = {
  dogfoodReadinessEstimate: 91,
  gate: "role landing experience review",
  recommendation: "Role-specific landing experiences are ready for owner/admin review inside /sales. Keep separate role routes deferred until CRM, advertising, and marketing console boundaries are clearer.",
  remainingBeforeDogfood: [
    "Verify the active staff account role maps to the expected landing orientation.",
    "Confirm source links open expected CRM/customer/task/vehicle records in the target environment.",
    "Confirm planned/read-only controls are understandable to staff."
  ]
} as const;

export function salesConsoleM12AdminLandingSummaryPasses() {
  return salesConsoleM12EveryRoleHasLandingExperience() &&
    salesConsoleM12RoleLandingsStayInsideSales() &&
    salesConsoleM12LandingHeaderStaysReadOnly() &&
    salesConsoleM12EveryLandingHeaderTargetsInternalSection() &&
    salesConsoleM12StartCardsCoverEveryLanding() &&
    salesConsoleM12StartCardsRemainReadOnly() &&
    salesConsoleM12EveryRoleHasEmptyAndPlannedState() &&
    salesConsoleM12PlannedStatesKeepRiskyActionsDisabled();
}

export function salesConsoleM12SeparateRoutesRemainDeferred() {
  return salesConsoleM12AdminDogfoodLandingSummary.recommendation.includes("separate role routes deferred");
}
