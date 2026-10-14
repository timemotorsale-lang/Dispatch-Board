import { salesConsoleM19ApiActivation } from "./sales-console-m19-api-activation";
import { salesConsoleM19PersistenceContract } from "./sales-console-m19-persistence-contract";
import { salesConsoleM19RepositoryTransaction } from "./sales-console-m19-repository-transaction";
import { salesConsoleM19ServiceActivation } from "./sales-console-m19-service-activation";

export const salesConsoleM19ReleaseGate = {
  milestone: "Milestone 19 — Audited Manager Review activation",
  recommendation: "Safe to review as the first controlled Sales Console write workflow.",
  activatedWorkflow: "Manager Review Request creates one audited task for a manager.",
  readyChecks: [
    {
      check: "Persistence contract approved",
      evidence: salesConsoleM19PersistenceContract.activationBoundary
    },
    {
      check: "Repository transaction implemented",
      evidence: salesConsoleM19RepositoryTransaction.writeBoundary
    },
    {
      check: "Service activation implemented",
      evidence: salesConsoleM19ServiceActivation.serviceState
    },
    {
      check: "API activation implemented",
      evidence: `${salesConsoleM19ApiActivation.method} ${salesConsoleM19ApiActivation.endpoint}`
    }
  ],
  stillBlocked: [
    "No customer messaging automation",
    "No quote submission",
    "No vehicle hold or reservation",
    "No finance decision",
    "No discount approval",
    "No CRM/DMS replacement"
  ],
  nextRecommendedMilestone: "Milestone 20 — Manager Review workbench and resolution planning"
} as const;

export function salesConsoleM19ReleaseGateActivatesOnlyManagerReview() {
  return salesConsoleM19ReleaseGate.activatedWorkflow.includes("Manager Review Request");
}

export function salesConsoleM19ReleaseGateKeepsRiskyActionsBlocked() {
  return salesConsoleM19ReleaseGate.stillBlocked.includes("No discount approval");
}

export function salesConsoleM19ReleaseGateRecommendsM20() {
  return salesConsoleM19ReleaseGate.nextRecommendedMilestone.includes("Milestone 20");
}
