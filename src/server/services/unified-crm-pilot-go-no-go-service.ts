import type { AuthenticatedUser } from "@/server/auth/store";
import { resolveUnifiedCrmWorkspace } from "@/server/policies/unified-crm-access";
import {
  UNIFIED_CRM_PILOT_GO_NO_GO_CONTRACT_VERSION,
  UnifiedCrmPilotGoNoGoError,
  type UnifiedCrmPilotDecisionArea,
  type UnifiedCrmPilotGoNoGoReadModel
} from "@/server/unified-crm/pilot-go-no-go-contract";

type Dependencies = {
  now?: () => Date;
};

const decisionAreas: UnifiedCrmPilotDecisionArea[] = [
  {
    area: "product",
    owner: "product",
    decision: "HELD",
    blockers: ["Actual pilot outcomes and friction themes from UCRM-068 are not recorded yet."]
  },
  {
    area: "operations",
    owner: "operations",
    decision: "HELD",
    blockers: ["Pilot cohort signoff and measured rollback rehearsal from UCRM-066/UCRM-067 remain pending."]
  },
  {
    area: "security",
    owner: "security-review",
    decision: "HELD",
    blockers: ["UCRM-061 named holds remain for CSRF/session, export, logs/secrets, dependency scan, and abuse/rate-limit evidence."]
  },
  {
    area: "engineering",
    owner: "engineering",
    decision: "HELD",
    blockers: ["UCRM-065 full automated regression remains held by full typecheck/build/browser/Dispatch regression proof."]
  }
];

const requiredBeforeApproval = [
  "Resolve or explicitly reduce scope for all UCRM-061 security holds.",
  "Resolve UCRM-065 full regression holds on one release-candidate commit.",
  "Complete UCRM-067 rollback rehearsal with measured restore timing.",
  "Record UCRM-068 pilot participant outcomes, defects, friction, measures, and decisions.",
  "Record exact enabled flags and rollback trigger before approving pilot expansion."
];

export async function getUnifiedCrmPilotGoNoGo(
  actor: AuthenticatedUser | null,
  dependencies: Dependencies = {}
): Promise<UnifiedCrmPilotGoNoGoReadModel> {
  if (!actor) {
    throw new UnifiedCrmPilotGoNoGoError("AUTHENTICATION_REQUIRED", "Sign in before opening CRM pilot go/no-go.");
  }
  if (resolveUnifiedCrmWorkspace(actor) !== "MANAGEMENT") {
    throw new UnifiedCrmPilotGoNoGoError(
      "PILOT_GO_NO_GO_NOT_AUTHORIZED",
      "CRM pilot go/no-go is available to the manager workspace."
    );
  }
  const areas = decisionAreas.map((area) => ({ ...area, blockers: [...area.blockers] }));
  return {
    contractVersion: UNIFIED_CRM_PILOT_GO_NO_GO_CONTRACT_VERSION,
    decision: areas.every((area) => area.decision === "APPROVED") ? "APPROVED" : "HELD",
    decisionAreas: areas,
    enabledScope: [],
    generatedAt: (dependencies.now?.() ?? new Date()).toISOString(),
    requiredBeforeApproval: [...requiredBeforeApproval],
    visibility: "management"
  };
}
