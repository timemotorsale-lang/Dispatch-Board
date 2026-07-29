import { salesConsoleM18ApiRouteGuarded } from "./sales-console-m18-api-route-guarded";
import { salesConsoleM18AuditIdempotencyReadiness } from "./sales-console-m18-audit-idempotency-readiness";
import { salesConsoleM18BackendContract } from "./sales-console-m18-backend-contract";
import { salesConsoleM18ServerValidation } from "./sales-console-m18-server-validation";

export const salesConsoleM18ReleaseGate = {
  milestone: "Milestone 18 — Manager Review backend foundation",
  recommendation: "Safe to review, but do not activate live manager-review persistence yet.",
  readyChecks: [
    {
      check: "Dedicated backend contract exists",
      evidence: `${salesConsoleM18BackendContract.method} ${salesConsoleM18BackendContract.endpoint}`
    },
    {
      check: "Server validation exists",
      evidence: salesConsoleM18ServerValidation.headline
    },
    {
      check: "Guarded API route exists",
      evidence: `${salesConsoleM18ApiRouteGuarded.routeStatus}, response ${salesConsoleM18ApiRouteGuarded.responseStatus}`
    },
    {
      check: "Audit and idempotency readiness exists",
      evidence: salesConsoleM18AuditIdempotencyReadiness.mergeGate
    }
  ],
  blockedBeforeActivation: [
    "No live manager-review task persistence",
    "No audit event storage",
    "No idempotency-key lookup store",
    "No customer messaging",
    "No quote submission",
    "No vehicle hold or reservation",
    "No finance decision",
    "No discount approval"
  ],
  nextRecommendedMilestone: "Milestone 19 — Audited Manager Review persistence and idempotency store"
} as const;

export function salesConsoleM18ReleaseGateHasBackendFoundation() {
  return salesConsoleM18ReleaseGate.readyChecks.length === 4;
}

export function salesConsoleM18ReleaseGateBlocksRiskyActions() {
  return salesConsoleM18ReleaseGate.blockedBeforeActivation.includes("No discount approval");
}

export function salesConsoleM18ReleaseGateRecommendsM19() {
  return salesConsoleM18ReleaseGate.nextRecommendedMilestone.includes("Milestone 19");
}
