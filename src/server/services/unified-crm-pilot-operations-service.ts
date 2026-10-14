import type { AuthenticatedUser } from "@/server/auth/store";
import { resolveUnifiedCrmWorkspace } from "@/server/policies/unified-crm-access";
import {
  UNIFIED_CRM_PILOT_OPERATIONS_CONTRACT_VERSION,
  UnifiedCrmPilotOperationsError,
  type UnifiedCrmPilotOperationsPackage
} from "@/server/unified-crm/pilot-operations-contract";

type Dependencies = {
  now?: () => Date;
};

const sections: UnifiedCrmPilotOperationsPackage["sections"] = [
  {
    title: "cohort",
    owner: "operations",
    items: ["Pilot cohort is internal-only until UCRM-069 approval.", "Management and sales users must be named before enablement.", "No external customer communications are enabled by this package."]
  },
  {
    title: "featureFlags",
    owner: "engineering",
    items: ["Unified CRM remains controlled by existing CRM review/enablement flags.", "Held verification gates block broad release.", "Disable CRM routes by reverting the release candidate or disabling CRM feature flags."]
  },
  {
    title: "training",
    owner: "operations",
    items: ["Quick-start training covers CRM home, global search, opportunity stages, saved views, and manager gates.", "Staff must understand CRM does not replace source-domain truth.", "Managers review holds before pilot execution."]
  },
  {
    title: "support",
    owner: "support",
    items: ["Support owner triages CRM defects during pilot.", "Escalate data correctness issues before user workflow questions.", "Every issue should cite customer/opportunity IDs, timestamp, and expected behavior."]
  },
  {
    title: "knownLimits",
    owner: "product",
    items: ["Browser proof and broad regression remain held in UCRM-065.", "External provider integrations remain deferred.", "Advanced forecasting/backtesting remains UCRM-105."]
  },
  {
    title: "monitoring",
    owner: "engineering",
    items: ["Monitor CRM route errors, latency, and dashboard freshness.", "Review dashboard reconciliation gate before pilot sessions.", "Attach release-candidate observability evidence before go/no-go."]
  },
  {
    title: "incidentEscalation",
    owner: "operations",
    items: ["Pause pilot on suspected data leak, incorrect mutation, or irreversible workflow issue.", "Escalate security issues to security-review owner.", "Record incident timeline and recovery action before resuming."]
  },
  {
    title: "privacy",
    owner: "security-review",
    items: ["CRM read models should expose only needed operational fields.", "Do not export pilot CRM data without approved export controls.", "Retain source-system authority for customer/contact truth."]
  },
  {
    title: "backup",
    owner: "engineering",
    items: ["Run database backup before live pilot data load.", "Record backup checksum and restore estimate.", "Dry-run rehearsal must pass before live load."]
  },
  {
    title: "rollback",
    owner: "engineering",
    items: ["Rollback authority remains administrator-assisted.", "Keep Customers/Sales/source workflows available as fallback.", "Use UCRM-067 rollback rehearsal before UCRM-069 go/no-go."]
  }
];

export async function getUnifiedCrmPilotOperationsPackage(
  actor: AuthenticatedUser | null,
  dependencies: Dependencies = {}
): Promise<UnifiedCrmPilotOperationsPackage> {
  if (!actor) {
    throw new UnifiedCrmPilotOperationsError("AUTHENTICATION_REQUIRED", "Sign in before opening CRM pilot operations.");
  }
  if (resolveUnifiedCrmWorkspace(actor) !== "MANAGEMENT") {
    throw new UnifiedCrmPilotOperationsError(
      "PILOT_OPERATIONS_NOT_AUTHORIZED",
      "CRM pilot operations are available to the manager workspace."
    );
  }
  return {
    contractVersion: UNIFIED_CRM_PILOT_OPERATIONS_CONTRACT_VERSION,
    generatedAt: (dependencies.now?.() ?? new Date()).toISOString(),
    packageStatus: "READY_FOR_REVIEW",
    sections: sections.map((section) => ({ ...section, items: [...section.items] })),
    visibility: "management"
  };
}
