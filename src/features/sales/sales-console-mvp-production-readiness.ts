import { salesConsoleMvpDefinition } from "./sales-console-mvp-definition";
import { salesConsolePilotReadiness } from "./sales-console-mvp-pilot-readiness";
import { salesConsoleReadAdapterPreview, type SalesConsoleReadAdapterViewModel } from "./sales-console-mvp-read-adapters";
import { salesConsoleRoleGuardrailsRemainDisabled, salesConsoleRoleViews } from "./sales-console-mvp-role-views";

export type SalesConsoleProductionStatus = "blocked" | "ready" | "review";

export type SalesConsoleProductionReadinessCheck = {
  check: string;
  evidence: string;
  owner: string;
  status: SalesConsoleProductionStatus;
};

export type SalesConsoleProductionBoundary = {
  audience: "admin-review" | "operations";
  reason: string;
  surface: string;
};

export type SalesConsoleProductionEmptyState = {
  surface: string;
  userMessage: string;
  verification: string;
};

export type SalesConsoleProductionReadiness = {
  adminReviewSurfaces: SalesConsoleProductionBoundary[];
  emptyStates: SalesConsoleProductionEmptyState[];
  knownLimitations: string[];
  operationalSurfaces: SalesConsoleProductionBoundary[];
  productionChecks: SalesConsoleProductionReadinessCheck[];
  readOnly: true;
};

export function buildSalesConsoleProductionReadiness(
  readModel: SalesConsoleReadAdapterViewModel = salesConsoleReadAdapterPreview
): SalesConsoleProductionReadiness {
  const guardrailsDisabled = salesConsoleRoleGuardrailsRemainDisabled(salesConsoleRoleViews);
  const sourceLinks = readModel.sellerQueue.flatMap((item) => item.sourceLinks);
  const allSourceLinksLabeled = sourceLinks.every((link) => link.unavailableLabel.length > 0 && link.state);
  const allPilotStatesLabeled = salesConsolePilotReadiness.stateVerification.every((state) => state.label && state.meaning);
  const hasOperationalPriorities = readModel.sellerQueue.length > 0 && readModel.managerRisks.length > 0;

  return {
    adminReviewSurfaces: [
      {
        audience: "admin-review",
        reason: "Used to audit source ownership, freshness policy, and future release gates.",
        surface: "Live Data Contract"
      },
      {
        audience: "admin-review",
        reason: "Used to confirm safe real-data mapping and fallback behavior before expanding integrations.",
        surface: "Real Data Wiring"
      },
      {
        audience: "admin-review",
        reason: "Used for scope control; not part of the daily salesperson workflow.",
        surface: "MVP Planning Panels"
      },
      {
        audience: "admin-review",
        reason: "Used to verify acceptance criteria before production expansion.",
        surface: "Pilot Acceptance Tracking"
      }
    ],
    emptyStates: [
      {
        surface: "Salesperson Today",
        userMessage: "No priority work is available right now.",
        verification: "Check CRM/tasks before assuming the day is clear."
      },
      {
        surface: "Lead Operations",
        userMessage: "No lead risks are currently visible.",
        verification: "Confirm lead source sync and freshness before closing the console."
      },
      {
        surface: "Deal Desk",
        userMessage: "No visibility-only deals are available.",
        verification: "Quotes and deal changes remain in the source system."
      },
      {
        surface: "Inventory Intelligence",
        userMessage: "No vehicle matches are available.",
        verification: "Verify inventory source status before presenting alternatives."
      }
    ],
    knownLimitations: [
      "Read-only production MVP: no customer messaging, quote submission, holds, finance decisions, or discount approvals.",
      "Auth-to-role ownership must still be connected before enforcing real salesperson ownership filtering.",
      "Some source mappings can still fall back to labeled placeholder data when live records are unavailable.",
      "CRM, DMS, lead, inventory, finance, task, and appointment systems remain the source of truth."
    ],
    operationalSurfaces: [
      {
        audience: "operations",
        reason: "Primary daily queue for what needs attention now.",
        surface: "Salesperson Today"
      },
      {
        audience: "operations",
        reason: "Lead leakage and SLA visibility without changing lead source records.",
        surface: "Lead Operations"
      },
      {
        audience: "operations",
        reason: "Visibility-only deal context with disabled future write actions.",
        surface: "Deal Desk"
      },
      {
        audience: "operations",
        reason: "Verify-first vehicle matching before customer presentation.",
        surface: "Inventory Intelligence"
      },
      {
        audience: "operations",
        reason: "Manager daily risk and priority command view.",
        surface: "Manager Command Center"
      }
    ],
    productionChecks: [
      {
        check: "Clean operational language",
        evidence: "Primary route labels use Sales Console and production MVP wording; prototype/planning content is separated into admin review panels.",
        owner: "Admin / Owner",
        status: "ready"
      },
      {
        check: "Read-only production guardrails",
        evidence: guardrailsDisabled
          ? "Every excluded workflow remains disabled or planned across role views."
          : "An excluded workflow appears enabled.",
        owner: "Sales Manager",
        status: guardrailsDisabled ? "ready" : "blocked"
      },
      {
        check: "Honest source data labels",
        evidence: allSourceLinksLabeled && allPilotStatesLabeled
          ? "Freshness, fallback, unavailable, stale, blocked, placeholder, and verify-first labels are present."
          : "A source or state label is missing.",
        owner: "Admin / Owner",
        status: allSourceLinksLabeled && allPilotStatesLabeled ? "ready" : "blocked"
      },
      {
        check: "Operational priority clarity",
        evidence: hasOperationalPriorities
          ? "KPI strip, seller queue, risk queue, deal desk, and inventory intelligence provide above-the-fold priority context."
          : "Operational priority data is missing.",
        owner: "Sales Manager",
        status: hasOperationalPriorities ? "ready" : "review"
      },
      {
        check: "Source-system boundary",
        evidence: salesConsoleMvpDefinition.recommendedMvpBoundary.nonNegotiables.join("; "),
        owner: "Admin / Owner",
        status: "ready"
      }
    ],
    readOnly: true
  };
}

export const salesConsoleProductionReadiness = buildSalesConsoleProductionReadiness();
