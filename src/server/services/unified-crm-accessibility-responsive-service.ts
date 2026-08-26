import type { AuthenticatedUser } from "@/server/auth/store";
import { resolveUnifiedCrmWorkspace } from "@/server/policies/unified-crm-access";
import {
  UNIFIED_CRM_ACCESSIBILITY_RESPONSIVE_CONTRACT_VERSION,
  UnifiedCrmAccessibilityResponsiveError,
  type UnifiedCrmAccessibilityResponsiveCheck,
  type UnifiedCrmAccessibilityResponsiveReadModel
} from "@/server/unified-crm/accessibility-responsive-contract";

type Dependencies = {
  now?: () => Date;
};

const CHECKS: UnifiedCrmAccessibilityResponsiveCheck[] = [
  {
    category: "keyboard",
    evidence: "CRM shell search interaction includes Escape, ArrowUp, ArrowDown, and Enter keyboard handling in focused tests.",
    holdOwner: null,
    status: "PASS"
  },
  {
    category: "focusBehavior",
    evidence: "CRM search opens as a combobox/listbox interaction with explicit active option handling in the shell.",
    holdOwner: null,
    status: "PASS"
  },
  {
    category: "errorBehavior",
    evidence: "CRM routes return typed safe error envelopes and shell tests cover unavailable/empty states.",
    holdOwner: null,
    status: "PASS"
  },
  {
    category: "screenReader",
    evidence: "Screen-reader traversal needs an authenticated release-candidate pass with actual rendered CRM pages.",
    holdOwner: "ux-review",
    status: "HOLD"
  },
  {
    category: "contrast",
    evidence: "Contrast proof needs automated and visual review over current CRM shell/dashboard colors.",
    holdOwner: "ux-review",
    status: "HOLD"
  },
  {
    category: "zoom",
    evidence: "200% zoom and reflow proof remains pending for the release candidate.",
    holdOwner: "ux-review",
    status: "HOLD"
  },
  {
    category: "desktop",
    evidence: "Desktop authenticated browser proof remains pending for CRM work, search, dashboard, and manager gates.",
    holdOwner: "ux-review",
    status: "HOLD"
  },
  {
    category: "mobile",
    evidence: "Mobile responsive proof remains pending for CRM work, search, dashboard, and manager gates.",
    holdOwner: "ux-review",
    status: "HOLD"
  },
  {
    category: "lightDark",
    evidence: "Light/dark theme proof remains pending for the CRM release candidate.",
    holdOwner: "ux-review",
    status: "HOLD"
  }
];

export async function getUnifiedCrmAccessibilityResponsiveGate(
  actor: AuthenticatedUser | null,
  dependencies: Dependencies = {}
): Promise<UnifiedCrmAccessibilityResponsiveReadModel> {
  if (!actor) {
    throw new UnifiedCrmAccessibilityResponsiveError("AUTHENTICATION_REQUIRED", "Sign in before opening CRM accessibility and responsive verification.");
  }
  if (resolveUnifiedCrmWorkspace(actor) !== "MANAGEMENT") {
    throw new UnifiedCrmAccessibilityResponsiveError(
      "ACCESSIBILITY_GATE_NOT_AUTHORIZED",
      "CRM accessibility and responsive verification is available to the manager workspace."
    );
  }
  const checks = CHECKS.map((check) => ({ ...check }));
  return {
    checks,
    contractVersion: UNIFIED_CRM_ACCESSIBILITY_RESPONSIVE_CONTRACT_VERSION,
    generatedAt: (dependencies.now?.() ?? new Date()).toISOString(),
    state: checks.some((check) => check.status === "HOLD") ? "HELD" : "PASS",
    target: "WCAG_2_2_AA",
    visibility: "management"
  };
}
