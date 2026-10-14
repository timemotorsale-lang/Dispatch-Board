import type { AuthenticatedUser } from "@/server/auth/store";
import { resolveUnifiedCrmWorkspace } from "@/server/policies/unified-crm-access";
import {
  UNIFIED_CRM_RELIABILITY_VERIFICATION_CONTRACT_VERSION,
  UnifiedCrmReliabilityVerificationError,
  type UnifiedCrmReliabilityVerificationCheck,
  type UnifiedCrmReliabilityVerificationReadModel
} from "@/server/unified-crm/reliability-verification-contract";

type Dependencies = {
  now?: () => Date;
};

const CHECKS: UnifiedCrmReliabilityVerificationCheck[] = [
  {
    category: "staleWrites",
    evidence: "Opportunity transitions, quote drafting, commercial approvals, dispatch bridges, and forecast submissions require expected versions and fail closed on conflicts.",
    holdOwner: null,
    status: "PASS"
  },
  {
    category: "idempotencyReuse",
    evidence: "CRM write paths persist command request hashes and reject reused idempotency keys with different payloads.",
    holdOwner: null,
    status: "PASS"
  },
  {
    category: "transactionFailure",
    evidence: "Repository transactions are covered for core writes, but fault-injection rollback evidence must be rerun on the release candidate.",
    holdOwner: "engineering",
    status: "HOLD"
  },
  {
    category: "retries",
    evidence: "Typed retryable flags exist on source-unavailable errors; automated retry policy proof remains a release-candidate hold.",
    holdOwner: "engineering",
    status: "HOLD"
  },
  {
    category: "projectionLag",
    evidence: "Dashboard/search/read models expose freshness timestamps; lag SLO proof remains a release-candidate hold.",
    holdOwner: "engineering",
    status: "HOLD"
  },
  {
    category: "unavailableDependencies",
    evidence: "Routes map unavailable CRM dependencies to safe typed envelopes; dependency chaos proof remains a release-candidate hold.",
    holdOwner: "engineering",
    status: "HOLD"
  },
  {
    category: "jobLeases",
    evidence: "No CRM background job lease has been enabled for the current CRM release slice; lease proof is held until background CRM jobs are activated.",
    holdOwner: "engineering",
    status: "HOLD"
  },
  {
    category: "recoveryBehavior",
    evidence: "Pilot data load rehearsal reports backup/restore timing estimates; actual recovery rehearsal remains a release-candidate hold.",
    holdOwner: "operations",
    status: "HOLD"
  }
];

export async function getUnifiedCrmReliabilityVerification(
  actor: AuthenticatedUser | null,
  dependencies: Dependencies = {}
): Promise<UnifiedCrmReliabilityVerificationReadModel> {
  if (!actor) {
    throw new UnifiedCrmReliabilityVerificationError("AUTHENTICATION_REQUIRED", "Sign in before opening CRM reliability verification.");
  }
  if (resolveUnifiedCrmWorkspace(actor) !== "MANAGEMENT") {
    throw new UnifiedCrmReliabilityVerificationError(
      "RELIABILITY_VERIFICATION_NOT_AUTHORIZED",
      "CRM reliability verification is available to the manager workspace."
    );
  }
  const checks = CHECKS.map((check) => ({ ...check }));
  return {
    checks,
    contractVersion: UNIFIED_CRM_RELIABILITY_VERIFICATION_CONTRACT_VERSION,
    generatedAt: (dependencies.now?.() ?? new Date()).toISOString(),
    state: checks.some((check) => check.status === "HOLD") ? "HELD" : "PASS",
    visibility: "management"
  };
}
