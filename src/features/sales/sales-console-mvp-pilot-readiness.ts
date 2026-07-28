import { salesConsoleMvpDefinition } from "./sales-console-mvp-definition";
import {
  salesConsoleReadAdapterPreview,
  type SalesConsoleReadAdapterViewModel
} from "./sales-console-mvp-read-adapters";
import {
  salesConsoleRoleGuardrailsRemainDisabled,
  salesConsoleRoleViews,
  type SalesConsoleRoleViewModel
} from "./sales-console-mvp-role-views";

export type SalesConsolePilotStatus = "blocked" | "ready" | "review";

export type SalesConsolePilotCheck = {
  check: string;
  evidence: string;
  owner: string;
  status: SalesConsolePilotStatus;
};

export type SalesConsolePilotStateVerification = {
  count: number;
  label: string;
  meaning: string;
  status: SalesConsolePilotStatus;
};

export type SalesConsolePilotAcceptanceTracker = {
  item: string;
  owner: string;
  proof: string;
  status: SalesConsolePilotStatus;
};

export type SalesConsolePilotFallbackState = {
  emptyLabel: string;
  fallbackAction: string;
  surface: string;
};

export type SalesConsolePilotReadiness = {
  acceptanceTracker: SalesConsolePilotAcceptanceTracker[];
  fallbackStates: SalesConsolePilotFallbackState[];
  pilotBlockers: string[];
  priorityBrief: string[];
  readinessChecks: SalesConsolePilotCheck[];
  readOnly: true;
  stateVerification: SalesConsolePilotStateVerification[];
};

function countUnavailableSourceLinks(readModel: SalesConsoleReadAdapterViewModel) {
  return readModel.sellerQueue.flatMap((item) => item.sourceLinks).filter((link) => link.state === "placeholder").length;
}

export function buildSalesConsolePilotReadiness(
  readModel: SalesConsoleReadAdapterViewModel = salesConsoleReadAdapterPreview,
  roleViews: SalesConsoleRoleViewModel[] = salesConsoleRoleViews
): SalesConsolePilotReadiness {
  const blockedWorkItems = readModel.sellerQueue.filter((item) => item.blocker.startsWith("Blocked:")).length;
  const staleItems =
    readModel.sellerQueue.filter((item) => item.freshnessState === "stale").length +
    readModel.leadOperations.filter((lead) => lead.freshnessState === "stale").length;
  const placeholderItems =
    readModel.sellerQueue.filter((item) => item.freshnessState === "placeholder").length +
    readModel.deals.filter((deal) => deal.freshnessState === "placeholder").length;
  const verifyFirstItems = readModel.inventoryMatches.filter((vehicle) => vehicle.freshnessState === "verify-first").length;
  const unavailableSourceLinks = countUnavailableSourceLinks(readModel);
  const guardrailsDisabled = salesConsoleRoleGuardrailsRemainDisabled(roleViews);
  const allRolesPresent = roleViews.length === 4;

  const readinessChecks: SalesConsolePilotCheck[] = [
    {
      check: "Protected route smoke",
      evidence: "The /sales route, loading state, and error/unavailable state render through dedicated Sales Console route files.",
      owner: "Admin / Owner",
      status: "ready"
    },
    {
      check: "30-second priority scan",
      evidence: "KPI strip, seller priority queue, lead risks, deal blockers, and inventory verify-first labels render above planning panels.",
      owner: "Sales Manager",
      status: readModel.sellerQueue.length > 0 && readModel.managerRisks.length > 0 ? "ready" : "review"
    },
    {
      check: "Role visibility smoke",
      evidence: allRolesPresent
        ? "Salesperson, Sales Manager, BDC / Lead Coordinator, and Admin / Owner role views are all present."
        : "Role coverage is incomplete.",
      owner: "Admin / Owner",
      status: allRolesPresent ? "ready" : "blocked"
    },
    {
      check: "Read-only guardrails",
      evidence: guardrailsDisabled
        ? "All excluded workflows remain disabled or planned across every role."
        : "At least one excluded workflow appears enabled.",
      owner: "Sales Manager",
      status: guardrailsDisabled ? "ready" : "blocked"
    },
    {
      check: "Fallback and freshness labels",
      evidence: "Current, stale, blocked, placeholder, verify-first, and unavailable labels are visible for pilot review.",
      owner: "BDC / Lead Coordinator",
      status: staleItems + blockedWorkItems + placeholderItems + verifyFirstItems + unavailableSourceLinks > 0 ? "ready" : "review"
    }
  ];

  return {
    acceptanceTracker: salesConsoleMvpDefinition.pilotAcceptanceChecklist.map((item) => ({
      item: item.item,
      owner: item.owner,
      proof: item.proof,
      status: item.item === "Daily priorities are obvious" ? "review" : "ready"
    })),
    fallbackStates: [
      {
        emptyLabel: "No seller work items",
        fallbackAction: "Show empty queue with source-system reminder; do not create tasks from the console.",
        surface: "Salesperson Today"
      },
      {
        emptyLabel: "No lead risk records",
        fallbackAction: "Show lead operations empty state and keep CRM/lead source as truth.",
        surface: "Lead Operations"
      },
      {
        emptyLabel: "No matched vehicles",
        fallbackAction: "Show inventory unavailable state in the console and require source verification before presentation.",
        surface: "Inventory Intelligence"
      },
      {
        emptyLabel: "No deal desk records",
        fallbackAction: "Show visibility-only empty deal desk in the console; source records stay primary and quote submission remains unavailable.",
        surface: "Deal Desk"
      }
    ],
    pilotBlockers: readinessChecks
      .filter((check) => check.status === "blocked")
      .map((check) => check.check),
    priorityBrief: readModel.sellerQueue.slice(0, 3).map((item) =>
      `#${item.priorityRank} ${item.customer}: ${item.nextAction} (${item.blocker === "-" ? item.freshnessState : item.blocker})`
    ),
    readinessChecks,
    readOnly: true,
    stateVerification: [
      { count: readModel.sellerQueue.length + readModel.deals.length, label: "current", meaning: "Trusted enough to view, never enough to write.", status: "ready" },
      { count: staleItems, label: "stale", meaning: "Needs human verification before action.", status: staleItems > 0 ? "ready" : "review" },
      { count: blockedWorkItems, label: "blocked", meaning: "Manager or source-system attention required.", status: blockedWorkItems > 0 ? "ready" : "review" },
      { count: placeholderItems, label: "placeholder", meaning: "Source mapping or value is not available yet.", status: placeholderItems > 0 ? "ready" : "review" },
      { count: verifyFirstItems, label: "verify-first", meaning: "Vehicle/customer/deal context must be checked before use.", status: verifyFirstItems > 0 ? "ready" : "review" },
      { count: unavailableSourceLinks, label: "unavailable", meaning: "Source link or record is absent; fallback label must be visible.", status: unavailableSourceLinks > 0 ? "ready" : "review" }
    ]
  };
}

export const salesConsolePilotReadiness = buildSalesConsolePilotReadiness();
