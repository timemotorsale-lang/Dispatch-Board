import type { AuthenticatedUser } from "@/server/auth/store";
import { resolveUnifiedCrmWorkspace } from "@/server/policies/unified-crm-access";
import {
  UNIFIED_CRM_OPERATIONAL_HANDOFF_CONTRACT_VERSION,
  UnifiedCrmOperationalHandoffError,
  type UnifiedCrmOperationalHandoffOwner,
  type UnifiedCrmOperationalHandoffReadModel
} from "@/server/unified-crm/operational-handoff-contract";

type Dependencies = {
  now?: () => Date;
};

const owners: UnifiedCrmOperationalHandoffOwner[] = [
  {
    area: "monitoring",
    owner: "observability",
    status: "PENDING_OWNER_CONFIRMATION",
    requiredConfirmation: "Confirm dashboards, alert routing, freshness, latency, and error monitoring."
  },
  {
    area: "support",
    owner: "operations",
    status: "PENDING_OWNER_CONFIRMATION",
    requiredConfirmation: "Confirm support intake, triage owner, escalation path, and known-limit messaging."
  },
  {
    area: "permissions",
    owner: "security-review",
    status: "PENDING_OWNER_CONFIRMATION",
    requiredConfirmation: "Confirm manager/staff access, restricted records, masking, and audit expectations."
  },
  {
    area: "flag_changes",
    owner: "product",
    status: "PENDING_OWNER_CONFIRMATION",
    requiredConfirmation: "Confirm exact enabled cohorts, capabilities, flag owner, and change window."
  },
  {
    area: "incident_response",
    owner: "operations",
    status: "PENDING_OWNER_CONFIRMATION",
    requiredConfirmation: "Confirm incident commander, severity rules, communications, and stop-the-line trigger."
  },
  {
    area: "data_recovery",
    owner: "engineering",
    status: "PENDING_OWNER_CONFIRMATION",
    requiredConfirmation: "Confirm backups, restore procedure, reconciliation, and customer record recovery path."
  },
  {
    area: "training",
    owner: "operations",
    status: "PENDING_OWNER_CONFIRMATION",
    requiredConfirmation: "Confirm staff training, job aids, feedback intake, and coverage for pilot users."
  },
  {
    area: "rollback_authority",
    owner: "general-manager",
    status: "PENDING_OWNER_CONFIRMATION",
    requiredConfirmation: "Confirm who can disable CRM scope and the exact conditions that trigger rollback."
  }
];

const requiredBeforeReleaseDecision = [
  "Every operational handoff owner must confirm their area.",
  "UCRM-071 release-candidate validation must be validated on the exact candidate.",
  "Rollback authority must be named before any internal release decision."
];

export async function getUnifiedCrmOperationalHandoff(
  actor: AuthenticatedUser | null,
  dependencies: Dependencies = {}
): Promise<UnifiedCrmOperationalHandoffReadModel> {
  if (!actor) {
    throw new UnifiedCrmOperationalHandoffError(
      "AUTHENTICATION_REQUIRED",
      "Sign in before opening CRM operational handoff."
    );
  }
  if (resolveUnifiedCrmWorkspace(actor) !== "MANAGEMENT") {
    throw new UnifiedCrmOperationalHandoffError(
      "OPERATIONAL_HANDOFF_NOT_AUTHORIZED",
      "CRM operational handoff is available to the manager workspace."
    );
  }
  const rows = owners.map((owner) => ({ ...owner }));
  const confirmed = rows.every((owner) => owner.status === "CONFIRMED");
  return {
    contractVersion: UNIFIED_CRM_OPERATIONAL_HANDOFF_CONTRACT_VERSION,
    generatedAt: (dependencies.now?.() ?? new Date()).toISOString(),
    handoffDecision: confirmed ? "READY_FOR_INTERNAL_RELEASE_DECISION" : "HELD",
    owners: rows,
    requiredBeforeReleaseDecision: [...requiredBeforeReleaseDecision],
    visibility: "management"
  };
}
