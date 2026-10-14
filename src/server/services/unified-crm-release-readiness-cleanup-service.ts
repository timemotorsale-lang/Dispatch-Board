import type { AuthenticatedUser } from "@/server/auth/store";
import { resolveUnifiedCrmWorkspace } from "@/server/policies/unified-crm-access";
import {
  UNIFIED_CRM_RELEASE_READINESS_CLEANUP_CONTRACT_VERSION,
  UnifiedCrmReleaseReadinessCleanupError,
  type UnifiedCrmReleaseReadinessCleanupItem,
  type UnifiedCrmReleaseReadinessCleanupReadModel
} from "@/server/unified-crm/release-readiness-cleanup-contract";

type Dependencies = { now?: () => Date };

const ITEMS: UnifiedCrmReleaseReadinessCleanupItem[] = [
  {
    id: "focused-tests-typecheck",
    area: "REGRESSION",
    state: "PASS",
    title: "Focused milestone tests and typecheck",
    evidence: "UCRM-108 through UCRM-126 focused tests and TypeScript checks passed at checkpoint commits.",
    requiredBeforeRelease: null
  },
  {
    id: "browser-proof-held",
    area: "REGRESSION",
    state: "HELD",
    title: "Authenticated browser/UX proof",
    evidence: "Most milestones remain IMPLEMENTED_UNVERIFIED because authenticated browser review has not been completed on the release candidate.",
    requiredBeforeRelease: "Run manager/staff browser walkthroughs for CRM Home, Customer 360, opportunities, quotes, communications/admin readiness, and fallbacks."
  },
  {
    id: "accessibility-held",
    area: "ACCESSIBILITY",
    state: "HELD",
    title: "Release-candidate accessibility proof",
    evidence: "Focused component accessibility expectations exist, but full keyboard/mobile/screen-reader proof is still pending.",
    requiredBeforeRelease: "Complete WCAG-focused release candidate review and record defects/fixes."
  },
  {
    id: "fallback-pass",
    area: "FALLBACK",
    state: "PASS",
    title: "Existing console fallback preserved",
    evidence: "CRM readiness gates retain fallbacks to existing Dispatch Board, Customers, Sales, manual communication, manual document, and manual accounting workflows.",
    requiredBeforeRelease: null
  },
  {
    id: "rollback-held",
    area: "ROLLBACK",
    state: "HELD",
    title: "Rollback rehearsal not completed",
    evidence: "Rollback runbooks and gates exist, but the release-candidate rollback rehearsal has not been executed with owner acceptance.",
    requiredBeforeRelease: "Run rollback rehearsal against the exact release candidate and record owner approval."
  },
  {
    id: "business-decisions-held",
    area: "BUSINESS_DECISION",
    state: "HELD",
    title: "Provider and pilot decisions still held",
    evidence: "Provider choices, named pilot users, communications consent details, quiet hours, cost caps, AI receptionist scope, and release cohort remain deferred.",
    requiredBeforeRelease: "Product/operations/security owners must approve or explicitly exclude held decisions from pilot scope."
  },
  {
    id: "pilot-gate-held",
    area: "PILOT_GATE",
    state: "HELD",
    title: "Pilot go/no-go remains held",
    evidence: "UCRM-068 and UCRM-069 define pilot execution and go/no-go records, but actual participant outcomes and final owner decisions are pending.",
    requiredBeforeRelease: "Run the named pilot or keep release held."
  }
];

export async function getUnifiedCrmReleaseReadinessCleanup(
  actor: AuthenticatedUser | null,
  dependencies: Dependencies = {}
): Promise<UnifiedCrmReleaseReadinessCleanupReadModel> {
  if (!actor) throw new UnifiedCrmReleaseReadinessCleanupError("AUTHENTICATION_REQUIRED", "Sign in before opening CRM release-readiness cleanup.");
  if (resolveUnifiedCrmWorkspace(actor) !== "MANAGEMENT") {
    throw new UnifiedCrmReleaseReadinessCleanupError("RELEASE_READINESS_CLEANUP_NOT_AUTHORIZED", "CRM release-readiness cleanup is available to the manager workspace.");
  }
  const items = ITEMS.map((item) => ({ ...item }));
  return {
    contractVersion: UNIFIED_CRM_RELEASE_READINESS_CLEANUP_CONTRACT_VERSION,
    generatedAt: (dependencies.now?.() ?? new Date()).toISOString(),
    state: "HELD",
    visibility: "management",
    releaseAllowed: false,
    mergeReviewReady: false,
    items,
    summary: {
      passCount: items.filter((item) => item.state === "PASS").length,
      heldCount: items.filter((item) => item.state === "HELD").length,
      releaseBlockingCount: items.filter((item) => item.requiredBeforeRelease).length
    },
    rollback: {
      fallback: "existing-dispatch-customers-sales-consoles",
      featureControl: "crm.releaseReadiness.enabled",
      posture: "fail-closed"
    }
  };
}
